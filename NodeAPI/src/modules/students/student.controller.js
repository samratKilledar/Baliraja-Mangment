const https = require('https');
const Student = require('./student.model');
const { sendPush } = require('../../utils/push.service');
const DeviceToken = require('../notifications/deviceToken.model');
const User = require('../users/user.model');
const Fee = require('../fees/fee.model');
const Attendance = require('../attendance/attendance.model');
const { decryptPassword } = require('../../utils/passwordVault');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { normalizePagination, buildPaginationMeta } = require('../../utils/pagination');

const PROJECT_FONT_CANDIDATES = [
  path.join(__dirname, '../../assets/fonts/ArialUnicode.ttf')
];

const DEVANAGARI_FONT_CANDIDATES = [
  ...PROJECT_FONT_CANDIDATES,
  '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
  '/System/Library/Fonts/Supplemental/NISC18030.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf'
];

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

function normalizeDivision(value) {
  return String(value || '').trim().toUpperCase();
}

function nextDivisionLabel(index) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let value = '';
  let current = index;
  do {
    value = alphabet[current % 26] + value;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);
  return value;
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

function serializeStudent(studentDoc) {
  const student = studentDoc?.toObject ? studentDoc.toObject() : { ...studentDoc };
  if (student?.userId?.passwordCipher) {
    student.userId.passwordVisible = decryptPassword(student.userId.passwordCipher);
    delete student.userId.passwordCipher;
    delete student.userId.passwordHash;
  }
  return student;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'IMS-Server/1.0 (contact@ims.local)' } }, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Upstream error ${res.statusCode}`));
          res.resume();
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

function formatAdmissionNo(fullName = 'STUDENT', admissionDate) {
  const first = (fullName.split(' ')[0] || 'STU').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const d = admissionDate ? new Date(admissionDate) : new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `${first}${yyyy}${mm}${dd}-${rand}`;
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN');
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN');
}

function formatCurrency(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function calculateFeeDays(from, to) {
  if (!from || !to) return '—';
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || toDate < fromDate) return '—';
  return String(Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
}

function resolveMarathiFont() {
  return DEVANAGARI_FONT_CANDIDATES.find((fontPath) => fs.existsSync(fontPath)) || null;
}

function pdfValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function initPdfFont(doc) {
  const fontPath = resolveMarathiFont();
  if (!fontPath) return null;

  try {
    doc.registerFont('pdf-body', fontPath);
    doc.font('pdf-body');
    return 'pdf-body';
  } catch (err) {
    console.warn(`Unable to load PDF font from ${fontPath}: ${err.message}`);
    return null;
  }
}

async function createStudent(req, res, next) {
  try {
    const fullName = req.body.fullName || 'Student';
    const admissionDate = req.body.admissionDate || req.body.feeFrom || req.body.feeStartDate;
    let enrollmentNo;
    // generate unique admission number
    do {
      const candidate = formatAdmissionNo(fullName, admissionDate);
      const exists = await Student.exists({ enrollmentNo: candidate });
      if (!exists) {
        enrollmentNo = candidate;
        break;
      }
    } while (true);

    const student = await Student.create({
      ...req.body,
      age: calculateAgeFromDateOfBirth(req.body.dateOfBirth),
      enrollmentNo,
      createdBy: req.user?.sub,
      createdByEmail: req.user?.email
    });
    // Push notify admins on new admission
    const adminTokens = await DeviceToken.find({ app: 'admin' }).select('token');
    const tokenList = adminTokens.map((t) => t.token);
    if (tokenList.length) {
      await sendPush(
        tokenList,
        'New Admission',
        `Student ${student.enrollmentNo || ''} added`,
        { type: 'admission', studentId: student._id.toString() }
      );
    }
    res.status(201).json(student);
  } catch (err) {
    next(err);
  }
}

async function listStudents(req, res, next) {
  try {
    const { q, batchId, status, currentClass, division } = req.query;
    const { page, limit, skip } = normalizePagination(req.query, 10, 100);
    const filter = {};

    if (batchId) filter.batchId = batchId;
    if (status) filter.status = status;
    if (currentClass) filter['details.education.currentClass'] = currentClass;
    if (division) filter['details.education.division'] = normalizeDivision(division);
    if (q) {
      filter.$or = [
        { enrollmentNo: { $regex: q, $options: 'i' } },
        { 'userId.phone': { $regex: q, $options: 'i' } }
      ];
    }

    let students = await Student.find(filter)
      .populate('userId', 'fullName email phone passwordCipher')
      .populate('createdBy', 'fullName email')
      .populate('currentCourseIds', 'name category')
      .populate('batchId', 'batchName')
      .sort({ createdAt: -1 });

    if (q) {
      const ql = q.toLowerCase();
      students = students.filter((s) => {
        const hay = [s.userId?.phone, s.userId?.email].filter(Boolean).join(' ').toLowerCase();
        return s.enrollmentNo?.toLowerCase().includes(ql) || hay.includes(ql);
      });
    }

    const total = students.length;
    const pagedStudents = students.slice(skip, skip + limit);
    const admissionTypeCounts = students.reduce((acc, student) => {
      const admissionType = student?.details?.education?.admissionType?.trim() || 'Other';
      acc[admissionType] = (acc[admissionType] || 0) + 1;
      return acc;
    }, {});

    res.json({
      items: pagedStudents.map(serializeStudent),
      meta: {
        ...buildPaginationMeta({ total, page, limit }),
        admissionTypeCounts
      }
    });
  } catch (err) {
    next(err);
  }
}

async function getStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId)
      .populate('userId', 'fullName email phone passwordCipher')
      .populate('createdBy', 'fullName email')
      .populate('batchId', 'batchName')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(serializeStudent(student));
  } catch (err) {
    next(err);
  }
}

async function reverseGeocode(req, res, next) {
  try {
    const { lat, lon } = req.query;
    if (!lat || !lon) return res.status(400).json({ message: 'lat and lon are required' });

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
    const result = await fetchJson(url);
    const addr = result.address || {};

    const normalized = {
      addressLine1: [addr.house_number, addr.road].filter(Boolean).join(' ').trim(),
      addressLine2: [addr.neighbourhood, addr.suburb, addr.residential].filter(Boolean).join(', '),
      city: addr.city || addr.town || addr.village || addr.hamlet || '',
      district: addr.county || addr.state_district || '',
      state: addr.state || '',
      pinCode: addr.postcode || '',
      displayName: result.display_name || ''
    };

    res.json({ address: normalized, lat: Number(lat), lon: Number(lon), raw: result });
  } catch (err) {
    next(err);
  }
}

async function getMyStudent(req, res, next) {
  try {
    const userId = req.user.sub;
    let student = await Student.findOne({ userId })
      .populate('userId', 'fullName email phone')
      .populate('batchId', 'batchName')
      .lean();
    if (!student) {
      // if parent account is linked as guardian
      student = await Student.findOne({ guardianUserId: userId })
        .populate('userId', 'fullName email phone')
        .populate('batchId', 'batchName')
        .lean();
    }
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
  } catch (err) {
    next(err);
  }
}

async function divisionAllocationRoster(req, res, next) {
  try {
    const { currentClass, batchId } = req.query;
    const filter = { status: 'active' };
    if (currentClass) filter['details.education.currentClass'] = currentClass;
    if (batchId) filter.batchId = batchId;

    const students = await Student.find(filter)
      .populate('userId', 'fullName phone email')
      .populate('batchId', 'batchName capacity')
      .sort({ createdAt: 1 })
      .lean();

    const divisions = students.reduce((acc, student) => {
      const division = normalizeDivision(student?.details?.education?.division || '');
      if (!division) return acc;
      acc[division] = (acc[division] || 0) + 1;
      return acc;
    }, {});

    res.json({
      currentClass: currentClass || '',
      batchId: batchId || '',
      totalStudents: students.length,
      divisions,
      items: students.map((student) => ({
        studentId: student._id,
        studentName: student.userId?.fullName || 'Student',
        enrollmentNo: student.enrollmentNo || '',
        mobileNo: student.userId?.phone || '',
        currentClass: student?.details?.education?.currentClass || '',
        division: normalizeDivision(student?.details?.education?.division || ''),
        branch: student?.details?.education?.branch || '',
        batchId: student.batchId?._id || null,
        batchName: student.batchId?.batchName || '',
        batchCapacity: Number(student.batchId?.capacity) || 0
      }))
    });
  } catch (err) {
    next(err);
  }
}

async function assignStudentDivision(req, res, next) {
  try {
    const { studentIds, division } = req.body;
    const normalizedDivision = normalizeDivision(division);
    if (!Array.isArray(studentIds) || !studentIds.length) {
      return res.status(400).json({ message: 'studentIds are required' });
    }
    if (!normalizedDivision) {
      return res.status(400).json({ message: 'division is required' });
    }

    const students = await Student.find({ _id: { $in: studentIds } });
    await Promise.all(students.map(async (student) => {
      const details = student.details || {};
      details.education = details.education || {};
      details.education.division = normalizedDivision;
      student.details = details;
      await student.save();
    }));

    res.json({ message: 'Division assigned successfully', division: normalizedDivision, updatedCount: students.length });
  } catch (err) {
    next(err);
  }
}

async function autoAllocateDivisions(req, res, next) {
  try {
    const { currentClass, batchId, capacityPerDivision = 60 } = req.body;
    const capacity = Math.max(Number(capacityPerDivision) || 60, 1);
    const filter = { status: 'active' };
    if (currentClass) filter['details.education.currentClass'] = currentClass;
    if (batchId) filter.batchId = batchId;

    const students = await Student.find(filter).sort({ createdAt: 1 });
    if (!students.length) {
      return res.status(404).json({ message: 'No students found for allocation' });
    }

    await Promise.all(students.map(async (student, index) => {
      const bucket = Math.floor(index / capacity);
      const division = nextDivisionLabel(bucket);
      const details = student.details || {};
      details.education = details.education || {};
      details.education.division = division;
      student.details = details;
      await student.save();
    }));

    res.json({
      message: 'Students allocated division-wise successfully',
      totalStudents: students.length,
      capacityPerDivision: capacity
    });
  } catch (err) {
    next(err);
  }
}

async function updateStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const payload = req.body;

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // Prevent duplicate enrollment numbers, emails or phones
    if (payload.enrollmentNo) {
      const existingEnroll = await Student.findOne({ enrollmentNo: payload.enrollmentNo, _id: { $ne: studentId } });
      if (existingEnroll) return res.status(409).json({ message: 'Enrollment number already exists' });
    }

    if (payload.email || payload.phone) {
      const userDup = await User.findOne({
        _id: { $ne: student.userId },
        $or: [payload.email ? { email: payload.email } : null, payload.phone ? { phone: payload.phone } : null].filter(Boolean)
      });
      if (userDup) return res.status(409).json({ message: 'Email or phone already in use' });
    }

    if (payload.fullName || payload.email || payload.phone) {
      const user = await User.findById(student.userId);
      if (user) {
        if (payload.fullName) user.fullName = payload.fullName;
        if (payload.email) user.email = payload.email;
        if (payload.phone) user.phone = payload.phone;
        await user.save();
      }
    }

    const updatable = ['enrollmentNo', 'batchId', 'status', 'details', 'dateOfBirth', 'gender', 'address', 'emergencyContact', 'admissionDate'];
    updatable.forEach((key) => {
      if (payload[key] !== undefined) student[key] = payload[key];
    });
    if (payload.dateOfBirth !== undefined) {
      student.age = calculateAgeFromDateOfBirth(payload.dateOfBirth);
    }

    if (payload.details && typeof payload.details === 'object') {
      student.details = { ...student.details, ...shapeStudentDetails(payload.details) };
    }

    await student.save();
    const refreshed = await Student.findById(studentId)
      .populate('userId', 'fullName email phone passwordCipher')
      .populate('batchId', 'batchName');

    res.json(serializeStudent(refreshed));
  } catch (err) {
    next(err);
  }
}

async function deleteStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    // remove fee records linked to this student
    await Fee.deleteMany({ studentId });
    await Student.findByIdAndDelete(studentId);

    res.json({ message: 'Student deleted' });
  } catch (err) {
    next(err);
  }
}

async function exportStudentPdf(req, res, next) {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId)
      .populate('userId', 'fullName email phone')
      .populate('batchId', 'batchName')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    const fee = await Fee.findOne({ studentId }).lean();

    const doc = new PDFDocument({ margin: 26, size: 'A4' });
    const pdfFontName = initPdfFont(doc);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=student-${student.enrollmentNo}.pdf`);
    doc.pipe(res);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const leftX = doc.page.margins.left;
    const rightX = doc.page.width - doc.page.margins.right;
    const details = student.details || {};
    const personal = details.personal || details;
    const education = details.education || details.educ || details;
    const physical = details.physical || details;
    const parent = details.parent || details;
    const address = details.address || details;
    const total = fee?.totalAmount || 0;
    const paid = fee?.paidAmount || 0;
    const due = fee?.dueAmount || Math.max(total - paid, 0);
    const feeDays = calculateFeeDays(fee?.feeStartDate || fee?.feeFrom, fee?.feeEndDate || fee?.feeTo);

    function setFont(size = 9, color = '#15213d') {
      if (pdfFontName) {
        doc.font(pdfFontName);
      }
      doc.fontSize(size).fillColor(color);
      return doc;
    }

    function ensureSpace(requiredHeight = 22) {
      if (doc.y + requiredHeight > doc.page.height - doc.page.margins.bottom - 10) {
        doc.addPage();
        if (pdfFontName) doc.font(pdfFontName);
      }
    }

    function drawSectionTitle(titleEnglish) {
      ensureSpace(20);
      setFont(10.5, '#1f2f75').text(titleEnglish, leftX, doc.y);
      doc
        .moveTo(leftX, doc.y + 1)
        .lineTo(rightX, doc.y + 1)
        .strokeColor('#d6dce8')
        .lineWidth(0.8)
        .stroke();
      doc.moveDown(0.2);
    }

    function drawInfoTable(rows) {
      const cellGap = 4;
      const basePadding = 5;
      const twoColWidth = (pageWidth - cellGap) / 2;
      rows.forEach((cells) => {
        const normalized = cells.length === 1
          ? [{ ...cells[0], width: pageWidth }]
          : cells.map((cell) => ({ ...cell, width: cell.width || twoColWidth }));
        const heights = normalized.map((cell) => {
          const textWidth = cell.width - 18;
          const labelHeight = doc.heightOfString(pdfValue(cell.label), { width: textWidth, align: 'left' });
          const valueHeight = doc.heightOfString(pdfValue(cell.value), { width: textWidth, align: 'left' });
          return labelHeight + valueHeight + basePadding * 2 + 4;
        });
        const rowHeight = Math.max(...heights, 24);
        ensureSpace(rowHeight + 2);
        const y = doc.y;
        let currentX = leftX;

        normalized.forEach((cell, index) => {
          const x = currentX;
          doc
            .rect(x, y, cell.width, rowHeight)
            .fillAndStroke('#ffffff', '#d6dce8');
          setFont(7.2, '#4b5774').text(pdfValue(cell.label), x + 5, y + 4, { width: cell.width - 10 });
          const labelBottom = doc.y;
          setFont(8.2, '#15213d').text(pdfValue(cell.value), x + 5, labelBottom + 2, {
            width: cell.width - 10,
            align: 'left'
          });
          currentX += cell.width + (index < normalized.length - 1 ? cellGap : 0);
        });

        doc.y = y + rowHeight + 2;
      });
    }

    function drawPaymentTable(transactions = []) {
      drawSectionTitle('Fee Payment Details');
      const cols = [58, 72, 62, 88, pageWidth - (58 + 72 + 62 + 88)];
      const headers = ['Date', 'Amount', 'Mode', 'Reference', 'Note'];

      const drawPaymentRow = (cells, header = false) => {
        const rowPadding = header ? 5 : 4;
        const heights = cells.map((cell, index) =>
          doc.heightOfString(pdfValue(cell), { width: cols[index] - 8 })
        );
        const rowHeight = Math.max(...heights) + rowPadding * 2;
        ensureSpace(rowHeight + 2);
        let x = leftX;
        const y = doc.y;

        cells.forEach((cell, index) => {
          doc
            .rect(x, y, cols[index], rowHeight)
            .fillAndStroke(header ? '#eef3ff' : '#ffffff', '#d6dce8');
          setFont(header ? 7.2 : 7.8, header ? '#1f2f75' : '#15213d').text(pdfValue(cell), x + 4, y + rowPadding, {
            width: cols[index] - 8,
            align: index === 1 ? 'right' : 'left'
          });
          x += cols[index];
        });

        doc.y = y + rowHeight + 2;
      };

      drawPaymentRow(headers, true);

      if (!transactions.length) {
        drawPaymentRow(['—', '—', '—', '—', 'No payment records available'], false);
        return;
      }

      transactions.forEach((entry) => {
        drawPaymentRow([
          formatDate(entry.paidOn),
          formatCurrency(entry.amount),
          entry.mode || '—',
          entry.transactionRef || '—',
          entry.note || '—'
        ]);
      });
    }

    doc
      .rect(leftX, doc.y, pageWidth, 56)
      .fill('#f3f6ff');
    setFont(16, '#1f2f75').text('Baliraja Academy', leftX + 10, doc.y + 8);
    setFont(10.5, '#1f2f75').text('Student Information Report', leftX + 10, doc.y + 28);

    const photoCandidate = student.details?.photoPath || student.details?.photo || student.details?.photoUrl;
    if (photoCandidate) {
      const localPath = photoCandidate.startsWith('http')
        ? null
        : path.isAbsolute(photoCandidate)
          ? photoCandidate
          : path.join(process.cwd(), photoCandidate);
      if (localPath && fs.existsSync(localPath)) {
        doc.image(localPath, doc.page.width - doc.page.margins.right - 54, doc.page.margins.top + 5, {
          fit: [46, 46],
          valign: 'top',
          align: 'right'
        });
      }
    }
    doc.moveDown(1.1);
    setFont(7.6, '#4a4a4a').text(`Generated On: ${formatDateTime(new Date())}`, { align: 'left' });
    setFont(7.6, '#4a4a4a').text(`Enrollment No: ${student.enrollmentNo || '—'}`, { align: 'left' });
    doc.moveDown(0.15);
    doc
      .moveTo(leftX, doc.y)
      .lineTo(rightX, doc.y)
      .strokeColor('#d6dce8')
      .lineWidth(0.8)
      .stroke();
    doc.moveDown(0.2);

    drawSectionTitle('Admission Details');
    drawInfoTable([
      [
        { label: 'Student Name', value: student.userId?.fullName || '—' },
        { label: 'Admission Date', value: formatDate(student.admissionDate) }
      ],
      [
        { label: 'Date of Birth', value: formatDate(student.dateOfBirth) },
        { label: 'Gender', value: personal.gender || student.gender || '—' }
      ],
      [
        { label: 'Blood Group', value: personal.bloodGroup || '—' },
        { label: 'Aadhaar No', value: personal.aadhaarNo || '—' }
      ],
      [
        { label: 'Email', value: student.userId?.email || '—' },
        { label: 'Mobile No', value: student.userId?.phone || '—' }
      ],
      [
        { label: 'Year / Batch', value: student.batchId?.batchName || '—' },
        { label: 'Status', value: student.status || '—' }
      ]
    ]);

    drawSectionTitle('Address Details');
    drawInfoTable([
      [
        { label: 'Address Line 1', value: address.addressLine1 || student.address || '—' },
        { label: 'Address Line 2', value: address.addressLine2 || '—' }
      ],
      [
        { label: 'City / Village', value: address.city || '—' },
        { label: 'District', value: address.district || '—' }
      ],
      [
        { label: 'State', value: address.state || '—' },
        { label: 'PIN Code', value: address.pinCode || '—' }
      ]
    ]);

    drawSectionTitle('Parent / Guardian Details');
    drawInfoTable([
      [
        { label: 'Father Name', value: parent.fatherName || details.fatherName || '—' },
        { label: 'Father Job', value: parent.fatherJob || details.fatherJob || '—' }
      ],
      [
        { label: 'Father Mobile', value: parent.fatherMobile || details.fatherMobile || '—' },
        { label: 'Mother Name', value: parent.motherName || details.motherName || '—' }
      ],
      [
        { label: 'Mother Job', value: parent.motherJob || details.motherJob || '—' },
        { label: 'Mother Mobile', value: parent.motherMobile || details.motherMobile || '—' }
      ],
      [
        { label: 'Referance Name', value: parent.guardianName || details.guardianName || '—' },
        { label: 'Relation', value: parent.guardianRelation || details.guardianRelation || '—' }
      ],
      [
        { label: 'Guardian Mobile', value: parent.guardianMobile || details.guardianMobile || '—' },
        { label: 'Emergency Contact', value: student.emergencyContact || '—' }
      ]
    ]);

    drawSectionTitle('Education Details');
    drawInfoTable([
      [
        { label: 'Previous School', value: education.previousSchool || '—' },
        { label: 'Current Class', value: education.currentClass || '—' }
      ],
      [
        { label: 'Medium', value: education.medium || '—' },
        { label: 'Board', value: education.board || '—' }
      ],
      [
        { label: 'Passing Year', value: education.passingYear || '—' },
        { label: 'Percentage', value: education.percentage || '—' }
      ]
    ]);

    drawSectionTitle('Physical / Medical Details');
    drawInfoTable([
      [
        { label: 'Height', value: physical.height ? `${physical.height} cm` : '—' },
        { label: 'Weight', value: physical.weight ? `${physical.weight} kg` : '—' }
      ],
      [
        { label: 'Vision', value: physical.vision || '—' },
        { label: 'Disability', value: physical.disability || '—' }
      ],
      [
        { label: 'Allergy / Notes', value: physical.allergy || '—', width: pageWidth }
      ]
    ]);

    drawSectionTitle('Fee Details');
    drawInfoTable([
      [
        { label: 'Total Fees', value: formatCurrency(total) },
        { label: 'Paid Fees', value: formatCurrency(paid) }
      ],
      [
        { label: 'Remaining Fees', value: formatCurrency(due) },
        { label: 'Payment Status', value: due > 0 ? 'Pending' : 'Paid' }
      ],
      [
        { label: 'Fee From Date', value: formatDate(fee?.feeStartDate || fee?.feeFrom) },
        { label: 'Fee To Date', value: formatDate(fee?.feeEndDate || fee?.feeTo) }
      ],
      [
        { label: 'Total Days', value: feeDays },
        { label: 'Due Date', value: formatDate(fee?.dueDate) }
      ],
      [
        { label: 'Last Updated', value: formatDateTime(fee?.updatedAt), width: pageWidth }
      ]
    ]);

    drawPaymentTable(fee?.transactions || []);

    ensureSpace(46);
    doc.moveDown(0.6);
    setFont(7.2, '#4b5774').text('This document is a soft copy generated by the system.', leftX, doc.y, {
      width: pageWidth
    });
    doc.moveDown(0.9);
    setFont(8, '#15213d').text('______________________', rightX - 130, doc.y, { width: 130, align: 'center' });
    setFont(8, '#15213d').text('Admin Signature', rightX - 130, doc.y + 2, { width: 130, align: 'center' });

    doc.end();
  } catch (err) {
    next(err);
  }
}

function normalizePhone(p) {
  if (!p) return '';
  return String(p).replace(/\D/g, '');
}

async function publicStudentByPhone(req, res, next) {
  try {
    const incoming = normalizePhone(req.params.phone);
    if (!incoming) return res.status(400).json({ message: 'Phone required' });

    // match user phone by suffix (to handle +91 etc.)
    const user = await User.findOne({ phone: { $regex: `${incoming}$` } });

    let student = null;
    if (user) {
      student = await Student.findOne({ userId: user._id });
    }

    // fallback: guardian/emergency contact match (suffix)
    if (!student) {
      const rx = { $regex: `${incoming}$` };
      student = await Student.findOne({
        $or: [
          { emergencyContact: rx },
          { 'details.guardianMobile': rx },
          { 'details.fatherMobile': rx },
          { 'details.motherMobile': rx }
        ]
      });
    }

    if (!student) return res.status(404).json({ message: 'Student not found' });

    const hydrated = await Student.findById(student._id)
      .populate('userId', 'fullName email phone')
      .populate('batchId', 'batchName')
      .populate('createdBy', 'fullName email')
      .lean();

    const fee = await Fee.findOne({ studentId: student._id }).lean();
    const attendance = await Attendance.find({ studentId: student._id }).sort({ date: -1 }).limit(60);
    res.json({ student: hydrated, fee, attendance });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createStudent,
  listStudents,
  getStudent,
  getMyStudent,
  divisionAllocationRoster,
  assignStudentDivision,
  autoAllocateDivisions,
  updateStudent,
  deleteStudent,
  exportStudentPdf,
  publicStudentByPhone,
  reverseGeocode
};
