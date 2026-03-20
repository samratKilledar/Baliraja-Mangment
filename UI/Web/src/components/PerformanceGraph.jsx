import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const fallbackBook = [];

function avg(arr = []) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

export default function PerformanceGraph({ viewerRole = 'super-admin', allowedStudentIds = [], teacherId }) {
  const [query, setQuery] = useState(allowedStudentIds[0] || '');
  const [book, setBook] = useState(fallbackBook);
  const [studentId, setStudentId] = useState('');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scopedStudents = useMemo(() => {
    if (!book.length) return [];
    if (allowedStudentIds.length) {
      return book.filter((student) => allowedStudentIds.includes(student.id));
    }
    if (viewerRole === 'teacher' && teacherId) {
      return book.filter((student) => student.teacherId === teacherId);
    }
    if (viewerRole === 'parent' || viewerRole === 'student') {
      return book.slice(0, 1);
    }
    return book;
  }, [allowedStudentIds, book, teacherId, viewerRole]);

  useEffect(() => {
    const term = query.trim() || allowedStudentIds[0] || '';
    const timer = setTimeout(() => {
      if (!term) {
        setBook([]);
        setError('No data available');
        return;
      }
      fetchPerformance(term);
    }, 350);
    return () => clearTimeout(timer);
  }, [query, allowedStudentIds]);

  async function fetchPerformance(term) {
    setLoading(true);
    try {
      const { data } = await api.get('/performance', { params: { q: term, limit: 50 } });
      const normalized = (data || []).map((item) => ({
        id: item.studentId?._id || item.id,
        name: item.studentId?.fullName || item.name || 'Student',
        className: item.studentId?.className || item.className,
        guardianId: item.guardianId,
        teacherId: item.teacherId,
        months: item.months || item.monthlyScores || []
      })).filter((s) => s.id);
      setBook(normalized);
      setError(normalized.length ? '' : 'No data available');
      if (normalized.length) {
        setStudentId(normalized[0].id);
        const lastMonth = normalized[0].months?.[normalized[0].months.length - 1]?.month || '';
        setMonth(lastMonth);
      }
    } catch (err) {
      setBook([]);
      setError(err?.response?.data?.message || 'Unable to load performance');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!scopedStudents.length) return;
    if (!scopedStudents.find((s) => s.id === studentId)) {
      setStudentId(scopedStudents[0].id);
    }
    const lastMonth = scopedStudents[0].months?.[scopedStudents[0].months.length - 1]?.month;
    if (lastMonth) setMonth((prev) => prev || lastMonth);
  }, [scopedStudents, studentId]);

  const allMonths = useMemo(() => {
    const months = new Set();
    scopedStudents.forEach((student) => student.months?.forEach((m) => m.month && months.add(m.month)));
    return Array.from(months);
  }, [scopedStudents]);

  const subjects = useMemo(() => {
    const subjectSet = new Set();
    scopedStudents.forEach((student) => student.months?.forEach((m) => Object.keys(m.subjects || {}).forEach((s) => subjectSet.add(s))));
    return Array.from(subjectSet);
  }, [scopedStudents]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scopedStudents;
    return scopedStudents.filter((student) => student.id.toLowerCase().includes(q) || student.name.toLowerCase().includes(q));
  }, [query, scopedStudents]);

  const selectedStudent = useMemo(
    () => scopedStudents.find((student) => student.id === studentId) || scopedStudents[0],
    [scopedStudents, studentId]
  );

  const monthData = useMemo(
    () => selectedStudent?.months?.find((m) => m.month === month) || selectedStudent?.months?.[selectedStudent.months.length - 1],
    [month, selectedStudent]
  );

  const monthAverage = useMemo(() => (monthData ? avg(Object.values(monthData.subjects)) : 0), [monthData]);

  return (
    <div className="graph-wrap">
      <div className="graph-head">
        <p className="graph-note">
          Subject-wise marks trend by month. Same view is used for students, parents, teachers, admins and super admins.
        </p>
        <input
          className="student-select"
          placeholder="Search by Student ID or Name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="graph-note">Loading performance...</p>}
      {!loading && error && <p className="graph-note" style={{ color: '#c0392b' }}>{error}</p>}
      {!loading && !error && !scopedStudents.length && <p className="graph-note">No data available</p>}

      <div className="graph-meta">
        <span className="role-pill">Viewer: {viewerRole.replace('-', ' ')}</span>
        <span className="scope-pill">{scopedStudents.length} student(s) visible</span>
        {monthData ? <span className="scope-pill">{monthData.month} • Avg {monthAverage}%</span> : null}
      </div>

      <div className="search-results">
        {filteredStudents.length ? (
          filteredStudents.map((student) => (
            <button
              key={student.id}
              type="button"
              className={`result-chip ${student.id === selectedStudent?.id ? 'active' : ''}`}
              onClick={() => setStudentId(student.id)}
            >
              {student.id} · {student.name}
            </button>
          ))
        ) : (
          <p className="graph-note">No student found for this search.</p>
        )}
      </div>

      <div className="month-strip">
        {allMonths.map((m) => (
          <button key={m} className={`result-chip ${month === m ? 'active' : ''}`} onClick={() => setMonth(m)}>
            {m}
          </button>
        ))}
      </div>

      <div className="subject-grid">
        {subjects.map((subject) => {
          const series = selectedStudent?.months.map((m) => ({ month: m.month, value: m.subjects[subject] || 0 })) || [];
          const latest = series.find((point) => point.month === month) || series[series.length - 1];
          return (
            <div key={subject} className="subject-card">
              <div className="subject-head">
                <span>{subject}</span>
                <strong>{latest?.value ?? 0}%</strong>
              </div>
              <div className="subject-bars">
                {series.map((point) => (
                  <div key={point.month} className="mini-bar">
                    <div className="mini-track">
                      <div className="mini-fill" style={{ height: `${point.value}%` }} />
                    </div>
                    <small>{point.month.split(' ')[0]}</small>
                    <strong>{point.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {monthData ? (
        <div className="graph-foot">
          <div>
            <p className="graph-note">Monthly snapshot for {selectedStudent?.name}</p>
            <h4 style={{ margin: '4px 0' }}>{monthData.month} • Avg {monthAverage}%</h4>
            <p className="graph-note">Best subject: {Object.entries(monthData.subjects).sort((a, b) => b[1] - a[1])[0][0]}</p>
          </div>
          <div className="bar-chart mini">
            {Object.entries(monthData.subjects).map(([label, value]) => (
              <div key={label} className="bar-item">
                <div className="bar-track">
                  <div className="bar-fill" style={{ height: `${value}%` }} />
                </div>
                <strong>{value}%</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
