import { useEffect, useMemo, useState } from 'react';
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
import api from '../../api/client';

const navItems = [
  { key: 'overview', label: 'Overview', icon: 'chart', path: '/admin' },
  { key: 'students', label: 'Student Form', icon: 'users', path: '/admin/students' },
  { key: 'students-list', label: 'Student List', icon: 'users', path: '/admin/students-list' },
  { key: 'teachers', label: 'Add Teacher', icon: 'spark', path: '/admin/teachers' },
  { key: 'teachers-list', label: 'Teacher List', icon: 'users', path: '/admin/teachers-list' },
  { key: 'notices', label: 'Notices', icon: 'bell', path: '/admin/notices' },
  { key: 'lectures', label: 'Lectures', icon: 'calendar', path: '/admin/lectures' },
  { key: 'attendance', label: 'Attendance', icon: 'calendar', path: '/admin/attendance' },
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

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [summary, setSummary] = useState({
    totalUsers: 0,
    studentCount: 0,
    teacherCount: 0,
    workerCount: 0,
    fees: { totalExpected: 0, totalCollected: 0, totalDue: 0 },
    revenueLocked: true,
    revenue: 0,
    admissions: { month: [], week: [], day: [] }
  });

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      const { data } = await api.get('/dashboard/super-admin');
      setSummary(data);
    } catch (err) {
      console.error('Admin summary load failed', err);
    }
  }

  const routeKey = useMemo(() => {
    if (location.pathname.startsWith('/admin/students-list')) return 'students-list';
    if (location.pathname.startsWith('/admin/teachers-list')) return 'teachers-list';
    if (location.pathname.startsWith('/admin/teachers')) return 'teachers';
    if (location.pathname.startsWith('/admin/notices')) return 'notices';
    if (location.pathname.startsWith('/admin/students')) return 'students';
    if (location.pathname.startsWith('/admin/lectures')) return 'lectures';
    if (location.pathname.startsWith('/admin/attendance')) return 'attendance';
    if (location.pathname.startsWith('/admin/complaints')) return 'complaints';
    if (location.pathname.startsWith('/admin/leaves')) return 'leaves';
    if (location.pathname.startsWith('/admin/splash')) return 'splash';
    return 'overview';
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
            <h3>Attendance Monitor</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <ul className="task-list">
            <li>Class 10-A: 92% present</li>
            <li>Class 12-Science: 88% present</li>
            <li>Faculty attendance pending: 3 entries</li>
            <li>Daily attendance report ready for export</li>
          </ul>
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
        <section className="stats-grid fade-up delay-1">
          <article className="stat-card">
            <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
            <p>Total Users</p>
            <h3>{summary.totalUsers}</h3>
          </article>
          <article className="stat-card">
            <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
            <p>Students</p>
            <h3>{summary.studentCount}</h3>
          </article>
          <article className="stat-card">
            <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
            <p>Teachers</p>
            <h3>{summary.teacherCount}</h3>
          </article>
          <article className="stat-card">
            <div className="stat-icon"><VectorIcon name="users" size={18} /></div>
            <p>Workers</p>
            <h3>{summary.workerCount}</h3>
          </article>
        </section>
        <section className="dash-grid fade-up delay-2">
          <article className="panel">
            <div className="panel-head">
              <h3>Today Priorities</h3>
              <VectorIcon name="star" size={18} />
            </div>
            <ul className="task-list">
              {tasks.map((task) => <li key={task}>{task}</li>)}
            </ul>
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
            </div>
          </article>
          <CheckinConfigCard />
        </section>
      </>
    );
  }, [navigate, routeKey, summary]);

  return (
    <div className="dashboard-shell">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Admin</p>
          <h2>Admin Operations Dashboard</h2>
        </div>
        <button className="ghost-btn" onClick={logout}>Logout</button>
      </header>

      <section className="workspace">
        <aside className="side-nav fade-up delay-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${routeKey === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
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
