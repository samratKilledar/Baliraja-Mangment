const bcrypt = require('bcryptjs');
const User = require('./user.model');
const Student = require('../students/student.model');
const Teacher = require('../teachers/teacher.model');
const Worker = require('../workers/worker.model');
const Fee = require('../fees/fee.model');
const { ROLES } = require('../../utils/constants');
const {
  createUserSchema,
  listUserSchema,
  passwordUpdateSchema
} = require('./user.validation');

function shapeStudentDetails(raw = {}) {
  const personal = {
    middleName: raw.middleName,
    lastName: raw.lastName,
    aadhaarNo: raw.aadhaarNo,
    bloodGroup: raw.bloodGroup,
    gender: raw.gender
  };
  const education = {
    previousSchool: raw.previousSchool,
    currentClass: raw.currentClass,
    board: raw.board,
    medium: raw.medium,
    passingYear: raw.passingYear,
    percentage: raw.percentage
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

async function createUser(req, res, next) {
  try {
    const payload = createUserSchema.parse(req.body);

    if (!roleGuard(req.user.role, payload.role)) {
      return res.status(403).json({ message: 'Forbidden: cannot create this role' });
    }

    const enrollmentNo = payload.role === ROLES.STUDENT
      ? (payload.enrollmentNo || (await generateEnrollmentNo(payload.fullName)))
      : undefined;
    if (payload.role === ROLES.STUDENT && !payload.phone) {
      return res.status(400).json({ message: 'phone is required for student' });
    }

    const exists = await User.findOne({ $or: [{ email: payload.email }, { phone: payload.phone }] });
    if (exists) {
      return res.status(409).json({ message: 'Email or phone already in use' });
    }

    const enrollExists = payload.role === ROLES.STUDENT ? await Student.findOne({ enrollmentNo }) : null;
    if (enrollExists) {
      return res.status(409).json({ message: 'Enrollment number already exists' });
    }

    const plainPassword = payload.password || generatePassword();
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      role: payload.role,
      passwordHash
    });

    // Attach role specific profile if provided
    if (payload.role === ROLES.STUDENT) {
      const student = await Student.create({
        userId: user._id,
        enrollmentNo,
        batchId: payload.batchId || null,
        status: 'active',
        dateOfBirth: payload.dateOfBirth,
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
    const { role } = listUserSchema.parse(req.query);

    const filter = {};
    if (role) filter.role = role;

    // Admins cannot see super admins
    if (req.user.role === ROLES.ADMIN) {
      filter.role = role || { $in: [ROLES.TEACHER, ROLES.STUDENT, ROLES.PARENT, ROLES.ADMIN] };
    }

    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
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
    const user = await User.findById(req.user.sub).select('-passwordHash');

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
}

async function updateMyPassword(req, res, next) {
  try {
    const payload = passwordUpdateSchema.parse(req.body);
    const user = await User.findById(req.user.sub);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Current password incorrect' });

    user.passwordHash = await bcrypt.hash(payload.newPassword, 10);
    await user.save();

    res.json({ message: 'Password updated successfully' });
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
  publicUserByPhone
};
