import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const CLASS_OPTIONS = ['11th Std', '12th Std', 'Summer Camp'];
const STATUS_OPTIONS = [
  { value: 'present', label: 'Present', tone: 'green' },
  { value: 'absent', label: 'Absent', tone: 'red' },
  { value: 'late', label: 'Late', tone: 'amber' },
  { value: 'leave', label: 'Leave', tone: 'slate' }
];

function formatDateInput(value = new Date()) {
  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function toneStyles(tone, active) {
  if (tone === 'red') {
    return active
      ? { background: '#dc2626', color: '#fff', borderColor: '#dc2626' }
      : { background: '#fef2f2', color: '#b91c1c', borderColor: '#fecaca' };
  }
  if (tone === 'amber') {
    return active
      ? { background: '#d97706', color: '#fff', borderColor: '#d97706' }
      : { background: '#fff7ed', color: '#b45309', borderColor: '#fed7aa' };
  }
  if (tone === 'slate') {
    return active
      ? { background: '#475569', color: '#fff', borderColor: '#475569' }
      : { background: '#f8fafc', color: '#475569', borderColor: '#cbd5e1' };
  }
  return active
    ? { background: '#16a34a', color: '#fff', borderColor: '#16a34a' }
    : { background: '#f0fdf4', color: '#15803d', borderColor: '#bbf7d0' };
}

export default function AttendanceWorkspace({ role = 'admin' }) {
  const [subjects, setSubjects] = useState([]);
  const [dailyRows, setDailyRows] = useState([]);
  const [reportRows, setReportRows] = useState([]);
  const [date, setDate] = useState(formatDateInput());
  const [fromDate, setFromDate] = useState(formatDateInput(new Date(new Date().setDate(new Date().getDate() - 30))));
  const [toDate, setToDate] = useState(formatDateInput());
  const [currentClass, setCurrentClass] = useState('11th Std');
  const [teacherClassOptions, setTeacherClassOptions] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [savingKey, setSavingKey] = useState('');
  const [error, setError] = useState('');

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject._id === selectedSubjectId) || null,
    [selectedSubjectId, subjects]
  );

  const loadSubjects = useCallback(async () => {
    try {
      const { data } = await api.get('/subjects', { params: { currentClass } });
      const items = Array.isArray(data) ? data : [];
      setSubjects(items);
      setSelectedSubjectId((prev) => (
        prev && items.some((subject) => subject._id === prev)
          ? prev
          : (items[0]?._id || '')
      ));
    } catch (err) {
      setSubjects([]);
    }
  }, [currentClass]);

  const loadDaily = useCallback(async () => {
    setLoadingDaily(true);
    try {
      const params = {
        date,
        currentClass,
        subjectId: selectedSubject?._id,
        subjectName: selectedSubject?.name
      };
      if (role === 'teacher') {
        const { data } = await api.get('/attendance/teacher/roster', { params });
        const allowedClasses = Array.isArray(data?.availableClasses) ? data.availableClasses : [];
        setTeacherClassOptions(allowedClasses);
        if (allowedClasses.length && !allowedClasses.includes(currentClass)) {
          setCurrentClass(allowedClasses[0]);
        }
        const rows = (data?.batches || []).flatMap((batch) =>
          (batch.students || []).map((student) => ({
            ...student,
            batchId: batch.batchId,
            batchName: batch.batchName,
            capacity: batch.capacity,
            currentClass: batch.currentClass,
            division: batch.division
          }))
        );
        setDailyRows(rows);
      } else {
        const { data } = await api.get('/attendance/daily', { params });
        setDailyRows(Array.isArray(data) ? data : []);
      }
      setError('');
    } catch (err) {
      setDailyRows([]);
      setError(err?.response?.data?.message || 'Unable to load attendance');
    } finally {
      setLoadingDaily(false);
    }
  }, [currentClass, date, role, selectedSubject?._id, selectedSubject?.name]);

  const loadReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const { data } = await api.get('/attendance/report', {
        params: {
          fromDate,
          toDate,
          currentClass,
          subjectId: selectedSubject?._id,
          subjectName: selectedSubject?.name
        }
      });
      setReportRows(Array.isArray(data?.items) ? data.items : []);
      setError('');
    } catch (err) {
      setReportRows([]);
      setError(err?.response?.data?.message || 'Unable to load attendance report');
    } finally {
      setLoadingReport(false);
    }
  }, [currentClass, fromDate, selectedSubject?._id, selectedSubject?.name, toDate]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  useEffect(() => {
    loadDaily();
    loadReport();
  }, [loadDaily, loadReport]);

  async function markAttendance(student) {
    return async (status) => {
      setSavingKey(`${student.studentId}-${status}`);
      try {
        await api.post('/attendance', {
          studentId: student.studentId,
          batchId: student.batchId,
          currentClass: student.currentClass,
          division: student.division,
          date,
          status,
          subjectId: selectedSubject?._id,
          subjectName: selectedSubject?.name
        });
        await Promise.all([loadDaily(), loadReport()]);
      } catch (err) {
        alert(err?.response?.data?.message || 'Unable to update attendance');
      } finally {
        setSavingKey('');
      }
    };
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <section className="panel">
        <div className="panel-head">
          <h3>Take Attendance</h3>
        </div>
        <div className="attendance-toolbar">
          <label>
            <span>Class</span>
            <select value={currentClass} onChange={(e) => setCurrentClass(e.target.value)}>
              {(role === 'teacher' && teacherClassOptions.length ? teacherClassOptions : CLASS_OPTIONS).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Subject</span>
            <select value={selectedSubjectId} onChange={(e) => setSelectedSubjectId(e.target.value)}>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject._id}>{subject.name}</option>
              ))}
              {!subjects.length && <option value="">No subjects</option>}
            </select>
          </label>
          <label>
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button className="ghost-btn" onClick={loadDaily} disabled={loadingDaily}>
            {loadingDaily ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Enrollment</th>
                <th>Division</th>
                <th>Today</th>
                <th>Attendance Toggle</th>
              </tr>
            </thead>
            <tbody>
              {dailyRows.map((student) => (
                <tr key={student.studentId}>
                  <td>{student.studentName}</td>
                  <td>{student.enrollmentNo || '—'}</td>
                  <td>{student.division || student.batchName || '—'}</td>
                  <td style={{ textTransform: 'capitalize' }}>{student.attendance?.status || 'not marked'}</td>
                  <td>
                    <div className="attendance-toggle-row">
                      {STATUS_OPTIONS.map((option) => {
                        const active = student.attendance?.status === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className="attendance-toggle"
                            style={toneStyles(option.tone, active)}
                            disabled={savingKey === `${student.studentId}-${option.value}` || !selectedSubject}
                            onClick={() => markAttendance(student)(option.value)}
                          >
                            {savingKey === `${student.studentId}-${option.value}` ? '...' : option.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
              {!dailyRows.length && (
                <tr>
                  <td colSpan={5}>{loadingDaily ? 'Loading attendance...' : 'No students found for this class/subject.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Attendance Report</h3>
        </div>
        <div className="attendance-toolbar">
          <label>
            <span>From</span>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </label>
          <button className="ghost-btn" onClick={loadReport} disabled={loadingReport}>
            {loadingReport ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Division</th>
                <th>Total Lectures</th>
                <th>Present</th>
                <th>Late</th>
                <th>Absent</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {reportRows.map((row) => (
                <tr key={row.studentId}>
                  <td>{row.studentName}</td>
                  <td>{row.division || row.batchName || '—'}</td>
                  <td>{row.totalLectures}</td>
                  <td>{row.presentLectures}</td>
                  <td>{row.lateLectures}</td>
                  <td>{row.absentLectures}</td>
                  <td>{row.attendancePercentage}%</td>
                </tr>
              ))}
              {!reportRows.length && (
                <tr>
                  <td colSpan={7}>{loadingReport ? 'Building report...' : 'No report data in this date range.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
