import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../../api/client';
import VectorIcon from '../../components/VectorIcon';
import StudentAdmissionForm from '../../components/StudentAdmissionForm';
import StudentList from '../../components/StudentList';
import NoticeCenter from '../../components/NoticeCenter';
import AdminManagement from '../../components/AdminManagement';
import WorkerList from '../../components/WorkerList';
import NoticeStrip from '../../components/NoticeStrip';
import ComplaintCenter from '../../components/ComplaintCenter';
import TeacherForm from '../../components/TeacherForm';
import TeacherList from '../../components/TeacherList';
import LectureList from '../../components/LectureList';
import LeaveCenter from '../../components/LeaveCenter';
import DataCleanup from '../../components/DataCleanup';
import CheckinConfigCard from '../../components/CheckinConfigCard';
import SplashManager from '../../components/SplashManager';
import SubjectManager from '../../components/SubjectManager';
import AttendanceWorkspace from '../../components/AttendanceWorkspace';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import SharedGrid from '../../components/SharedGrid';
import AdmissionOptionsManager from '../../components/AdmissionOptionsManager';
const baseMenus = [
  { key: 'analytics', label: 'Analytics Hub', icon: 'chart', path: '/super-admin' },
  { key: 'student-form', label: 'Student Master Form', icon: 'users', path: '/super-admin/student-form' },
  { key: 'students-list', label: 'Student List', icon: 'users', path: '/super-admin/students-list' },
  { key: 'teacher-form', label: 'Add Teacher', icon: 'users', path: '/super-admin/teacher-form' },
  { key: 'teachers-list', label: 'Teacher List', icon: 'users', path: '/super-admin/teachers-list' },
  { key: 'subjects', label: 'Subjects', icon: 'spark', path: '/super-admin/subjects' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar', path: '/super-admin/attendance' },
  { key: 'admission-options', label: 'Admission Setup', icon: 'spark', path: '/super-admin/admission-options' },
  { key: 'password', label: 'Change Password', icon: 'shield', path: '/super-admin/password' },
  { key: 'lectures', label: 'Lectures Logged', icon: 'calendar', path: '/super-admin/lectures' },
  { key: 'fees', label: 'Finance Monitor', icon: 'money', path: '/super-admin/fees' },
  { key: 'notice', label: 'Notice Publisher', icon: 'bell', path: '/super-admin/notice' },
  { key: 'splash', label: 'App Splash', icon: 'spark', path: '/super-admin/splash' },
  { key: 'admins', label: 'Admin Management', icon: 'shield', path: '/super-admin/admins' },
  { key: 'workers', label: 'Workers', icon: 'users', path: '/super-admin/workers' },
  { key: 'complaints', label: 'Complaints', icon: 'alert-circle', path: '/super-admin/complaints' },
  { key: 'leaves', label: 'Leaves', icon: 'calendar', path: '/super-admin/leaves' },
  { key: 'data', label: 'Data Cleanup', icon: 'trash', path: '/super-admin/data' }

];

const EMPTY_SUMMARY = {
  totalUsers: 0,
  studentCount: 0,
  teacherCount: 0,
  workerCount: 0,
  fees: { totalExpected: 0, totalCollected: 0, totalDue: 0 },
  revenueLocked: true,
  revenue: 0,
  admissions: { month: [], week: [], day: [] }
};

function normalizeSummary(data = {}) {
  return {
    ...EMPTY_SUMMARY,
    ...data,
    totalUsers: Number(data?.totalUsers) || 0,
    studentCount: Number(data?.studentCount) || 0,
    teacherCount: Number(data?.teacherCount) || 0,
    workerCount: Number(data?.workerCount) || 0,
    fees: {
      ...EMPTY_SUMMARY.fees,
      ...(data?.fees || {}),
      totalExpected: Number(data?.fees?.totalExpected) || 0,
      totalCollected: Number(data?.fees?.totalCollected) || 0,
      totalDue: Number(data?.fees?.totalDue) || 0
    },
    revenueLocked: typeof data?.revenueLocked === 'boolean' ? data.revenueLocked : true,
    revenue: Number(data?.revenue) || 0,
    admissions: {
      ...EMPTY_SUMMARY.admissions,
      ...(data?.admissions || {}),
      month: Array.isArray(data?.admissions?.month) ? data.admissions.month : [],
      week: Array.isArray(data?.admissions?.week) ? data.admissions.week : [],
      day: Array.isArray(data?.admissions?.day) ? data.admissions.day : []
    }
  };
}

function formatMaskedCurrency(value, locked) {
 // alert(locked)
  if (locked) return '*****';
  return `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
}

function getFeeRangeSignal(fee) {
  const endRaw = fee?.feeEndDate || fee?.feeTo;
  if (!endRaw) return { isCritical: false, daysLeft: null, label: '' };
  const endDate = new Date(endRaw);
  if (Number.isNaN(endDate.getTime())) return { isCritical: false, daysLeft: null, label: '' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const label = daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : `${daysLeft} days left`;
  return { isCritical: daysLeft <= 30, daysLeft, label };
}

export default function SuperAdminDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState('analytics');
  const [menuName, setMenuName] = useState('');
  const [extraMenus, setExtraMenus] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [revenuePass, setRevenuePass] = useState('');
  const [revenueUnlocked, setRevenueUnlocked] = useState(false);
  const [feesList, setFeesList] = useState([]);
  const [feeCategorySummary, setFeeCategorySummary] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesError, setFeesError] = useState('');
  const [feesPage, setFeesPage] = useState(1);
  const [feesMeta, setFeesMeta] = useState({ page: 1, totalPages: 1 });
  const [menuOpen, setMenuOpen] = useState(false);
  const lastLoginLabel = useMemo(() => {
    if (!user?.lastLoginAt) return '';
    const parsed = new Date(user.lastLoginAt);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [user?.lastLoginAt]);

  const menuItems = useMemo(() => [...baseMenus, ...extraMenus], [extraMenus]);
  const routeModule = useMemo(() => {
    if (location.pathname.startsWith('/super-admin/students-list')) return 'students-list';
    if (location.pathname.startsWith('/super-admin/student-form')) return 'student-form';
    if (location.pathname.startsWith('/super-admin/teacher-form')) return 'teacher-form';
    if (location.pathname.startsWith('/super-admin/teachers-list')) return 'teachers-list';
    if (location.pathname.startsWith('/super-admin/subjects')) return 'subjects';
    if (location.pathname.startsWith('/super-admin/attendance')) return 'attendance';
    if (location.pathname.startsWith('/super-admin/admission-options')) return 'admission-options';
    if (location.pathname.startsWith('/super-admin/password')) return 'password';
    if (location.pathname.startsWith('/super-admin/lectures')) return 'lectures';
    if (location.pathname.startsWith('/super-admin/fees')) return 'fees';
    if (location.pathname.startsWith('/super-admin/notice')) return 'notice';
    if (location.pathname.startsWith('/super-admin/splash')) return 'splash';
    if (location.pathname.startsWith('/super-admin/admins')) return 'admins';
    if (location.pathname.startsWith('/super-admin/workers')) return 'workers';
    if (location.pathname.startsWith('/super-admin/complaints')) return 'complaints';
    if (location.pathname.startsWith('/super-admin/leaves')) return 'leaves';
    if (location.pathname.startsWith('/super-admin/data')) return 'data';
    return 'analytics';
  }, [location.pathname]);

  function feeStatusColor(fee) {
    const total = fee.totalAmount || 0;
    const paid = fee.paidAmount || 0;
    const due = fee.dueAmount ?? Math.max(total - paid, 0);
    const admissionDate = fee.studentId?.admissionDate ? new Date(fee.studentId.admissionDate) : null;
    const daysSinceAdmission = admissionDate ? Math.floor((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    if (due <= 0) return 'good';
    if (daysSinceAdmission >= 20) return 'danger';
    return 'warn';
  }

  function addMenuOption() {
    if (!menuName.trim()) return;
    const key = `extra-${Date.now()}`;
    setExtraMenus((prev) => [...prev, { key, label: menuName.trim(), icon: 'spark' }]);
    setMenuName('');
    setActiveModule(key);
  }

  const loadSummary = useCallback(async (pass) => {
    setLoadingSummary(true);
    const passAttempted = typeof pass === 'string' && pass.trim().length > 0;
    try {
      const { data } = await api.get('/dashboard/super-admin', {
        headers: pass ? { 'x-revenue-pass': pass } : undefined
      });
      const normalized = normalizeSummary(data);
      setSummary(normalized);
      if (passAttempted) {
        setRevenueUnlocked(!normalized.revenueLocked);
      }
    } catch (err) {
      console.error('Summary load failed', err);
      setSummary(EMPTY_SUMMARY);
      if (passAttempted) {
        setRevenueUnlocked(false);
      }
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const revenueMasked = !revenueUnlocked || summary.revenueLocked;
  const redRangeFees = useMemo(
    () => (feesList || [])
      .map((fee) => ({ fee, signal: getFeeRangeSignal(fee) }))
      .filter((item) => item.signal.isCritical),
    [feesList]
  );

  useEffect(() => {
    if (!user) return;
    if (!['analytics', 'fees'].includes(routeModule)) return;
    loadSummary();
  }, [loadSummary, routeModule, user]);

  useEffect(() => {
    if (!['analytics', 'fees'].includes(routeModule)) return;
    loadFees(routeModule === 'fees' ? feesPage : 1);
  }, [routeModule, feesPage]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function loadFees(nextPage = 1) {
    setFeesLoading(true);
    try {
      const [{ data }, { data: categoryData }] = await Promise.all([
        api.get('/fees/list', { params: { page: nextPage, limit: 10 } }),
        api.get('/fees/category-summary')
      ]);
      setFeesList(data?.items || []);
      setFeesMeta(data?.meta || { page: nextPage, totalPages: 1 });
      setFeeCategorySummary(categoryData?.items || []);
      setFeesError('');
    } catch (err) {
      setFeesList([]);
      setFeeCategorySummary([]);
      setFeesError(err?.response?.data?.message || 'Unable to load finance records');
    } finally {
      setFeesLoading(false);
    }
  }

  async function sendReminder(phone, studentId) {
    if (!phone) return alert('No mobile number found');
    try {
      await api.post('/notifications/fee-reminder', { phone, studentId });
      alert('Reminder sent');
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to send notification');
    }
  }

  const moduleView = useMemo(() => {
    const currentModule = activeModule.startsWith('extra-') ? activeModule : routeModule;
if (currentModule === 'workers') {
  return (
    <article className="panel">
      <div className="panel-head">
        <h3>Workers</h3>
        <VectorIcon name="users" size={18} />
      </div>
      <WorkerList />
    </article>
  );
}
if (currentModule === 'admins') {
  return (
    <article className="panel">
      <div className="panel-head">
        <h3>Admin Management</h3>
        <VectorIcon name="shield" size={18} />
      </div>
      <AdminManagement />
    </article>
  );
}
if (currentModule === 'student-form') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Student Form Workspace</h3>
            <VectorIcon name="users" size={18} />
          </div>
          <StudentAdmissionForm />
        </article>
      );
}
if (currentModule === 'admission-options') {
  return <AdmissionOptionsManager />;
}
    if (currentModule === 'teacher-form') {
      return (
        <article className="panel">
          <div className="panel-head">
            {/* <h3>Add Teacher</h3> */}
            <VectorIcon name="users" size={18} />
          </div>
          <TeacherForm />
        </article>
      );
    }
    if (currentModule === 'teachers-list') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Teacher List</h3>
            <VectorIcon name="users" size={18} />
          </div>
          <TeacherList />
        </article>
      );
    }
    if (currentModule === 'subjects') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Subject Management</h3>
            <VectorIcon name="spark" size={18} />
          </div>
          <SubjectManager />
        </article>
      );
    }
    if (currentModule === 'attendance') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Subject Attendance & Reports</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <AttendanceWorkspace role="super_admin" />
        </article>
      );
    }
    if (currentModule === 'password') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Change Password</h3>
            <VectorIcon name="shield" size={18} />
          </div>
          <ChangePasswordForm />
        </article>
      );
    }
    if (currentModule === 'lectures') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Lectures Logged (All Teachers)</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <LectureList days={365} pageSize={200} />
        </article>
      );
    }
    if (currentModule === 'students-list') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Student List</h3>
            <VectorIcon name="users" size={18} />
          </div>
          <StudentList />
        </article>
      );
    }
    if (currentModule === 'fees') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Finance Monitor</h3>
            <VectorIcon name="money" size={18} />
          </div>
          {redRangeFees.length ? (
            <div className="finance-red-alert finance-red-alert-bounce">
              <strong>Range Alert: {redRangeFees.length} fee range(s) ending within 30 days</strong>
              <div className="finance-red-alert-list">
                {redRangeFees.slice(0, 4).map(({ fee, signal }) => {
                  const student = fee.studentId || {};
                  return (
                    <span key={fee._id || student._id || fee.id}>
                      {student.userId?.fullName || student.enrollmentNo || 'Student'} ({signal.label})
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="analytics-password-box">
            <input
              placeholder="Enter revenue password"
              type="password"
              value={revenuePass}
              onChange={(e) => setRevenuePass(e.target.value)}
            />
            <button className="primary-btn analytics-inline-btn" onClick={() => loadSummary(revenuePass)} disabled={loadingSummary}>
              {loadingSummary ? 'Checking...' : 'Show Revenue'}
            </button>
          </div>
          <div className="snapshot-box">
            <div><small>Pending Money</small><strong>{formatMaskedCurrency(summary.fees?.totalExpected, revenueMasked)}</strong></div>
            <div><small>Collected Money</small><strong>{formatMaskedCurrency(summary.fees?.totalCollected, revenueMasked)}</strong></div>
            <div><small>Remaining Fees</small><strong>{formatMaskedCurrency(summary.fees?.totalDue, revenueMasked)}</strong></div>
          </div>
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Admission Category</th>
                  <th>Students</th>
                  <th>Total Fees</th>
                  <th>Collected</th>
                  <th>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {feeCategorySummary.map((item) => (
                  <tr key={item.category}>
                    <td>{item.category}</td>
                    <td>{item.studentCount}</td>
                    <td>{formatMaskedCurrency(item.totalExpected, revenueMasked)}</td>
                    <td>{formatMaskedCurrency(item.totalCollected, revenueMasked)}</td>
                    <td>{formatMaskedCurrency(item.totalDue, revenueMasked)}</td>
                  </tr>
                ))}
                {!feeCategorySummary.length && (
                  <tr>
                    <td colSpan={5}>No category-wise fee data available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}>
            {feesLoading && <p className="graph-note">Loading fee records...</p>}
            {feesError && <p className="graph-note" style={{ color: '#c0392b' }}>{feesError}</p>}
            {!feesLoading && !feesList.length && !feesError && <p className="graph-note">No finance data available.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feesList.map((fee) => {
                const status = feeStatusColor(fee);
                const rangeSignal = getFeeRangeSignal(fee);
                const due = fee.dueAmount ?? Math.max((fee.totalAmount || 0) - (fee.paidAmount || 0), 0);
                const student = fee.studentId || {};
                const guardian = student.details?.parent || {};
                const parentName =
                  guardian.fullName ||
                  guardian.guardianName ||
                  [guardian.fatherName, guardian.motherName].filter(Boolean).join(' & ') ||
                  guardian.fatherName ||
                  guardian.motherName ||
                  student.guardianName ||
                  'Parent';
                const parentPhone = guardian.guardianMobile || guardian.guardianPhone || guardian.motherMobile || guardian.fatherMobile || student.userId?.phone;
                const admissionDate = student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '—';
                const dueDate = fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : '—';
                const statusColor = status === 'good' ? '#e6f7ef' : status === 'warn' ? '#fff7e6' : '#ffecec';
                const borderColor = status === 'good' ? '#bfe7d2' : status === 'warn' ? '#f3d9a5' : '#f1b6b6';
                return (
                  <div
                    key={fee._id || student._id || fee.id}
                    className={rangeSignal.isCritical ? 'finance-fee-card-danger-bounce' : ''}
                    style={{
                      border: `1px solid ${borderColor}`,
                      background: statusColor,
                      borderRadius: 12,
                      padding: 12,
                      display: 'grid',
                      gridTemplateColumns: '2fr repeat(3, 1fr) auto',
                      gap: 10,
                      alignItems: 'center'
                    }}
                    >
                      <div>
                        <strong>{student.userId?.fullName || 'Student'} ({student.enrollmentNo || '—'})</strong>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>
                        Parent: {parentName} · {parentPhone || '—'}
                        </div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>Admission: {admissionDate} → Due: {dueDate}</div>
                        <div style={{ color: rangeSignal.isCritical ? '#b91c1c' : '#4b5774', fontSize: 12, fontWeight: rangeSignal.isCritical ? 700 : 500 }}>
                          Fee Range End: {fee.feeEndDate ? new Date(fee.feeEndDate).toLocaleDateString() : '—'} {rangeSignal.label ? `(${rangeSignal.label})` : ''}
                        </div>
                      </div>
                    <div><small>Total</small><div style={{ fontWeight: 700 }}>{formatMaskedCurrency(fee.totalAmount, revenueMasked)}</div></div>
                    <div><small>Paid</small><div style={{ fontWeight: 700, color: '#0f7d49' }}>{formatMaskedCurrency(fee.paidAmount, revenueMasked)}</div></div>
                    <div><small>Due</small><div style={{ fontWeight: 800, color: status === 'danger' ? '#c0392b' : '#c27b20' }}>{formatMaskedCurrency(due, revenueMasked)}</div></div>
                    <button className="ghost-btn" onClick={() => sendReminder(guardian.guardianMobile || student.userId?.phone, student._id)}>Send Notification</button>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {Array.from({ length: feesMeta.totalPages || 1 }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={feesMeta.page === pageNumber ? 'primary-btn' : 'ghost-btn'}
                  style={{ minWidth: 40 }}
                  onClick={() => setFeesPage(pageNumber)}
                  disabled={feesLoading}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
          </div>
        </article>
      );
    }
    if (currentModule === 'notice') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Notice Publisher</h3>
            <VectorIcon name="bell" size={18} />
          </div>
          <NoticeCenter />
        </article>
      );
    }
    if (currentModule === 'splash') {
      return <SplashManager />;
    }
    if (currentModule === 'complaints') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Complaint Inbox</h3>
            <VectorIcon name="alert-circle" size={18} />
          </div>
          <ComplaintCenter />
        </article>
      );
    }
    if (currentModule === 'data') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Storage & Data Cleanup</h3>
            <VectorIcon name="trash" size={18} />
          </div>
          <DataCleanup />
        </article>
      );
    }
    if (currentModule === 'leaves') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Leave Approvals</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <LeaveCenter />
        </article>
      );
    }
    if (currentModule.startsWith('extra-')) {
      const item = menuItems.find((entry) => entry.key === currentModule);
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>{item?.label || 'Custom Module'}</h3>
            <VectorIcon name="spark" size={18} />
          </div>
          <p className="auth-subtitle">Custom static module page ready. Connect it to your backend API later.</p>
        </article>
      );
    }
    return (
      <>
        <section className="analytics-hero fade-up delay-1">
          <div className="analytics-hero-copy">
            <p className="analytics-kicker">Analytics Hub</p>
            <h3>Institution snapshot for admissions, finance and operations</h3>
            <p className="graph-note">
              Track student intake, revenue visibility and team capacity in one place.
            </p>
          </div>
          <div className="analytics-hero-metrics">
            <article className="analytics-metric-card">
              <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
              <small>Total Users</small>
              <strong>{summary.totalUsers || 0}</strong>
            </article>
            <article className="analytics-metric-card">
              <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
              <small>Students</small>
              <strong>{summary.studentCount || 0}</strong>
            </article>
            <article className="analytics-metric-card">
              <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
              <small>Teachers</small>
              <strong>{summary.teacherCount || 0}</strong>
            </article>
            <article className="analytics-metric-card">
              <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
              <small>Workers</small>
              <strong>{summary.workerCount || 0}</strong>
            </article>
          </div>
        </section>

        <SharedGrid columns={1} className="dash-grid fade-up delay-2">
          <article className="panel analytics-panel analytics-finance-panel">
            <div className="panel-head">
              <h3>Finance Monitor (Live)</h3>
              <VectorIcon name="money" size={18} />
            </div>
            {redRangeFees.length ? (
              <div className="finance-red-alert finance-red-alert-bounce">
                <strong>Range Alert: {redRangeFees.length} fee range(s) ending within 30 days</strong>
                <div className="finance-red-alert-list">
                  {redRangeFees.slice(0, 4).map(({ fee, signal }) => {
                    const student = fee.studentId || {};
                    return (
                      <span key={fee._id || student._id || fee.id}>
                        {student.userId?.fullName || student.enrollmentNo || 'Student'} ({signal.label})
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="analytics-scroll-area">
              <div className="analytics-finance-grid">
                <div className="analytics-money-card tone-warn">
                  <small>Total Fees</small>
                  <strong>{formatMaskedCurrency(summary.fees?.totalExpected, revenueMasked)}</strong>
                </div>
                <div className="analytics-money-card tone-good">
                  <small>Collected</small>
                  <strong>{formatMaskedCurrency(summary.fees?.totalCollected, revenueMasked)}</strong>
                </div>
                <div className="analytics-money-card tone-danger">
                  <small>Remaining</small>
                  <strong>{formatMaskedCurrency(summary.fees?.totalDue, revenueMasked)}</strong>
                </div>
                <div className="analytics-money-card tone-primary">
                  <small>Revenue MTD</small>
                  <strong>{formatMaskedCurrency(summary.revenue, revenueMasked)}</strong>
                </div>
              </div>
            </div>
            <div className="analytics-password-box">
              <input
                placeholder="Enter revenue password"
                type="password"
                value={revenuePass}
                onChange={(e) => setRevenuePass(e.target.value)}
              />
              <button className="primary-btn analytics-inline-btn" onClick={() => loadSummary(revenuePass)} disabled={loadingSummary}>
                {loadingSummary ? 'Checking...' : 'Show Revenue'}
              </button>
            </div>
          </article>

          <article className="panel analytics-panel analytics-signal-panel">
            <div className="panel-head">
              <h3>System Signals</h3>
              <VectorIcon name="chart" size={18} />
            </div>
            <div className="analytics-signal-grid">
              <div className="analytics-signal-card">
                <small>Admissions by Month</small>
                <div className="analytics-scroll-area analytics-scroll-area-inline">
                  <div className="mini-chart-row">
                    {summary.admissions.month.map((item) => (
                      <div key={item.label} className="mini-bar">
                        <div className="mini-track">
                          <div className="mini-fill" style={{ height: `${Math.min(item.count * 10, 100)}%` }} />
                        </div>
                        <small>{item.label}</small>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                    {!summary.admissions.month.length && <p className="graph-note">No data</p>}
                  </div>
                </div>
              </div>
              <div className="analytics-signal-card">
                <small>Admissions by Week</small>
                <div className="analytics-scroll-area analytics-scroll-area-inline">
                  <div className="mini-chart-row">
                    {summary.admissions.week.map((item) => (
                      <div key={item.label} className="mini-bar">
                        <div className="mini-track">
                          <div className="mini-fill" style={{ height: `${Math.min(item.count * 15, 100)}%` }} />
                        </div>
                        <small>{item.label}</small>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                    {!summary.admissions.week.length && <p className="graph-note">No data</p>}
                  </div>
                </div>
              </div>
              <div className="analytics-signal-card">
                <small>Admissions by Day</small>
                <div className="analytics-scroll-area analytics-scroll-area-inline">
                  <div className="mini-chart-row">
                    {summary.admissions.day.map((item) => (
                      <div key={item.label} className="mini-bar">
                        <div className="mini-track">
                          <div className="mini-fill" style={{ height: `${Math.min(item.count * 25, 100)}%` }} />
                        </div>
                        <small>{item.label.slice(5)}</small>
                        <strong>{item.count}</strong>
                      </div>
                    ))}
                    {!summary.admissions.day.length && <p className="graph-note">No data</p>}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <CheckinConfigCard />
          <article className="panel analytics-panel analytics-category-panel">
            <div className="panel-head">
              <h3>Fee Categories</h3>
              <VectorIcon name="money" size={18} />
            </div>
            <div className="analytics-category-list">
              {feeCategorySummary.slice(0, 4).map((item) => (
                <div key={item.category} className="analytics-category-item">
                  <div>
                    <strong>{item.category}</strong>
                    <small>{item.studentCount} students</small>
                  </div>
                  <div>
                    <strong>{formatMaskedCurrency(item.totalCollected, revenueMasked)}</strong>
                    <small>Due {formatMaskedCurrency(item.totalDue, revenueMasked)}</small>
                  </div>
                </div>
              ))}
              {!feeCategorySummary.length && <p className="graph-note">No category-wise fee data available.</p>}
            </div>
          </article>
        </SharedGrid>
      </>
    );
  }, [activeModule, feeCategorySummary, feesError, feesList, feesLoading, feesMeta.page, feesMeta.totalPages, loadingSummary, menuItems, redRangeFees, revenueMasked, revenuePass, routeModule, summary]);

  return (
    <div className="dashboard-shell container-fluid px-2 px-md-3 px-xl-4">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Super Admin · {user?.email || 'no-email'}</p>
          <h2>Admin Operations Dashboard</h2>
        </div>
        <button className="mobile-nav-toggle btn btn-outline-primary" onClick={() => setMenuOpen(true)}>
          <i className="bi bi-list" />
          <span>Menu</span>
        </button>
        <button className="ghost-btn btn btn-outline-primary" onClick={logout}>Logout</button>
      </header>

      <section className="workspace">
        {menuOpen ? <button className="side-nav-overlay" onClick={() => setMenuOpen(false)} aria-label="Close menu" /> : null}
        <aside className={`side-nav side-nav-drop ${menuOpen ? 'open' : ''}`}>
          <div className="side-nav-head">
            <strong>Navigation</strong>
            <button className="btn btn-sm btn-outline-primary" onClick={() => setMenuOpen(false)}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="side-nav-profile">
            <div className="side-nav-lottie">
              <dotlottie-player
                src="/assets/login-lottie.json"
                background="transparent"
                speed="1"
                loop
                autoplay
              ></dotlottie-player>
            </div>
            <p className="side-nav-role">Role: Super Admin</p>
            <strong>{user?.fullName || 'Super Admin'}</strong>
            <small>{user?.email || 'no-email'}</small>
            {lastLoginLabel ? <small>Last login: {lastLoginLabel}</small> : null}
          </div>
          {menuItems.map((item) => {
            const isActive = (activeModule === item.key) || (routeModule === item.key);
            return (
              <button
                key={item.key}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveModule(item.key);
                  if (item.path) navigate(item.path);
                  setMenuOpen(false);
                }}
              >
                <VectorIcon name={item.icon} size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="workspace-main workspace-main-enter">
          <NoticeStrip />
          {moduleView}
        </main>
      </section>
    </div>
  );
}
