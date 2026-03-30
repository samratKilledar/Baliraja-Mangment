import { useEffect, useState } from 'react';
import api from '../api/client';
import { resolveApiOrigin } from '../config/env';

const audienceOptions = [
  { key: 'student', label: 'Students' },
  { key: 'teacher', label: 'Teachers' },
  { key: 'parent', label: 'Parents' },
  { key: 'admin', label: 'Admins' },
  { key: 'super_admin', label: 'Super Admins' }
];

function resolveImage(url) {
  if (!url) return '';
  if (url.includes('/api/v1/uploads')) url = url.replace('/api/v1/uploads', '/uploads');
  const baseEnv = resolveApiOrigin() || api.defaults.baseURL || window.location.origin;
  const base = baseEnv.replace(/\/api\/v1$/, '');
  try {
    return new URL(url, base).toString();
  } catch {
    return url.startsWith('http') ? url : `${base}${url.startsWith('/') ? url : `/${url}`}`;
  }
}

export default function NoticeCenter() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState(['all']);
  const [file, setFile] = useState(null);
  const [notices, setNotices] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const showIndex = notices.length > 10;

  useEffect(() => {
    loadNotices();
  }, []);

  async function loadNotices() {
    try {
      const { data } = await api.get('/notices');
      setNotices(data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load notices');
    }
  }

  function toggleAudience(key) {
    setAudience((prev) => {
      if (key === 'all') return ['all'];
      const next = prev.filter((a) => a !== 'all');
      if (next.includes(key)) {
        const filtered = next.filter((a) => a !== key);
        return filtered.length ? filtered : ['all'];
      }
      return [...next, key];
    });
  }

  async function createNotice(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description);
      formData.append('publishedAt', date || new Date().toISOString());
      formData.append('audience', audience.length ? audience.join(',') : 'all');
      if (file) formData.append('file', file);

      await api.post('/notices', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setTitle('');
      setDescription('');
      setDate('');
      setAudience(['all']);
      setFile(null);
      setPreviewUrl('');
      loadNotices();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to create notice');
    } finally {
      setLoading(false);
    }
  }

  async function deleteNotice(id) {
    try {
      await api.delete(`/notices/${id}`);
      loadNotices();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete notice');
    }
  }

  return (
    <div className="notice-center">
      <form className="notice-form" onSubmit={createNotice} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{display:"grid",gap:10}}>
          <label><span>Notice Title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter notice title" /></label>
          <label><span>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details for the notice" rows={4} /></label>
          <label><span>Publish Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <div className="audience-group">
            <span>Audience</span>
            <div className="audience-grid">
              <label><input type="checkbox" checked={audience.includes('all')} onChange={() => toggleAudience('all')} /> All</label>
              {audienceOptions.map((opt) => (
                <label key={opt.key}>
                  <input
                    type="checkbox"
                    checked={audience.includes(opt.key)}
                    onChange={() => toggleAudience(opt.key)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"grid",gap:10}}>
          <label>
            <span>Upload Image / Video (max 10MB)</span>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => {
                const next = e.target.files?.[0] || null;
                setFile(next);
                setPreviewUrl(next ? URL.createObjectURL(next) : '');
              }}
            />
          </label>
          {file && file.type.startsWith('video/') && previewUrl && (
            <video src={previewUrl} controls style={{width:"100%", maxHeight:220, borderRadius:10, border:"1px solid #e4e8f3"}} />
          )}
          {file && file.type.startsWith('image/') && previewUrl && (
            <img alt="preview" src={previewUrl} style={{width:"100%", maxHeight:200, objectFit:"cover", borderRadius:10, border:"1px solid #e4e8f3"}} />
          )}
          {error && <p className="error">{error}</p>}
          <button type="submit" className="primary-btn" disabled={loading}>{loading ? 'Saving...' : 'Create Notice'}</button>
        </div>
      </form>

      <div style={sliderStyles.wrap}>
            {notices.map((notice) => (
              <div key={notice._id} style={sliderStyles.card}>
                {notice.videoUrl ? (
                  <video
                    src={resolveImage(notice.videoUrl)}
                    controls
                    style={sliderStyles.img}
                  />
                ) : notice.imageUrl ? (
                  <img src={resolveImage(notice.imageUrl)} alt={notice.title} style={sliderStyles.img} />
                ) : null}
                <div style={{flex:1}}>
                  <p style={sliderStyles.date}>{new Date(notice.publishedAt).toLocaleDateString()}</p>
                  <h4 style={sliderStyles.title}>{notice.title}</h4>
                  <p style={sliderStyles.desc}>{notice.description}</p>
                  <span className="chip">{Array.isArray(notice.audience) ? notice.audience.join(', ') : notice.audience}</span>
                  <div style={{marginTop:8}}><button className="ghost-btn" onClick={() => deleteNotice(notice._id)}>Delete</button></div>
                </div>
              </div>
            ))}
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {showIndex ? <th>#</th> : null}
              <th>Title</th>
              <th>Audience</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notices.map((notice, idx) => (
              <tr key={notice._id}>
                {showIndex ? <td>{idx + 1}</td> : null}
                <td>{notice.title}</td>
                <td>{Array.isArray(notice.audience) ? notice.audience.join(', ') : notice.audience}</td>
                <td>{new Date(notice.publishedAt).toLocaleDateString()}</td>
                <td>
                  <span style={{marginRight:8}}>{notice.videoUrl ? 'Video' : notice.imageUrl ? 'Image' : '—'}</span>
                  <button className="ghost-btn" onClick={() => deleteNotice(notice._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const sliderStyles = {
  wrap: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto',
    padding: '8px 2px',
    marginBottom: 12
  },
  card: {
    minWidth: '90vw',
    maxWidth: '90vw',
    background: '#fff',
    border: '1px solid #e4e8f3',
    borderRadius: 14,
    padding: 12,
    boxShadow: '0 6px 12px rgba(0,0,0,0.06)',
    display: 'flex',
    gap: 12,
    alignItems: 'center'
  },
  img: { width: '35vw', height: '35vw', maxWidth: 320, maxHeight: 320, objectFit: 'contain', borderRadius: 12 },
  date: { margin: 0, fontSize: 12, color: '#637093' },
  title: { margin: '2px 0', fontSize: 15 },
  desc: { margin: 0, fontSize: 12, color: '#4a5a7a' }
};
