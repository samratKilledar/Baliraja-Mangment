import { useEffect, useState } from 'react';
import api from '../api/client';

export default function ComplaintCenter() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/complaints');
      setComplaints(data || []);
      const seed = {};
      (data || []).forEach((c) => {
        if (c.adminNote) seed[c._id] = c.adminNote;
      });
      setNotes(seed);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to fetch complaints');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id, status) {
    try {
      await api.put(`/complaints/${id}/status`, { status, adminNote: notes[id] ?? '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update complaint');
    }
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h4>Student Complaints</h4>
        {loading ? <span style={{ color:'#6c7595', fontSize:12 }}>Loading…</span> : null}
      </div>
      {error ? <p className="error">{error}</p> : null}
      {complaints.length ? (
        <div className="pill-list">
          {complaints.map((c) => (
            <div key={c._id} className="pill-row column">
              <div className="pill-line"><span>Student</span><strong>{c.studentId?.enrollmentNo || '—'}</strong></div>
              <div className="pill-line"><span>Phone</span><strong>{c.phone || c.userId?.phone || '—'}</strong></div>
              {c.subject ? <div className="pill-line"><span>Subject</span><strong>{c.subject}</strong></div> : null}
              <div className="pill-line"><span>Message</span><strong>{c.message}</strong></div>
              <div className="pill-line"><span>Status</span><strong>{c.status}</strong></div>
              <label style={{ display:'grid', gap:6, marginTop:4 }}>
                <span style={{ color:'#6c7595', fontSize:12 }}>Admin comment</span>
                <textarea
                  rows={2}
                  value={notes[c._id] ?? ''}
                  onChange={(e)=>setNotes({...notes, [c._id]: e.target.value})}
                  style={{ width:'100%', border:'1px solid #e6e9f3', borderRadius:8, padding:8, fontSize:13 }}
                />
              </label>
              {c.adminNote ? <div className="pill-line"><span>Last note</span><strong>{c.adminNote}</strong></div> : null}
              <div style={{ display:'flex', gap:8, marginTop:6 }}>
                <button className="ghost-btn" onClick={()=>updateStatus(c._id,'wip')}>Mark WIP</button>
                <button className="primary-btn" onClick={()=>updateStatus(c._id,'done')}>Mark Done</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ marginTop: 8 }}>No complaints.</p>
      )}
    </div>
  );
}
