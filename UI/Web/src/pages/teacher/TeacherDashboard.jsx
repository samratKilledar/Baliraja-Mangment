import { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import VectorIcon from '../../components/VectorIcon';
import NoticeStrip from '../../components/NoticeStrip';
import LectureList from '../../components/LectureList';

const subjects = ['Aptitude', 'Logical Reasoning', 'Communication', 'Technical Interview'];

const students = [
  { id: 'S-101', name: 'Aarav Jadhav', subject: 'Aptitude', targetRole: 'Software Trainee', mobile: '9876543210' },
  { id: 'S-102', name: 'Sakshi Shinde', subject: 'Logical Reasoning', targetRole: 'QA Trainee', mobile: '9822334455' },
  { id: 'S-103', name: 'Om Patil', subject: 'Communication', targetRole: 'Support Executive', mobile: '9866001122' },
  { id: 'S-104', name: 'Tanvi More', subject: 'Technical Interview', targetRole: 'Java Intern', mobile: '9898981212' },
  { id: 'S-105', name: 'Rohan Kale', subject: 'Aptitude', targetRole: 'Data Analyst Trainee', mobile: '9777006677' }
];

export default function TeacherDashboard() {
  const { logout } = useAuth();
  const [activeSubject, setActiveSubject] = useState(subjects[0]);

  const filtered = useMemo(
    () => students.filter((student) => student.subject === activeSubject),
    [activeSubject]
  );

  return (
    <div className="dashboard-shell">
      <p className="dash-brand">Baliraja Academy Gangapur Management</p>
      <header className="dash-topbar fade-up">
        <div>
          <p className="dash-kicker">Role: Teacher</p>
          <h2>Recruitment Training Dashboard</h2>
        </div>
        <button className="ghost-btn" onClick={logout}>Logout</button>
      </header>
      <NoticeStrip />

      <section className="panel fade-up delay-1">
        <div className="panel-head">
          <h3>Subject-wise Training Batch</h3>
          <VectorIcon name="spark" size={18} />
        </div>
        <div className="subject-filter">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`result-chip ${activeSubject === subject ? 'active' : ''}`}
              onClick={() => setActiveSubject(subject)}
            >
              {subject}
            </button>
          ))}
        </div>
      </section>

      <section className="panel fade-up delay-2">
        <div className="panel-head">
          <h3>Students for {activeSubject}</h3>
          <VectorIcon name="users" size={18} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Target Role</th>
                <th>Training Subject</th>
                <th>Mobile</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id}>
                  <td>{student.id}</td>
                  <td>{student.name}</td>
                  <td>{student.targetRole}</td>
                  <td>{student.subject}</td>
                  <td>{student.mobile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel fade-up delay-4">
        <div className="panel-head">
          <h3>Lectures Logged (Last 30 days)</h3>
          <VectorIcon name="calendar" size={18} />
        </div>
        <LectureList />
      </section>
    </div>
  );
}
