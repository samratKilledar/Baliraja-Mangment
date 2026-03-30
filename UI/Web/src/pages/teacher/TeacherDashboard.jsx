import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VectorIcon from '../../components/VectorIcon';
import NoticeStrip from '../../components/NoticeStrip';
import LectureList from '../../components/LectureList';
import AttendanceWorkspace from '../../components/AttendanceWorkspace';
import ChangePasswordForm from '../../components/ChangePasswordForm';
import ReferenceCenter from '../../components/ReferenceCenter';

const MENU_ITEMS = [
  { key: 'attendance', label: 'Attendance', icon: 'calendar' },
  { key: 'lectures', label: 'Lectures', icon: 'spark' },
  { key: 'references', label: 'References', icon: 'users' },
  { key: 'password', label: 'Password', icon: 'shield' }
];

export default function TeacherDashboard() {
  const { logout, user, updateUser } = useAuth();
  const [activeMenu, setActiveMenu] = useState('attendance');
  const mustChangePassword = Boolean(user?.mustChangePassword);

  if (mustChangePassword) {
    return (
      <div className="dashboard-shell container-fluid px-2 px-md-3 px-xl-4">
        <p className="dash-brand">Baliraja Academy Gangapur Management</p>
        <header className="dash-topbar fade-up">
          <div>
            <p className="dash-kicker">Role: Teacher</p>
            <h2>Password Update Required</h2>
          </div>
          <button className="ghost-btn btn btn-outline-primary" onClick={logout}>Logout</button>
        </header>
        <section className="panel fade-up delay-1">
          <p className="auth-subtitle">Please change your initial password to continue using teacher dashboard.</p>
          <ChangePasswordForm
            onSuccess={(updatedUser) => {
              if (user) {
                updateUser({
                  ...user,
                  ...(updatedUser || {}),
                  mustChangePassword: false
                });
              }
            }}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="dashboard-shell container-fluid px-2 px-md-3 px-xl-4">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Teacher</p>
          <h2>Teacher Attendance Dashboard</h2>
        </div>
        <button className="ghost-btn btn btn-outline-primary" onClick={logout}>Logout</button>
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
      ) : activeMenu === 'lectures' ? (
        <section className="panel fade-up delay-2">
          <div className="panel-head">
            <h3>Lectures Logged</h3>
            <VectorIcon name="calendar" size={18} />
          </div>
          <LectureList />
        </section>
      ) : activeMenu === 'references' ? (
        <section className="panel fade-up delay-2">
          <div className="panel-head">
            <h3>Reference Form</h3>
            <VectorIcon name="users" size={18} />
          </div>
          <ReferenceCenter mode="create" />
        </section>
      ) : (
        <section className="panel fade-up delay-2">
          <div className="panel-head">
            <h3>Change Password</h3>
            <VectorIcon name="shield" size={18} />
          </div>
          <ChangePasswordForm
            onSuccess={(updatedUser) => {
              if (user) {
                updateUser({
                  ...user,
                  ...(updatedUser || {}),
                  mustChangePassword: false
                });
              }
            }}
          />
        </section>
      )}
    </div>
  );
}
