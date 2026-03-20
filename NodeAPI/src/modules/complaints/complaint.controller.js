const Complaint = require('./complaint.model');
const Student = require('../students/student.model');

async function createComplaint(req, res, next) {
  try {
    let { studentId, subject, message, phone: bodyPhone } = req.body;

    // Basic guard: allow unauthenticated submissions, but if a user is present ensure role is allowed
    const allowedRoles = ['student', 'parent', 'admin', 'super_admin'];
    if (req.user && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
    }

    // Resolve studentId if not provided
    if (!studentId && req.user?.role === 'student') {
      const student = await Student.findOne({ userId: req.user.sub });
      studentId = student?._id;
    }
    if (!studentId && bodyPhone) {
      const student = await Student.findOne().populate({ path: 'userId', match: { phone: bodyPhone }, select: 'phone' });
      studentId = student?._id;
    }

    if (!message) return res.status(400).json({ message: 'Message is required' });
    if (!studentId) return res.status(400).json({ message: 'studentId required' });

    const student = await Student.findById(studentId).populate('userId', 'phone email fullName');
    const phone = student?.userId?.phone || bodyPhone;

    const complaint = await Complaint.create({
      studentId,
      userId: req.user?.sub,
      phone,
      subject,
      message,
      status: 'open'
    });
    res.status(201).json(complaint);
  } catch (err) {
    next(err);
  }
}

async function listComplaints(req, res, next) {
  try {
    const complaints = await Complaint.find()
      .populate('studentId', 'enrollmentNo')
      .populate('userId', 'fullName phone');
    res.json(complaints);
  } catch (err) {
    next(err);
  }
}

async function updateComplaintStatus(req, res, next) {
  try {
    const { complaintId } = req.params;
    const { status, adminNote } = req.body;
    if (!['open', 'wip', 'done'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });
    complaint.status = status;
    if (adminNote !== undefined) complaint.adminNote = adminNote;
    complaint.handledBy = req.user.sub;
    await complaint.save();
    res.json(complaint);
  } catch (err) {
    next(err);
  }
}

async function myComplaints(req, res, next) {
  try {
    const phone = req.query.phone;

    if (!req.user && !phone) {
      return res.status(401).json({ message: 'Auth or phone required' });
    }

    let filter = {};
    if (req.user) {
      filter = { userId: req.user.sub };
    } else if (phone) {
      let studentIdFromPhone = null;
      const student = await Student.findOne()
        .populate({ path: 'userId', match: { phone }, select: 'phone' });
      if (student?.userId?.phone === phone) {
        studentIdFromPhone = student._id;
      }
      filter = {
        $or: [
          { phone },
          studentIdFromPhone ? { studentId: studentIdFromPhone } : null
        ].filter(Boolean)
      };
    }

    const list = await Complaint.find(filter).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    next(err);
  }
}

async function deleteComplaint(req, res, next) {
  try {
    const { complaintId } = req.params;
    const phone = req.query.phone;
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'super_admin');
    const isOwnerUser = req.user && complaint.userId?.toString() === req.user.sub;
    const isOwnerPhone = phone && complaint.phone === phone;

    if (!isAdmin && !isOwnerUser && !isOwnerPhone) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await complaint.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createComplaint, listComplaints, updateComplaintStatus, myComplaints, deleteComplaint };
