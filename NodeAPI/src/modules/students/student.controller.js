const https = require('https');
const Student = require('./student.model');
const { sendPush } = require('../../utils/push.service');
const DeviceToken = require('../notifications/deviceToken.model');
const User = require('../users/user.model');
const Fee = require('../fees/fee.model');
const Attendance = require('../attendance/attendance.model');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

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
    const { q, batchId, status } = req.query;
    const filter = {};

    if (batchId) filter.batchId = batchId;
    if (status) filter.status = status;
    if (q) {
      filter.$or = [
        { enrollmentNo: { $regex: q, $options: 'i' } },
        { 'userId.phone': { $regex: q, $options: 'i' } }
      ];
    }

    let students = await Student.find(filter)
      .populate('userId', 'fullName email phone')
      .populate('createdBy', 'fullName email')
      .populate('currentCourseIds', 'name category')
      .populate('batchId', 'batchName');

    if (q) {
      const ql = q.toLowerCase();
      students = students.filter((s) => {
        const hay = [s.userId?.phone, s.userId?.email].filter(Boolean).join(' ').toLowerCase();
        return s.enrollmentNo?.toLowerCase().includes(ql) || hay.includes(ql);
      });
    }

    res.json(students);
  } catch (err) {
    next(err);
  }
}

async function getStudent(req, res, next) {
  try {
    const { studentId } = req.params;
    const student = await Student.findById(studentId)
      .populate('userId', 'fullName email phone')
      .populate('createdBy', 'fullName email')
      .populate('batchId', 'batchName')
      .lean();
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(student);
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

    if (payload.details && typeof payload.details === 'object') {
      student.details = { ...student.details, ...shapeStudentDetails(payload.details) };
    }

    await student.save();
    const refreshed = await Student.findById(studentId)
      .populate('userId', 'fullName email phone')
      .populate('batchId', 'batchName');

    res.json(refreshed);
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

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=student-${student.enrollmentNo}.pdf`);
    doc.pipe(res);

    // Header bar
    doc
      .rect(doc.page.margins.left, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 70)
      .fill('#f3f6ff');
    doc.fillColor('#1f2f75').fontSize(22).text('Baliraja Academy', doc.page.margins.left + 12, doc.y + 12);
    doc.fillColor('#4b5774').fontSize(13).text('प्रवेश पुष्टीपत्र (Admission Confirmation)', {
      align: 'left',
      continued: false
    });
    doc.moveDown(1.2);

    // Student photo (top-right) if available
    const photoCandidate = student.details?.photoPath || student.details?.photo || student.details?.photoUrl;
    if (photoCandidate) {
      const localPath = photoCandidate.startsWith('http')
        ? null
        : path.isAbsolute(photoCandidate)
          ? photoCandidate
          : path.join(process.cwd(), photoCandidate);
      if (localPath && fs.existsSync(localPath)) {
        doc.image(localPath, doc.page.width - doc.page.margins.right - 90, doc.page.margins.top + 6, {
          fit: [80, 80],
          valign: 'top',
          align: 'right'
        });
      }
    }
    doc.fillColor('#4a4a4a').fontSize(11).text(`निर्मित दिनांक / Generated: ${new Date().toLocaleString()}`, { align: 'left' });
    doc.moveDown();
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .strokeColor('#d6dce8')
      .lineWidth(1)
      .stroke();
    doc.moveDown(0.5);

    const leftX = doc.page.margins.left;
    const midX = doc.page.width / 2;
    const rowGap = 6;
    const rowHeight = 22;
    const sectionWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const tableRow = (y, cells) => {
      const colWidth = sectionWidth / cells.length;
      cells.forEach((cell, i) => {
        const x = leftX + i * colWidth;
        doc
          .rect(x, y, colWidth, rowHeight)
          .strokeColor('#d6dce8')
          .lineWidth(0.7)
          .stroke();
        doc
          .fillColor('#15213d')
          .fontSize(10)
          .text(cell.label, x + 6, y + 4, { width: colWidth - 12, continued: false });
        doc
          .fillColor('#4b5774')
          .fontSize(10)
          .text(cell.value || '—', x + 6, doc.y + 1, { width: colWidth - 12 });
      });
      return y + rowHeight;
    };

    const sectionTitle = (title) => {
      doc.moveDown(0.6);
      doc.fillColor('#1f2f75').fontSize(14).text(title, leftX, doc.y);
      doc
        .moveTo(leftX, doc.y + 2)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y + 2)
        .strokeColor('#d6dce8')
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.4);
    };

    // Admission confirmation block (2 columns)
    sectionTitle('प्रवेश तपशील / Admission Details');
    let yCursor = doc.y;
    const admissionRows = [
      [
        { label: 'विद्यार्थी नाव / Name', value: student.userId?.fullName },
        { label: 'नोंदणी क्र. / Enrollment No', value: student.enrollmentNo }
      ],
      [
        { label: 'जन्मतारीख / DOB', value: student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—' },
        { label: 'लिंग / Gender', value: student.gender || '—' }
      ],
      [
        { label: 'प्रवेश दिनांक / Admission Date', value: student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '—' },
        { label: 'स्थिती / Status', value: student.status || '—' }
      ],
      [
        { label: 'ईमेल / Email', value: student.userId?.email },
        { label: 'मोबाईल / Phone', value: student.userId?.phone }
      ],
      [
        { label: 'बॅच / Batch', value: student.batchId?.batchName || '—' },
        { label: 'पत्ता / Address', value: student.address || '—' }
      ]
    ];
    admissionRows.forEach((r) => {
      yCursor = tableRow(yCursor, r);
    });

    // Parent / Guardian
    sectionTitle('पालक माहिती / Parent & Guardian');
    const d = student.details || {};
    const parent = d.parent || d;
    const parentRows = [
      [
        { label: 'वडील नाव / Father', value: d.fatherName || '—' },
        { label: 'मोबाईल', value: d.fatherMobile || '—' }
      ],
      [
        { label: 'आई नाव / Mother', value: d.motherName || '—' },
        { label: 'मोबाईल', value: d.motherMobile || '—' }
      ],
      [
        { label: 'पालक / Guardian', value: parent.guardianName || d.guardianName || '—' },
        { label: 'नाते / Relation', value: parent.guardianRelation || d.guardianRelation || '—' }
      ]
    ];
    parentRows.forEach((r) => {
      yCursor = tableRow(yCursor, r);
    });

    // Education
    sectionTitle('शैक्षणिक माहिती / Education');
    const edu = d.education || d.educ || d;
    const eduRows = [
      [
        { label: 'मागील शाळा / Previous School', value: edu.previousSchool || '—' },
        { label: 'सध्याचा वर्ग / Current Class', value: edu.currentClass || '—' }
      ],
      [
        { label: 'माध्यम / Medium', value: edu.medium || '—' },
        { label: 'Board', value: edu.board || '—' }
      ],
      [
        { label: 'Passing Year', value: edu.passingYear || '—' },
        { label: 'टक्केवारी / Percentage', value: edu.percentage || '—' }
      ]
    ];
    eduRows.forEach((r) => {
      yCursor = tableRow(yCursor, r);
    });

    // Fees block with status
    sectionTitle('शुल्क सारांश / Fee Summary');
    const total = fee?.totalAmount || 0;
    const paid = fee?.paidAmount || 0;
    const due = fee?.dueAmount || Math.max(total - paid, 0);
    const feeRows = [
      [
        { label: 'एकूण शुल्क (₹)', value: total },
        { label: 'भरलेले (₹)', value: paid }
      ],
      [
        { label: 'बाकी (₹)', value: due },
        { label: 'स्थिती', value: due > 0 ? 'Pending' : 'Paid' }
      ],
      [
        {
          label: 'शुल्क कालावधी',
          value: `${fee?.feeStartDate ? new Date(fee.feeStartDate).toLocaleDateString() : '—'} ते ${fee?.feeEndDate ? new Date(fee.feeEndDate).toLocaleDateString() : '—'}`
        },
        { label: 'शेवटचा अपडेट', value: fee?.updatedAt ? new Date(fee.updatedAt).toLocaleString() : '—' }
      ]
    ];
    feeRows.forEach((r) => {
      yCursor = tableRow(yCursor, r);
    });

    // Profile section
    doc.fillColor('#000').fontSize(14).text('Profile', { underline: true });
    doc.moveDown(0.3).fontSize(12);
    doc.text(`Name: ${student.userId?.fullName || ''}`);
    doc.text(`Enrollment No: ${student.enrollmentNo}`);
    doc.text(`Email: ${student.userId?.email || ''}`);
    doc.text(`Phone: ${student.userId?.phone || ''}`);
    doc.text(`Status: ${student.status}`);
    if (student.batchId) doc.text(`Batch: ${student.batchId.batchName}`);
    if (student.admissionDate) doc.text(`Admission Date: ${new Date(student.admissionDate).toLocaleDateString()}`);
    if (student.dateOfBirth) doc.text(`DOB: ${new Date(student.dateOfBirth).toLocaleDateString()}`);
    if (student.gender) doc.text(`Gender: ${student.gender}`);
    if (student.address) doc.text(`Address: ${student.address}`);
    doc.moveDown();

    // Parent / Guardian
    doc.fontSize(14).text('Parent & Guardian', { underline: true }).moveDown(0.3).fontSize(12);
    const detailsEn = student.details || {};
    const parentEn = detailsEn.parent || detailsEn;
    doc.text(`Father: ${detailsEn.fatherName || '—'} (${detailsEn.fatherMobile || '—'})`);
    doc.text(`Mother: ${detailsEn.motherName || '—'} (${detailsEn.motherMobile || '—'})`);
    doc.text(`Guardian: ${parentEn.guardianName || detailsEn.guardianName || '—'} (${parentEn.guardianMobile || detailsEn.guardianMobile || '—'})`);
    if (parentEn.guardianRelation || detailsEn.guardianRelation) doc.text(`Relation: ${parentEn.guardianRelation || detailsEn.guardianRelation}`);
    doc.moveDown();

    // Education
    const eduEn = detailsEn.education || detailsEn.educ || detailsEn;
    doc.fontSize(14).text('Education', { underline: true }).moveDown(0.3).fontSize(12);
    doc.text(`Previous School: ${eduEn.previousSchool || '—'}`);
    doc.text(`Current Class: ${eduEn.currentClass || '—'}`);
    doc.text(`Board: ${eduEn.board || '—'} | Medium: ${eduEn.medium || '—'}`);
    doc.text(`Passing Year: ${eduEn.passingYear || '—'} | Percentage: ${eduEn.percentage || '—'}`);
    doc.moveDown();

    // Physical
    const physEn = detailsEn.physical || detailsEn;
    doc.fontSize(14).text('Physical / Medical', { underline: true }).moveDown(0.3).fontSize(12);
    doc.text(`Height: ${physEn.height || '—'} cm | Weight: ${physEn.weight || '—'} kg`);
    doc.text(`Vision: ${physEn.vision || '—'} | Disability: ${physEn.disability || '—'}`);
    doc.text(`Allergy / Notes: ${physEn.allergy || '—'}`);
    doc.moveDown();

    // Fees
    doc.fontSize(14).text('Fees', { underline: true }).moveDown(0.3).fontSize(12);
    if (fee) {
      doc.text(`Total: ₹${fee.totalAmount || 0}`);
      doc.text(`Paid: ₹${fee.paidAmount || 0}`);
      doc.text(`Remaining: ₹${fee.dueAmount || 0}`);
      if (fee.feeStartDate || fee.feeEndDate) {
        doc.text(`Period: ${fee.feeStartDate ? new Date(fee.feeStartDate).toLocaleDateString() : '—'} to ${fee.feeEndDate ? new Date(fee.feeEndDate).toLocaleDateString() : '—'}`);
      }
      if (fee.dueDate) doc.text(`Due Date: ${new Date(fee.dueDate).toLocaleDateString()}`);
      doc.moveDown(0.5);
      doc.text('Payments:', { continued: false });
      if (fee.transactions?.length) {
        fee.transactions.forEach((p, idx) => {
          doc.text(
            `${idx + 1}. ${new Date(p.paidOn).toLocaleDateString()} - ₹${p.amount} via ${p.mode}${p.transactionRef ? ` (Ref: ${p.transactionRef})` : ''}${p.note ? ` | ${p.note}` : ''}`
          );
        });
      } else {
        doc.text('No payments recorded.');
      }
    } else {
      doc.text('No fee record.');
    }

    // signature footer
    doc.moveDown(3);
    doc.text('__________________________', { align: 'right' });
    doc.text('स्वाक्षरी / Signature', { align: 'right' });

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

module.exports = { createStudent, listStudents, getStudent, getMyStudent, updateStudent, deleteStudent, exportStudentPdf, publicStudentByPhone, reverseGeocode };
