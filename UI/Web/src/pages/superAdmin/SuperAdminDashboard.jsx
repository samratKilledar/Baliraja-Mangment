import { useEffect, useMemo, useState } from 'react';
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
const baseMenus = [
  { key: 'analytics', label: 'Analytics Hub', icon: 'chart', path: '/super-admin' },
  { key: 'student-form', label: 'Student Master Form', icon: 'users', path: '/super-admin/student-form' },
  { key: 'students-list', label: 'Student List', icon: 'users', path: '/super-admin/students-list' },
  { key: 'teacher-form', label: 'Add Teacher', icon: 'users', path: '/super-admin/teacher-form' },
  { key: 'teachers-list', label: 'Teacher List', icon: 'users', path: '/super-admin/teachers-list' },
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

export default function SuperAdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState('analytics');
  const [menuName, setMenuName] = useState('');
  const [extraMenus, setExtraMenus] = useState([]);
  const [summary, setSummary] = useState({ studentCount: 0, teacherCount: 0, workerCount: 0, fees: { totalExpected: 0, totalCollected: 0, totalDue: 0 }, revenueLocked: true, revenue: 0, admissions: { month: [], week: [], day: [] } });
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [revenuePass, setRevenuePass] = useState('');
  const [feesList, setFeesList] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);
  const [feesError, setFeesError] = useState('');
  const [feesPage, setFeesPage] = useState(1);
  const [feesMeta, setFeesMeta] = useState({ page: 1, totalPages: 1 });

  const menuItems = useMemo(() => [...baseMenus, ...extraMenus], [extraMenus]);
  const routeModule = useMemo(() => {
    if (location.pathname.startsWith('/super-admin/students-list')) return 'students-list';
    if (location.pathname.startsWith('/super-admin/student-form')) return 'student-form';
    if (location.pathname.startsWith('/super-admin/teacher-form')) return 'teacher-form';
    if (location.pathname.startsWith('/super-admin/teachers-list')) return 'teachers-list';
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

  async function loadSummary(pass) {
    setLoadingSummary(true);
    try {
      const { data } = await import('../../api/client').then((m) => m.default.get('/dashboard/super-admin', {
        headers: pass ? { 'x-revenue-pass': pass } : undefined
      }));
      setSummary(data);
    } catch (err) {
      console.error('Summary load failed', err);
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (routeModule === 'fees') {
      loadFees(feesPage);
    }
  }, [routeModule, feesPage]);

  async function loadFees(nextPage = 1) {
    setFeesLoading(true);
    try {
      const { data } = await api.get('/fees/list', { params: { page: nextPage, limit: 10 } });
      setFeesList(data?.items || []);
      setFeesMeta(data?.meta || { page: nextPage, totalPages: 1 });
      setFeesError('');
    } catch (err) {
      setFeesList([]);
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
          <div className="snapshot-box">
            <div><small>Pending Money</small><strong>₹{summary.fees.totalExpected?.toLocaleString('en-IN') || 0}</strong></div>
            <div><small>Collected Money</small><strong>₹{summary.fees.totalCollected?.toLocaleString('en-IN') || 0}</strong></div>
            <div><small>Remaining Fees</small><strong>₹{summary.fees.totalDue?.toLocaleString('en-IN') || 0}</strong></div>
          </div>
          <div style={{ marginTop: 12 }}>
            {feesLoading && <p className="graph-note">Loading fee records...</p>}
            {feesError && <p className="graph-note" style={{ color: '#c0392b' }}>{feesError}</p>}
            {!feesLoading && !feesList.length && !feesError && <p className="graph-note">No finance data available.</p>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feesList.map((fee) => {
                const status = feeStatusColor(fee);
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
                      </div>
                    <div><small>Total</small><div style={{ fontWeight: 700 }}>₹{fee.totalAmount || 0}</div></div>
                    <div><small>Paid</small><div style={{ fontWeight: 700, color: '#0f7d49' }}>₹{fee.paidAmount || 0}</div></div>
                    <div><small>Due</small><div style={{ fontWeight: 800, color: status === 'danger' ? '#c0392b' : '#c27b20' }}>₹{due}</div></div>
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
        <section className="stats-grid fade-up delay-1">
          <article className="stat-card super-stat">
            <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
            <p>Total Users</p>
            <h3>{summary.totalUsers || 0}</h3>
          </article>
          <article className="stat-card super-stat">
            <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
            <p>Students</p>
            <h3>{summary.studentCount || 0}</h3>
          </article>
          <article className="stat-card super-stat">
            <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
            <p>Teachers</p>
            <h3>{summary.teacherCount || 0}</h3>
          </article>
          <article className="stat-card super-stat">
            <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
            <p>Workers</p>
            <h3>{summary.workerCount || 0}</h3>
          </article>
        </section>
        <section className="dash-grid fade-up delay-2">
          <article className="panel">
            <div className="panel-head">
              <h3>Finance Monitor (Live)</h3>
              <VectorIcon name="money" size={18} />
            </div>
            <div className="snapshot-box">
              <div><small>Pending Money</small><strong>₹{summary.fees.totalExpected?.toLocaleString('en-IN') || 0}</strong></div>
              <div><small>Collected Money</small><strong>₹{summary.fees.totalCollected?.toLocaleString('en-IN') || 0}</strong></div>
              <div><small>Remaining Fees</small><strong>₹{summary.fees.totalDue?.toLocaleString('en-IN') || 0}</strong></div>
            </div>
            <div style={{ marginTop: 10 }}>
              <input
                placeholder="Enter revenue password"
                type="password"
                value={revenuePass}
                onChange={(e) => setRevenuePass(e.target.value)}
              />
              <button className="primary-btn" style={{ marginLeft: 8 }} onClick={() => loadSummary(revenuePass)} disabled={loadingSummary}>
                {loadingSummary ? 'Checking...' : 'Show Revenue'}
              </button>
              <div style={{ marginTop: 8 }}>
                Revenue MTD: {summary.revenueLocked ? '*****' : `₹${(summary.revenue || 0).toLocaleString('en-IN')}`}
              </div>
            </div>
          </article>
          <CheckinConfigCard />
          <article className="panel">
            <div className="panel-head">
              <h3>System Signals</h3>
              <VectorIcon name="chart" size={18} />
            </div>
            <div className="snapshot-box" style={{ gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <div>
                <small>Admissions (Month)</small>
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
              <div>
                <small>Admissions (Week)</small>
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
              <div>
                <small>Admissions (Day)</small>
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
          </article>
        </section>
      </>
    );
  }, [activeModule, menuItems, routeModule]);

  return (
    <div className="dashboard-shell">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Super Admin</p>
          <h2>Admin Operations Dashboard</h2>
        </div>
        <button className="ghost-btn" onClick={logout}>Logout</button>
      </header>

      <section className="workspace">
        <aside className="side-nav fade-up delay-1">
          {menuItems.map((item) => {
            const isActive = (activeModule === item.key) || (routeModule === item.key);
            return (
              <button
                key={item.key}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  setActiveModule(item.key);
                  if (item.path) navigate(item.path);
                }}
              >
                <VectorIcon name={item.icon} size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="workspace-main fade-up delay-2">
          <NoticeStrip />
          {moduleView}
        </main>
      </section>
    </div>
  );
}
