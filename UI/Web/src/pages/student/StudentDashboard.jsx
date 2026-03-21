import NoticeStrip from '../../components/NoticeStrip';

export default function StudentDashboard() {
  return (
    <div className="dashboard-shell">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Student</p>
          <h2>Student Dashboard</h2>
        </div>
      </header>
      <NoticeStrip />
    </div>
  );
}
