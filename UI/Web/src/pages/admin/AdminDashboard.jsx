import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import VectorIcon from '../../components/VectorIcon';
import StudentAdmissionForm from '../../components/StudentAdmissionForm';
import StudentList from '../../components/StudentList';
import TeacherForm from '../../components/TeacherForm';
import TeacherList from '../../components/TeacherList';
import NoticeCenter from '../../components/NoticeCenter';
import NoticeStrip from '../../components/NoticeStrip';
import ComplaintCenter from '../../components/ComplaintCenter';
import LeaveCenter from '../../components/LeaveCenter';
import LectureList from '../../components/LectureList';
import CheckinConfigCard from '../../components/CheckinConfigCard';
import SplashManager from '../../components/SplashManager';
import SubjectManager from '../../components/SubjectManager';
import AttendanceWorkspace from '../../components/AttendanceWorkspace';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import DivisionAllocationManager from '../../components/DivisionAllocationManager';
import DivisionAttendanceBoard from '../../components/DivisionAttendanceBoard';
import SharedGrid from '../../components/SharedGrid';
import api from '../../api/client';

const navItems = [
  { key: 'overview', label: 'Overview', icon: 'chart', path: '/admin' },
  { key: 'students', label: 'Student Form', icon: 'users', path: '/admin/students' },
  { key: 'students-list', label: 'Student List', icon: 'users', path: '/admin/students-list' },
  { key: 'teachers', label: 'Add Teacher', icon: 'spark', path: '/admin/teachers' },
  { key: 'teachers-list', label: 'Teacher List', icon: 'users', path: '/admin/teachers-list' },
  { key: 'subjects', label: 'Subjects', icon: 'spark', path: '/admin/subjects' },
  { key: 'divisions', label: 'Division Allocation', icon: 'users', path: '/admin/divisions' },
  { key: 'division-attendance', label: 'Division Attendance', icon: 'calendar', path: '/admin/division-attendance' },
  { key: 'notices', label: 'Notices', icon: 'bell', path: '/admin/notices' },
  { key: 'lectures', label: 'Lectures', icon: 'calendar', path: '/admin/lectures' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar', path: '/admin/attendance' },
  { key: 'password', label: 'Change Password', icon: 'shield', path: '/admin/password' },
  { key: 'complaints', label: 'Complaints', icon: 'alert-circle', path: '/admin/complaints' },
  { key: 'leaves', label: 'Leaves', icon: 'calendar', path: '/admin/leaves' },
  { key: 'splash', label: 'App Splash', icon: 'spark', path: '/admin/splash' }
];

const tasks = [
  'Verify new admissions submitted this morning',
  'Approve fee discount requests',
  'Publish revised batch timetable',
  'Review pending parent grievances'
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
    admissions: {
      ...EMPTY_SUMMARY.admissions,
      ...(data?.admissions || {}),
      month: Array.isArray(data?.admissions?.month) ? data.admissions.month : [],
      week: Array.isArray(data?.admissions?.week) ? data.admissions.week : [],
      day: Array.isArray(data?.admissions?.day) ? data.admissions.day : []
    }
  };
}

function formatCurrency(value) {
  return `₹${(Number(value) || 0).toLocaleString('en-IN')}`;
}

export default function AdminDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/dashboard/super-admin');
      setSummary(normalizeSummary(data));
    } catch (err) {
      console.error('Admin summary load failed', err);
      setSummary(EMPTY_SUMMARY);
    }
  }, []);

  const routeKey = useMemo(() => {
    if (location.pathname.startsWith('/admin/students-list')) return 'students-list';
    if (location.pathname.startsWith('/admin/teachers-list')) return 'teachers-list';
    if (location.pathname.startsWith('/admin/teachers')) return 'teachers';
    if (location.pathname.startsWith('/admin/subjects')) return 'subjects';
    if (location.pathname.startsWith('/admin/divisions')) return 'divisions';
    if (location.pathname.startsWith('/admin/division-attendance')) return 'division-attendance';
    if (location.pathname.startsWith('/admin/notices')) return 'notices';
    if (location.pathname.startsWith('/admin/students')) return 'students';
    if (location.pathname.startsWith('/admin/lectures')) return 'lectures';
    if (location.pathname.startsWith('/admin/attendance')) return 'attendance';
    if (location.pathname.startsWith('/admin/password')) return 'password';
    if (location.pathname.startsWith('/admin/complaints')) return 'complaints';
    if (location.pathname.startsWith('/admin/leaves')) return 'leaves';
    if (location.pathname.startsWith('/admin/splash')) return 'splash';
    return 'overview';
  }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    if (routeKey !== 'overview') return;
    loadSummary();
  }, [loadSummary, routeKey, user]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const content = useMemo(() => {
    if (routeKey === 'students') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Student Admission Workspace</h3>
            <VectorIcon name="users" size={18} />
          </div>
          <StudentAdmissionForm />
        </article>
      );
    }
    if (routeKey === 'students-list') {
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
    if (routeKey === 'teachers') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Teacher Management</h3>
            <VectorIcon name="spark" size={18} />
          </div>
          <TeacherForm />
        </article>
      );
    }
    if (routeKey === 'teachers-list') {
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
    if (routeKey === 'subjects') {
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
    if (routeKey === 'divisions') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Division Allocation</h3>
            <VectorIcon name="users" size={18} />
          </div>
          <DivisionAllocationManager />
        </article>
      );
    }
    if (routeKey === 'division-attendance') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Division Attendance</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <DivisionAttendanceBoard />
        </article>
      );
    }
    if (routeKey === 'lectures') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Lectures (Last 30 days)</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <LectureList days={365} pageSize={200} />
        </article>
      );
    }
    if (routeKey === 'notices') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Notice Center</h3>
            <VectorIcon name="bell" size={18} />
          </div>
          <NoticeCenter />
        </article>
      );
    }
    if (routeKey === 'attendance') {
      return (
        <article className="panel">
          <div className="panel-head">
            <h3>Subject Attendance & Reports</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <AttendanceWorkspace role="admin" />
        </article>
      );
    }
    if (routeKey === 'password') {
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
    if (routeKey === 'complaints') {
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
    if (routeKey === 'leaves') {
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
    if (routeKey === 'splash') {
      return <SplashManager />;
    }
    return (
      <>
        <section className="analytics-hero fade-up delay-1">
          <div className="analytics-hero-copy">
            <p className="analytics-kicker">Analytics Hub</p>
            <h3>Institution snapshot for admissions, finance and operations</h3>
            <p className="graph-note">
              Track student intake, collections and staff activity in one place.
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
            <div className="analytics-scroll-area">
              <div className="analytics-finance-grid">
                <div className="analytics-money-card tone-warn">
                  <small>Total Fees</small>
                  <strong>{formatCurrency(summary.fees?.totalExpected)}</strong>
                </div>
                <div className="analytics-money-card tone-good">
                  <small>Collected</small>
                  <strong>{formatCurrency(summary.fees?.totalCollected)}</strong>
                </div>
                <div className="analytics-money-card tone-danger">
                  <small>Remaining</small>
                  <strong>{formatCurrency(summary.fees?.totalDue)}</strong>
                </div>
                <div className="analytics-money-card tone-primary">
                  <small>Revenue MTD</small>
                  <strong>{formatCurrency(summary.revenue)}</strong>
                </div>
              </div>
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

          <article className="panel">
            <div className="panel-head">
              <h3>Quick Actions</h3>
              <VectorIcon name="spark" size={18} />
            </div>
            <div className="action-grid">
              <button onClick={() => navigate('/admin/students')}>New Admission Form</button>
              <button onClick={() => navigate('/admin/students-list')}>Student List</button>
              <button onClick={() => navigate('/admin/teachers')}>Add Teacher</button>
              <button onClick={() => navigate('/admin/notices')}>Issue Notice</button>
              <button onClick={() => navigate('/admin/attendance')}>Attendance Audit</button>
              <button onClick={() => navigate('/admin/division-attendance')}>Division Attendance</button>
            </div>
            <ul className="task-list" style={{ marginTop: 12 }}>
              {tasks.map((task) => <li key={task}>{task}</li>)}
            </ul>
          </article>

          <CheckinConfigCard />
        </SharedGrid>
      </>
    );
  }, [navigate, routeKey, summary]);

  return (
    <div className="dashboard-shell container-fluid px-2 px-md-3 px-xl-4">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Admin</p>
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
        <aside className={`side-nav fade-up delay-1 ${menuOpen ? 'open' : ''}`}>
          <div className="side-nav-head">
            <strong>Navigation</strong>
            <button className="btn btn-sm btn-outline-primary" onClick={() => setMenuOpen(false)}>
              <i className="bi bi-x-lg" />
            </button>
          </div>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${routeKey === item.key ? 'active' : ''}`}
              onClick={() => {
                navigate(item.path);
                setMenuOpen(false);
              }}
            >
              <VectorIcon name={item.icon} size={16} />
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <main className="workspace-main fade-up delay-2">
          <NoticeStrip />
          {content}
        </main>
      </section>
    </div>
  );
}
