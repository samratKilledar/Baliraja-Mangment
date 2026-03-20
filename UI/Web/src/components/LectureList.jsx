import { useEffect, useState } from 'react';
import api from '../api/client';
import VectorIcon from './VectorIcon';

export default function LectureList({ days = 365, pageSize = 200 }) {
  const [records, setRecords] = useState([]);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    load(true);
  }, []);

  useEffect(() => {
    if (error) {
      setToast(error);
      const t = setTimeout(() => setToast(''), 3500);
      return () => clearTimeout(t);
    }
  }, [error]);

  async function load(reset = false) {
    setLoading(true);
    try {
      const nextSkip = reset ? 0 : skip;
      const { data } = await api.get('/teachers/lectures/recent', { params: { limit: pageSize, skip: nextSkip, days } });
      setRecords((prev) => (reset ? data : [...prev, ...data]));
      setSkip(nextSkip + pageSize);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load lectures');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="table-wrap" style={{ marginTop: 12 }}>
      {toast ? (
        <div
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            background: '#1f3ca8',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 10,
            boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
            zIndex: 1000,
            maxWidth: 320
          }}
        >
          {toast}
        </div>
      ) : null}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Teacher</th>
              <th>Subject</th>
              <th>Time</th>
              <th>Students</th>
              <th>Hours</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {records.map((rec) => {
              const start = rec.startTime ? new Date(rec.startTime) : null;
              const end = rec.endTime ? new Date(rec.endTime) : null;
              const derivedHours = rec.hours ?? (start && end ? (end - start) / 3600000 : null);
              return (
                <tr key={`${rec.teacherId}-${rec.date}-${rec.subject}-${rec.startTime || ''}`}>
                  <td>{rec.date ? new Date(rec.date).toLocaleDateString() : '—'}</td>
                  <td>{rec.teacherName || '—'}<br /><small>{rec.phone || ''}</small></td>
                  <td>{rec.subject || '—'}</td>
                  <td>
                    {start ? start.toLocaleTimeString() : '—'} - {end ? end.toLocaleTimeString() : '—'}
                  </td>
                  <td>{rec.studentCount ?? rec.count ?? 0}</td>
                  <td>{derivedHours || derivedHours === 0 ? derivedHours.toFixed(1) : '—'}</td>
                  <td>{rec.note || '—'}</td>
                </tr>
              );
            })}
            {!records.length && !loading ? (
              <tr><td colSpan={7}>No lectures found.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button className="ghost-btn" onClick={() => load(true)} disabled={loading}>
          <VectorIcon name="refresh" size={14} /> Refresh
        </button>
        <button className="ghost-btn" onClick={() => load(false)} disabled={loading}>
          <VectorIcon name="download" size={14} /> {loading ? 'Loading...' : 'Load more'}
        </button>
      </div>
    </div>
  );
}
