import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const CLASS_OPTIONS = ['11th Std', '12th Std', 'Summer Camp'];

function formatDateInput(value = new Date()) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function statusTone(status) {
  if (status === 'present') return { bg: '#eefbf4', color: '#0f7d49' };
  if (status === 'absent') return { bg: '#fff0f0', color: '#b42318' };
  if (status === 'late') return { bg: '#fff8eb', color: '#a16207' };
  if (status === 'leave') return { bg: '#f3f4f6', color: '#475569' };
  return { bg: '#f8fafc', color: '#6b7280' };
}

export default function DivisionAttendanceBoard() {
  const [date, setDate] = useState(formatDateInput());
  const [currentClass, setCurrentClass] = useState('11th Std');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadDaily = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/attendance/daily', {
        params: { date, currentClass }
      });
      setRows(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setRows([]);
      setError(err?.response?.data?.message || 'Unable to load division attendance');
    } finally {
      setLoading(false);
    }
  }, [currentClass, date]);

  useEffect(() => {
    loadDaily();
  }, [loadDaily]);

  const grouped = useMemo(() => {
    const bucket = new Map();
    rows.forEach((row) => {
      const division = row.division || row.batchName || 'Unassigned';
      if (!bucket.has(division)) {
        bucket.set(division, []);
      }
      bucket.get(division).push(row);
    });
    return Array.from(bucket.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <section className="panel">
        <div className="panel-head">
          <h3>Division Wise Student Attendance</h3>
        </div>
        <div className="attendance-toolbar">
          <label>
            <span>Class</span>
            <select value={currentClass} onChange={(e) => setCurrentClass(e.target.value)}>
              {CLASS_OPTIONS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button className="ghost-btn" onClick={loadDaily} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </section>

      {grouped.map(([division, students]) => (
        <section key={division} className="panel">
          <div className="panel-head">
            <h3>Division {division}</h3>
            <small style={{ color: '#6b7280', fontWeight: 700 }}>{students.length} students</small>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Enrollment</th>
                  <th>Mobile</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => {
                  const status = student.attendance?.status || 'not marked';
                  const tone = statusTone(status);
                  return (
                    <tr key={student.studentId}>
                      <td>{student.studentName}</td>
                      <td>{student.enrollmentNo || '—'}</td>
                      <td>{student.mobileNo || '—'}</td>
                      <td>
                        <span
                          style={{
                            textTransform: 'capitalize',
                            padding: '4px 10px',
                            borderRadius: 999,
                            background: tone.bg,
                            color: tone.color,
                            fontWeight: 700
                          }}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {!grouped.length && !loading ? (
        <section className="panel">
          <p className="graph-note">No students found for this class/date.</p>
        </section>
      ) : null}
    </div>
  );
}
