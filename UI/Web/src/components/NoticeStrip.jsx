import { useEffect, useState } from 'react';
import api from '../api/client';
import { resolveApiBaseUrl } from '../config/env';

function getApiBase() {
  const configured = api.defaults.baseURL || resolveApiBaseUrl() || '';
  const fallback = window?.location?.origin || '';
  const candidate = configured || fallback;
  try {
    const u = new URL(candidate);
    u.pathname = u.pathname.replace(/\/api\/v1\/?$/, '');
    return u.toString().replace(/\/$/, '');
  } catch {
    return fallback;
  }
}

function resolveMedia(url) {
  if (!url) return '';
  let clean = url;
  if (clean.includes('/api/v1/uploads')) clean = clean.replace('/api/v1/uploads', '/uploads');
  const base = getApiBase();
  try {
    return new URL(clean, base).toString();
  } catch {
    return clean.startsWith('http') ? clean : `${base}${clean.startsWith('/') ? clean : `/${clean}`}`;
  }
}

export default function NoticeStrip() {
  const [notices, setNotices] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await api.get('/notices');
      setNotices(data);
    } catch (err) {
      console.error('Unable to load notices', err);
    }
  }

  if (!notices.length) return null;

  return (
    <div style={styles.strip}>
      {notices.map((n) => (
        <div key={n._id} style={styles.card}>
          {n.videoUrl ? (
            <video
              src={resolveMedia(n.videoUrl)}
              style={styles.img}
              controls
              preload="metadata"
              playsInline
            />
          ) : n.imageUrl ? (
            <img src={resolveMedia(n.imageUrl)} alt={n.title} style={styles.img} />
          ) : null}
          <div>
            <div style={styles.title}>{n.title}</div>
            <div style={styles.desc}>{n.description}</div>
            <div style={styles.date}>{new Date(n.publishedAt).toLocaleDateString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
const styles = {
  strip:{
    display:"flex",
    overflowX:"auto",
    gap:16,
    padding:"12px 6px",
    marginBottom:16,
    scrollSnapType:"x mandatory"
  },

  card:{
    minWidth:"80vw",
    maxWidth:"90vw",
    background:"#fff",
    border:"1px solid #e4e8f3",
    borderRadius:14,
    padding:14,
    display:"flex",
    gap:14,
    boxShadow:"0 10px 24px rgba(0,0,0,0.08)",
    scrollSnapAlign:"start",
    alignItems:"center"
  },

  img:{
    width:"40%",
    height:"320px",
    objectFit:"cover",
    borderRadius:12,
    flexShrink:0
  },

  title:{ fontWeight:700, fontSize:14 },

  desc:{
    fontSize:12,
    color:"#606f90",
    marginTop:4,
    marginBottom:6
  },

  date:{
    fontSize:11,
    color:"#8a94ad"
  }
};
