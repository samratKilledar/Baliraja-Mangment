import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VectorIcon from '../../components/VectorIcon';
import NoticeStrip from '../../components/NoticeStrip';
import LectureList from '../../components/LectureList';
import AttendanceWorkspace from '../../components/AttendanceWorkspace';

const MENU_ITEMS = [
  { key: 'attendance', label: 'Attendance', icon: 'calendar' },
  { key: 'lectures', label: 'Lectures', icon: 'spark' }
];

export default function TeacherDashboard() {
  const { logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState('attendance');

  return (
    <div className="dashboard-shell">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Teacher</p>
          <h2>Teacher Attendance Dashboard</h2>
        </div>
        <button className="ghost-btn" onClick={logout}>Logout</button>
      </header>
      <NoticeStrip />

      <section className="panel fade-up delay-1">
        <div className="panel-head">
          <h3>Teacher Menu</h3>
          <VectorIcon name="users" size={18} />
        </div>
        <div className="subject-filter">
          {MENU_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`result-chip ${activeMenu === item.key ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {activeMenu === 'attendance' ? (
        <section className="fade-up delay-2">
          <AttendanceWorkspace role="teacher" />
        </section>
      ) : (
        <section className="panel fade-up delay-2">
          <div className="panel-head">
            <h3>Lectures Logged</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <LectureList />
        </section>
      )}
    </div>
  );
}
