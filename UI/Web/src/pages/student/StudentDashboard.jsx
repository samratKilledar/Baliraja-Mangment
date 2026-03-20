import NoticeStrip from '../../components/NoticeStrip';
import PerformanceGraph from '../../components/PerformanceGraph';

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
      <div className="panel">
        <h3>My Performance Graph</h3>
        <PerformanceGraph viewerRole="student" allowedStudentIds={["S-101"]} />
      </div>
    </div>
  );
}
