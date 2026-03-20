import NoticeStrip from '../../components/NoticeStrip';
import PerformanceGraph from '../../components/PerformanceGraph';

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
      <div className="panel">
        <h3>Child Performance (Monthly)</h3>
        <p className="graph-note">Only your linked child data is shown.</p>
        <PerformanceGraph viewerRole="parent" allowedStudentIds={["S-101"]} />
      </div>
    </div>
  );
}
