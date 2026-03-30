const bcrypt = require('bcryptjs');
const User = require('./user.model');
const Student = require('../students/student.model');
const Teacher = require('../teachers/teacher.model');
const Worker = require('../workers/worker.model');
const Fee = require('../fees/fee.model');
const { ROLES } = require('../../utils/constants');
const { encryptPassword, decryptPassword } = require('../../utils/passwordVault');
const { normalizePagination, buildPaginationMeta } = require('../../utils/pagination');
const {
  createUserSchema,
  listUserSchema,
  passwordUpdateSchema,
  resetUserPasswordSchema,
  autoResetUserPasswordSchema
} = require('./user.validation');

function shapeStudentDetails(raw = {}) {
  const previousEducations = Array.isArray(raw.previousEducationRows || raw.previousEducations)
    ? (raw.previousEducationRows || raw.previousEducations)
        .map((item = {}) => ({
          previousSchool: item.previousSchool || '',
          board: item.board || '',
          medium: item.medium || '',
          passingYear: item.passingYear || '',
          percentage: item.percentage || ''
        }))
        .filter((item) => Object.values(item).some(Boolean))
    : [];
  const admissionPurposes = Array.isArray(raw.admissionPurposes)
    ? raw.admissionPurposes.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const personal = {
    middleName: raw.middleName,
    lastName: raw.lastName,
    aadhaarNo: raw.aadhaarNo,
    bloodGroup: raw.bloodGroup,
    gender: raw.gender
  };
  const education = {
    admissionType: raw.admissionType,
    batchYear: raw.batchYear,
    batchMonth: raw.batchMonth,
    previousSchool: raw.previousSchool,
    currentClass: raw.currentClass,
    division: raw.division,
    branch: raw.branch,
    board: raw.board,
    medium: raw.medium,
    passingYear: raw.passingYear,
    percentage: raw.percentage,
    previousEducations,
    admissionPurposes,
    assignedSubjects: Array.isArray(raw.assignedSubjects)
      ? raw.assignedSubjects
          .map((item = {}) => ({
            subjectId: item.subjectId || '',
            name: item.name || '',
            code: item.code || ''
          }))
          .filter((item) => item.subjectId || item.name || item.code)
      : [],
    academicHistory: {
      tenth: {
        schoolName: raw.tenthSchoolName,
        board: raw.tenthBoard,
        passingYear: raw.tenthPassingYear,
        percentage: raw.tenthPercentage,
        marks: raw.tenthMarks
      },
      eleventh: {
        schoolName: raw.eleventhSchoolName,
        board: raw.eleventhBoard,
        passingYear: raw.eleventhPassingYear,
        percentage: raw.eleventhPercentage,
        marks: raw.eleventhMarks
      },
      twelfth: {
        schoolName: raw.twelfthSchoolName,
        board: raw.twelfthBoard,
        passingYear: raw.twelfthPassingYear,
        percentage: raw.twelfthPercentage,
        marks: raw.twelfthMarks
      }
    }
  };
  const physical = {
    height: raw.height,
    weight: raw.weight,
    vision: raw.vision,
    disability: raw.disability,
    allergy: raw.allergy
  };
  const parent = {
    fatherName: raw.fatherName,
    fatherJob: raw.fatherJob,
    fatherMobile: raw.fatherMobile,
    motherName: raw.motherName,
    motherJob: raw.motherJob,
    motherMobile: raw.motherMobile,
    guardianName: raw.guardianName,
    guardianRelation: raw.guardianRelation,
    guardianMobile: raw.guardianMobile
  };
  const address = {
    addressLine1: raw.addressLine1,
    addressLine2: raw.addressLine2,
    city: raw.city,
    district: raw.district,
    state: raw.state,
    pinCode: raw.pinCode
  };
  return { personal, education, physical, parent, address };
}

function generatePassword() {
  return Math.random().toString(36).slice(-10);
}

function generateNumericPassword(length = 6) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += String(Math.floor(Math.random() * 10));
  }
  return out;
}

function getDefaultPasswordForRole(role) {
  if (role === ROLES.ADMIN) {
    return process.env.DEFAULT_ADMIN_PASSWORD || '123456';
  }
  if (role === ROLES.TEACHER) {
    return process.env.DEFAULT_TEACHER_PASSWORD || '123456';
  }
  if (role === ROLES.STUDENT) {
    return process.env.DEFAULT_STUDENT_PASSWORD || '123456';
  }
  return '';
}

async function ensureUniqueStudentEmail(seed = '') {
  const normalizedSeed = String(seed || 'student').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  let candidate = `${normalizedSeed || 'student'}@baliraja.local`;
  let suffix = 1;
  while (await User.findOne({ email: candidate })) {
    candidate = `${normalizedSeed || 'student'}${suffix}@baliraja.local`;
    suffix += 1;
  }
  return candidate;
}

function calculateAgeFromDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) return undefined;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthGap = today.getMonth() - dob.getMonth();
  if (monthGap < 0 || (monthGap === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

async function generateEnrollmentNo(fullName = 'Student') {
  const namePart = fullName.replace(/\s+/g, '').slice(0, 5).toUpperCase() || 'STU';
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  let candidate = `NO${namePart}${datePart}`;
  let suffix = 1;
  while (await Student.findOne({ enrollmentNo: candidate })) {
    candidate = `NO${namePart}${datePart}${String(suffix).padStart(2, '0')}`;
    suffix += 1;
  }
  return candidate;
}

function roleGuard(requestorRole, targetRole) {
  if (targetRole === ROLES.ADMIN) {
    return requestorRole === ROLES.SUPER_ADMIN;
  }

  if ([ROLES.TEACHER, ROLES.STUDENT, ROLES.WORKER].includes(targetRole)) {
    return [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(requestorRole);
  }

  // default: super admin only
  return requestorRole === ROLES.SUPER_ADMIN;
}

function canManageUser(requestor, targetUser) {
  if (!requestor || !targetUser) return false;
  if (requestor.role === ROLES.SUPER_ADMIN) return true;
  if (requestor.role === ROLES.ADMIN) {
    return [ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT, ROLES.WORKER].includes(targetUser.role);
  }
  return requestor.sub === targetUser._id?.toString();
}

function serializeUser(userDoc) {
  const user = userDoc.toObject ? userDoc.toObject() : userDoc;
  const {
    passwordHash,
    passwordCipher,
    mobileAppSessionKey,
    ...rest
  } = user;
  return {
    ...rest,
    passwordVisible: passwordCipher ? decryptPassword(passwordCipher) : ''
  };
}

async function createUser(req, res, next) {
  try {
    const payload = createUserSchema.parse(req.body);
    const normalizedEmail = payload.email?.toLowerCase()?.trim();
    const normalizedPhone = payload.phone?.trim();

    if (payload.role !== ROLES.STUDENT && !normalizedEmail) {
      return res.status(400).json({ message: 'email is required for this role' });
    }

    if (!roleGuard(req.user.role, payload.role)) {
      return res.status(403).json({ message: 'Forbidden: cannot create this role' });
    }

    const enrollmentNo = payload.role === ROLES.STUDENT
      ? (payload.enrollmentNo || (await generateEnrollmentNo(payload.fullName)))
      : undefined;
    if (payload.role === ROLES.STUDENT && !payload.phone) {
      return res.status(400).json({ message: 'phone is required for student' });
    }

    const finalEmail = normalizedEmail || await ensureUniqueStudentEmail(normalizedPhone || payload.fullName || Date.now());

    const duplicateChecks = [];
    if (finalEmail) duplicateChecks.push({ email: finalEmail });
    if (normalizedPhone) duplicateChecks.push({ phone: normalizedPhone });
    const exists = duplicateChecks.length ? await User.findOne({ $or: duplicateChecks }) : null;
    if (exists) {
      return res.status(409).json({ message: 'Email or phone already in use' });
    }

    const enrollExists = payload.role === ROLES.STUDENT ? await Student.findOne({ enrollmentNo }) : null;
    if (enrollExists) {
      return res.status(409).json({ message: 'Enrollment number already exists' });
    }

    const plainPassword = payload.password || getDefaultPasswordForRole(payload.role) || generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await User.create({
      fullName: payload.fullName,
      email: finalEmail,
      phone: normalizedPhone,
      role: payload.role,
      passwordHash,
      passwordCipher: encryptPassword(plainPassword),
      mustChangePassword: payload.role === ROLES.TEACHER,
      passwordChangedAt: payload.role === ROLES.TEACHER ? undefined : new Date()
    });

    // Attach role specific profile if provided
    if (payload.role === ROLES.STUDENT) {
      const age = calculateAgeFromDateOfBirth(payload.dateOfBirth);
      const student = await Student.create({
        userId: user._id,
        enrollmentNo,
        batchId: payload.batchId || null,
        status: payload.status || 'inactive',
        dateOfBirth: payload.dateOfBirth,
        age,
        gender: payload.gender,
        address: payload.address,
        emergencyContact: payload.emergencyContact,
        admissionDate: payload.admissionDate || payload.feeStartDate || payload.feeFrom || new Date(),
        details: shapeStudentDetails(payload.details || payload),
        createdBy: req.user?.sub,
        createdByEmail: req.user?.email
      });

      user.profileRef = student._id;
      user.roleRefModel = 'Student';
      await user.save();

      // Optional fee plan
      if (payload.feeAmount) {
        await Fee.create({
          studentId: student._id,
          courseId: payload.courseId,
          totalAmount: payload.feeAmount,
          paidAmount: 0,
          dueAmount: payload.feeAmount,
          dueDate: payload.feeDueDate || payload.feeTo,
          feeStartDate: payload.feeStartDate || payload.feeFrom,
          feeEndDate: payload.feeEndDate || payload.feeTo,
          paymentStatus: 'pending'
        });
      }
    }

    if (payload.role === ROLES.TEACHER) {
      const teacher = await Teacher.create({
        userId: user._id,
        specialization: payload.specialization || [],
        experienceYears: payload.experienceYears,
        contractStart: payload.contractStart,
        contractEnd: payload.contractEnd,
        totalContractAmount: payload.totalContractAmount || 0,
        monthlySalary: payload.monthlySalary || 0
      });

      user.profileRef = teacher._id;
      user.roleRefModel = 'Teacher';
      await user.save();
    }

    if (payload.role === ROLES.WORKER) {
      const worker = await Worker.create({
        userId: user._id,
        roleTitle: payload.roleTitle || 'worker',
        contractStart: payload.contractStart,
        contractEnd: payload.contractEnd,
        totalContractAmount: payload.totalContractAmount || 0
      });
      user.profileRef = worker._id;
      user.roleRefModel = 'Worker';
      await user.save();
    }

    res.status(201).json({
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role
      },
      tempPassword: payload.password ? undefined : plainPassword
    });
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const { role, page: rawPage, limit: rawLimit } = listUserSchema.parse(req.query);
    const { page, limit, skip } = normalizePagination({ page: rawPage, limit: rawLimit }, 10, 100);

    const filter = {};
    if (role) filter.role = role;

    // Admins cannot see super admins
    if (req.user.role === ROLES.ADMIN) {
      filter.role = role || { $in: [ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT, ROLES.ADMIN] };
    }

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
    ]);
    res.json({
      items: users.map(serializeUser),
      meta: buildPaginationMeta({ total, page, limit })
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

    if (!roleGuard(req.user.role, user.role)) {
      return res.status(403).json({ message: 'Forbidden: cannot delete this role' });
    }

  await User.findByIdAndDelete(userId);

  // Clean up linked profiles
  if (user.role === ROLES.STUDENT) {
    const st = await Student.findOne({ userId });
    if (st) {
      await Fee.deleteMany({ studentId: st._id });
    }
    await Student.deleteOne({ userId });
  } else if (user.role === ROLES.TEACHER) {
    await Teacher.deleteOne({ userId });
  }

    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.sub);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(serializeUser(user));
  } catch (error) {
    next(error);
  }
}

async function updateMyPassword(req, res, next) {
  try {
    const payload = passwordUpdateSchema.parse(req.body);
    const user = await User.findById(req.user.sub);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === ROLES.STUDENT) {
      return res.status(403).json({
        message: 'Students cannot change password from app. Please contact admin/super admin.'
      });
    }

    const valid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Current password incorrect' });

    user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
    user.passwordCipher = encryptPassword(payload.newPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({ message: 'Password updated successfully', user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { userId } = req.params;
    const payload = resetUserPasswordSchema.parse(req.body);
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ message: 'Forbidden: cannot update this password' });
    }

    user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
    user.passwordCipher = encryptPassword(payload.newPassword);
    user.mustChangePassword = user.role === ROLES.TEACHER;
    user.passwordChangedAt = user.role === ROLES.TEACHER ? undefined : new Date();
    if (user.role === ROLES.STUDENT) {
      user.mobileAppSessionActive = false;
      user.mobileAppSessionKey = '';
      user.mobileAppSessionStartedAt = undefined;
    }
    await user.save();

    res.json({
      message: 'Password updated successfully',
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
}

async function autoResetUserPassword(req, res, next) {
  try {
    const { userId } = req.params;
    const payload = autoResetUserPasswordSchema.parse(req.body || {});
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!canManageUser(req.user, user)) {
      return res.status(403).json({ message: 'Forbidden: cannot update this password' });
    }
    if (user.role !== ROLES.STUDENT) {
      return res.status(400).json({ message: 'Auto reset is only available for student users.' });
    }

    const nextPassword = generateNumericPassword(payload.length || 6);
    user.passwordHash = await bcrypt.hash(nextPassword, 10);
    user.passwordCipher = encryptPassword(nextPassword);
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    user.mobileAppSessionActive = false;
    user.mobileAppSessionKey = '';
    user.mobileAppSessionStartedAt = undefined;
    await user.save();

    return res.json({
      message: 'Student password reset successfully.',
      tempPassword: nextPassword,
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
}

async function publicUserByPhone(req, res, next) {
  try {
    const { phone } = req.params;
    const user = await User.findOne({ phone }).select('fullName email phone role');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
  createUser,
  listUsers,
  deleteUser,
  updateMyPassword,
  resetUserPassword,
  autoResetUserPassword,
  publicUserByPhone
};
