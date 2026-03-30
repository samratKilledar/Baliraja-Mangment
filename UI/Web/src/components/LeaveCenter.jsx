import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

export default function LeaveCenter() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLeaves();
  }, []);

  async function loadLeaves() {
    try {
      setLoading(true);
      const { data } = await api.get('/attendance/leaves');
      setLeaves(data || []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to fetch leaves');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/attendance/leave/${id}/status`, { status });
      await loadLeaves();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update leave');
    }
  }

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      const statusOk = statusFilter === 'all' ? true : l.leaveStatus === statusFilter;
      const user = l.studentId?.userId || l.userId;
      const hay = [
        l.studentId?.enrollmentNo,
        user?.fullName,
        user?.phone,
        l.leaveReason
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const searchOk = hay.includes(search.trim().toLowerCase());
      return statusOk && searchOk;
    });
  }, [leaves, statusFilter, search]);
  const showIndex = filteredLeaves.length > 10;

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <h4 style={{ margin:0 }}>Leave Approvals</h4>
          {loading ? <span style={{ color:'#6c7595', fontSize:12 }}>Loading…</span> : null}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name/enrollment/phone"
            style={inputStyle}
          />
          <select value={statusFilter} onChange={(e)=>setStatusFilter(e.target.value)} style={inputStyle}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button className="ghost-btn" onClick={loadLeaves} disabled={loading}>Refresh</button>
        </div>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {filteredLeaves.length ? (
        <div className="data-table-wrap" style={{ marginTop: 10 }}>
          <table className="data-table">
            <thead>
              <tr>
                {showIndex ? <th>#</th> : null}
                <th>Role</th>
                <th>Enrollment</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Type</th>
                <th>From</th>
                <th>To</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.map((l, idx) => {
                const statusColor =
                  l.leaveStatus === 'approved'
                    ? '#0f7d49'
                    : l.leaveStatus === 'rejected'
                      ? '#c0392b'
                      : '#c27b20';
                const rowBg =
                  l.leaveStatus === 'approved'
                    ? '#e5f7e9'
                    : l.leaveStatus === 'rejected'
                      ? '#ffecec'
                      : '#fffbea';
                const fromDate = l.leaveFrom ? new Date(l.leaveFrom) : null;
                const toDate = l.leaveTo ? new Date(l.leaveTo) : null;
                const dayCount = fromDate && toDate ? Math.round((toDate - fromDate) / (1000*60*60*24)) + 1 : 1;
                const user = l.studentId?.userId || l.userId;
                const role = l.studentId ? 'Student' : (user?.role || 'Teacher');
                  return (
                  <tr key={l._id} style={{ background: rowBg }}>
                    {showIndex ? <td>{idx + 1}</td> : null}
                    <td>{role}</td>
                    <td>{l.studentId?.enrollmentNo || '—'}</td>
                    <td>{user?.fullName || '—'}</td>
                    <td>{user?.phone || '—'}</td>
                    <td>{l.leaveType || 'full_day'}</td>
                    <td>{fromDate ? fromDate.toLocaleDateString() : '—'}</td>
                    <td>{toDate ? toDate.toLocaleDateString() : '—'}</td>
                    <td>{dayCount}</td>
                    <td style={{ maxWidth: 240, whiteSpace:'normal' }}>{l.leaveReason || '—'}</td>
                    <td><span style={{ color: statusColor, fontWeight: 700 }}>{(l.leaveStatus || '').toUpperCase()}</span></td>
                    <td style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                      <button className="ghost-btn" onClick={()=>updateStatus(l._id,'approved')}>Approve</button>
                      <button className="danger-btn" onClick={()=>updateStatus(l._id,'rejected')}>Reject</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ marginTop: 8 }}>No leave requests.</p>
      )}
    </div>
  );
}

const inputStyle = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #d5d9e4',
  background: '#f8f9fb',
  minWidth: 180
};
