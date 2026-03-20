import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

function normalizeUrl(url) {
  if (!url) return '';
  let clean = url;
  if (clean.includes('/api/v1/uploads')) clean = clean.replace('/api/v1/uploads', '/uploads');
  const base = (import.meta.env.VITE_API_URL || api.defaults.baseURL || '').replace(/\/api\/v1$/, '');
  if (clean.startsWith('http')) return clean;
  return `${base}${clean.startsWith('/') ? clean : `/${clean}`}`;
}

export default function SplashManager() {
  const [current, setCurrent] = useState('');
  const [currentVideo, setCurrentVideo] = useState('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const previewUrl = useMemo(() => preview || (current ? normalizeUrl(current) : ''), [preview, current]);
  const previewVideo = useMemo(() => (preview && file?.type?.startsWith('video/') ? preview : ''), [preview, file]);

  useEffect(() => {
    let revokeUrl;
    if (file) {
      const next = URL.createObjectURL(file);
      setPreview(next);
      revokeUrl = next;
    } else {
      setPreview('');
    }
    return () => {
      if (revokeUrl) URL.revokeObjectURL(revokeUrl);
    };
  }, [file]);

  useEffect(() => {
    loadCurrent();
  }, []);

  async function loadCurrent() {
    try {
      const { data } = await api.get('/branding/splash');
      setCurrent(data?.imageUrl || '');
      setCurrentVideo(data?.videoUrl || '');
      setUpdatedAt(data?.updatedAt || '');
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to fetch current splash image');
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setError('Please choose an image');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/branding/splash', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFile(null);
      setMessage('Splash screen updated for all Android users');
      loadCurrent();
    } catch (err) {
      setError(err?.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  async function resetSplash() {
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.delete('/branding/splash');
      setCurrent('');
      setCurrentVideo('');
      setUpdatedAt('');
      setMessage('Splash reset to default gradient');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to reset splash');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel" style={{ gap: 12 }}>
      <div className="panel-head">
        <div>
          <h3>Android Splash Screen</h3>
          <p className="auth-subtitle" style={{ marginTop: 4 }}>
            Upload a single splash image (admin & super admin). Recommended 1080×1920, PNG/JPG under 1 MB.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <form onSubmit={handleUpload} className="form-grid">
          <label>
            <span>Choose Image or 4s Video</span>
            <input
              type="file"
              accept="image/*,video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file && <small style={{ color: '#4a5a7a' }}>Selected: {file.name}</small>}
            <small style={{ color: '#6b7280' }}>Keep video ≤6 seconds for fast load.</small>
          </label>
          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Upload & Publish'}
          </button>
          <button type="button" className="ghost-btn" onClick={resetSplash} disabled={loading}>
            Reset to Gradient Default
          </button>
          {error && <p className="error">{error}</p>}
          {message && <p className="success">{message}</p>}
        </form>

          <div className="preview-card">
          <p style={{ margin: '0 0 8px', color: '#4a5a7a' }}>Live Preview</p>
          <div style={{ border: '1px dashed #cbd2e1', borderRadius: 12, padding: 10, background: '#f8fafc' }}>
            <div
              style={{
                width: '100%',
                aspectRatio: 9 / 16,
                background: previewVideo
                  ? '#000'
                  : previewUrl
                    ? `url(${previewUrl}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #dbeafe, #e0e7ff)',
                borderRadius: 12,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {previewVideo ? (
                <video
                  src={previewVideo}
                  controls
                  autoPlay
                  muted
                  loop
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : null}
              {!previewVideo && !previewUrl && (
                <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#e2e8f0', fontWeight: 600 }}>
                  Default Gradient
                </div>
              )}
            </div>
          </div>
          {updatedAt && (
            <p style={{ marginTop: 8, fontSize: 12, color: '#4a5a7a' }}>
              Last published: {new Date(updatedAt).toLocaleString()}
            </p>
          )}
          {currentVideo && !previewVideo && (
            <p style={{ marginTop: 4, fontSize: 12, color: '#4a5a7a' }}>Current mode: Video splash</p>
          )}
        </div>
      </div>
    </div>
  );
}
