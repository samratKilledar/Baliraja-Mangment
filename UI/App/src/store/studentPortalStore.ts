export type StudentProfile = {
  studentId: string;
  studentName: string;
  parentName: string;
  parentJob: string;
  parentMobile: string;
  address: string;
  admissionDate: string;
  courseEndDate: string;
  targetRole: string;
  feesTotal: number;
  feesPaid: number;
  performanceScore: number;
  profileImage: string;
};

export type Complaint = {
  id: string;
  studentId: string;
  studentName: string;
  message: string;
  createdAt: string;
  status: 'open' | 'resolved';
};

export type AttendanceDay = {
  checkInAt: string | null;
  checkOutAt: string | null;
};

export type StaffProfile = {
  staffId: string;
  staffName: string;
  designation: string;
  subject: string;
  experienceYears: number;
  basePresentDays: number;
  baseAbsentDays: number;
};

export type LeaveRequest = {
  id: string;
  studentId: string;
  studentName: string;
  reason: string;
  applyDate: string;
  fromDateTime: string;
  toDateTime: string;
  durationLabel: string;
  createdAt: string;
  status: 'pending' | 'approved';
  approvedBy: string | null;
};

type StoreShape = {
  profiles: Record<string, StudentProfile>;
  staffProfiles: Record<string, StaffProfile>;
  complaints: Complaint[];
  leaveRequests: LeaveRequest[];
  attendance: Record<string, Record<string, AttendanceDay>>;
  staffAttendance: Record<string, Record<string, AttendanceDay>>;
};

export const ANNOUNCEMENTS = [
  {
    id: 'a1',
    title: 'Recruitment Mock Drive - This Saturday',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: 'a2',
    title: 'Resume Review Workshop',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: 'a3',
    title: 'Aptitude Practice Marathon',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1400&q=80'
  },
  {
    id: 'a4',
    title: 'Interview Skills Workshop',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80'
  }
];

let store: StoreShape = {
  profiles: {
    'demo-1001': {
      studentId: 'demo-1001',
      studentName: 'Aarav Jadhav',
      parentName: 'Ravi Jadhav',
      parentJob: 'Farmer',
      parentMobile: '9876543210',
      address: 'Gangapur, Chhatrapati Sambhajinagar',
      admissionDate: '2025-06-05',
      courseEndDate: '2026-05-31',
      targetRole: 'Software Trainee',
      feesTotal: 54000,
      feesPaid: 42000,
      performanceScore: 84,
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300'
    }
  },
  staffProfiles: {
    'staff-2001': {
      staffId: 'staff-2001',
      staffName: 'Mahesh Patil',
      designation: 'Teacher',
      subject: 'Quantitative Aptitude',
      experienceYears: 6,
      basePresentDays: 18,
      baseAbsentDays: 3
    },
    'staff-2002': {
      staffId: 'staff-2002',
      staffName: 'Sneha Kulkarni',
      designation: 'Teacher',
      subject: 'English & Soft Skills',
      experienceYears: 4,
      basePresentDays: 20,
      baseAbsentDays: 1
    },
    'staff-2003': {
      staffId: 'staff-2003',
      staffName: 'Rohit Deshmukh',
      designation: 'Lab Assistant',
      subject: 'Computer Lab',
      experienceYears: 3,
      basePresentDays: 17,
      baseAbsentDays: 4
    }
  },
  complaints: [],
  leaveRequests: [
    {
      id: 'l-1001',
      studentId: 'demo-1001',
      studentName: 'Aarav Jadhav',
      reason: 'Medical checkup',
      applyDate: '2026-03-02',
      fromDateTime: '2026-03-03 10:00',
      toDateTime: '2026-03-03 14:00',
      durationLabel: '4 hours',
      createdAt: '2026-03-02T09:15:00.000Z',
      status: 'approved',
      approvedBy: 'Admin'
    },
    {
      id: 'l-1002',
      studentId: 'demo-1001',
      studentName: 'Aarav Jadhav',
      reason: 'Family visit',
      applyDate: '2026-03-06',
      fromDateTime: '2026-03-07 17:30',
      toDateTime: '2026-03-07 18:00',
      durationLabel: '30 min',
      createdAt: '2026-03-06T11:25:00.000Z',
      status: 'pending',
      approvedBy: null
    }
  ],
  attendance: {},
  staffAttendance: {
    'staff-2001': {
      [new Date().toISOString().slice(0, 10)]: {
        checkInAt: new Date().toISOString(),
        checkOutAt: null
      }
    }
  }
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function subscribePortalStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStudentProfile(studentId: string, fallbackName = 'Student User') {
  if (!store.profiles[studentId]) {
    store.profiles[studentId] = {
      studentId,
      studentName: fallbackName,
      parentName: 'Parent Name',
      parentJob: 'Private Job',
      parentMobile: '9000000000',
      address: 'Gangapur',
      admissionDate: '2025-07-01',
      courseEndDate: '2026-05-31',
      targetRole: 'Recruitment Trainee',
      feesTotal: 50000,
      feesPaid: 25000,
      performanceScore: 70,
      profileImage: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=300'
    };
  }
  return store.profiles[studentId];
}

export function getAllProfiles() {
  return Object.values(store.profiles);
}

export function getAllStaffProfiles() {
  return Object.values(store.staffProfiles);
}

export function getAllComplaints() {
  return store.complaints;
}

export function getLeaveRequests() {
  return store.leaveRequests;
}

export function submitStudentLeave(
  studentId: string,
  studentName: string,
  reason: string,
  applyDate: string,
  fromDateTime: string,
  toDateTime: string,
  durationLabel: string
) {
  store.leaveRequests = [
    {
      id: `${Date.now()}`,
      studentId,
      studentName,
      reason,
      applyDate,
      fromDateTime,
      toDateTime,
      durationLabel,
      createdAt: new Date().toISOString(),
      status: 'pending',
      approvedBy: null
    },
    ...store.leaveRequests
  ];
  emit();
}

export function approveLeaveByAdmin(requestId: string, adminName = 'Admin') {
  store.leaveRequests = store.leaveRequests.map((item) => {
    if (item.id !== requestId) return item;
    return {
      ...item,
      status: 'approved',
      approvedBy: adminName
    };
  });
  emit();
}

export function addComplaint(studentId: string, studentName: string, message: string) {
  store.complaints = [
    {
      id: `${Date.now()}`,
      studentId,
      studentName,
      message,
      createdAt: new Date().toISOString(),
      status: 'open'
    },
    ...store.complaints
  ];
  emit();
}

export function getAttendanceMap(studentId: string) {
  return store.attendance[studentId] || {};
}

export function getStaffAttendanceMap(staffId: string) {
  return store.staffAttendance[staffId] || {};
}

export function checkInCampus(studentId: string, studentName: string) {
  getStudentProfile(studentId, studentName);
  const day = todayKey();
  if (!store.attendance[studentId]) store.attendance[studentId] = {};
  const row = store.attendance[studentId][day] || { checkInAt: null, checkOutAt: null };
  store.attendance[studentId][day] = { ...row, checkInAt: new Date().toISOString() };
  emit();
}

export function checkOutCampus(studentId: string, studentName: string) {
  getStudentProfile(studentId, studentName);
  const day = todayKey();
  if (!store.attendance[studentId]) store.attendance[studentId] = {};
  const row = store.attendance[studentId][day] || { checkInAt: null, checkOutAt: null };
  store.attendance[studentId][day] = { ...row, checkOutAt: new Date().toISOString() };
  emit();
}

export function staffCheckIn(staffId: string, staffName: string) {
  const day = todayKey();
  if (!store.staffProfiles[staffId]) {
    store.staffProfiles[staffId] = {
      staffId,
      staffName,
      designation: 'Teacher',
      subject: 'General',
      experienceYears: 1,
      basePresentDays: 0,
      baseAbsentDays: 0
    };
  }
  if (!store.staffAttendance[staffId]) store.staffAttendance[staffId] = {};
  const row = store.staffAttendance[staffId][day] || { checkInAt: null, checkOutAt: null };
  store.staffAttendance[staffId][day] = { ...row, checkInAt: new Date().toISOString() };
  emit();
}

export function staffCheckOut(staffId: string, staffName: string) {
  const day = todayKey();
  if (!store.staffProfiles[staffId]) {
    store.staffProfiles[staffId] = {
      staffId,
      staffName,
      designation: 'Teacher',
      subject: 'General',
      experienceYears: 1,
      basePresentDays: 0,
      baseAbsentDays: 0
    };
  }
  if (!store.staffAttendance[staffId]) store.staffAttendance[staffId] = {};
  const row = store.staffAttendance[staffId][day] || { checkInAt: null, checkOutAt: null };
  store.staffAttendance[staffId][day] = { ...row, checkOutAt: new Date().toISOString() };
  emit();
}

export function getAdminAttendanceRows() {
  return getAllProfiles().map((profile) => {
    const day = todayKey();
    const row = store.attendance[profile.studentId]?.[day];
    const available = Boolean(row?.checkInAt && !row?.checkOutAt);
    return {
      studentId: profile.studentId,
      studentName: profile.studentName,
      checkInAt: row?.checkInAt || null,
      checkOutAt: row?.checkOutAt || null,
      available
    };
  });
}

export function getAdminStaffAttendanceRows() {
  return getAllStaffProfiles().map((profile) => {
    const day = todayKey();
    const row = store.staffAttendance[profile.staffId]?.[day];
    const available = Boolean(row?.checkInAt && !row?.checkOutAt);
    return {
      staffId: profile.staffId,
      staffName: profile.staffName,
      designation: profile.designation,
      subject: profile.subject,
      checkInAt: row?.checkInAt || null,
      checkOutAt: row?.checkOutAt || null,
      available
    };
  });
}

export function getSuperAdminStaffSummaryRows() {
  return getAllStaffProfiles().map((profile) => {
    const day = todayKey();
    const row = store.staffAttendance[profile.staffId]?.[day];
    const todayPresent = Boolean(row?.checkInAt);
    const presentDays = profile.basePresentDays + (todayPresent ? 1 : 0);
    const absentDays = profile.baseAbsentDays + (todayPresent ? 0 : 1);
    return {
      staffId: profile.staffId,
      staffName: profile.staffName,
      designation: profile.designation,
      subject: profile.subject,
      presentDays,
      absentDays,
      workingDays: presentDays + absentDays,
      checkInAt: row?.checkInAt || null,
      checkOutAt: row?.checkOutAt || null
    };
  });
}
