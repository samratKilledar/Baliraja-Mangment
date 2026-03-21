import NoticeStrip from '../../components/NoticeStrip';

export default function ParentDashboard() {
  return (
    <div className="dashboard-shell">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Parent</p>
          <h2>Parent Dashboard</h2>
        </div>
      </header>
      <NoticeStrip />
    </div>
  );
}
