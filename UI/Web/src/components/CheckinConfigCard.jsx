import { useEffect, useState } from 'react';
import api from '../api/client';

export default function CheckinConfigCard() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(500);
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [windowMinutes, setWindowMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const { data } = await api.get('/attendance/checkin-config');
      if (data) {
        setLat(String(data.lat ?? ''));
        setLng(String(data.lng ?? ''));
        setRadius(data.radiusMeters || 500);
        setCheckInTime(data.checkInTime || '');
        setCheckOutTime(data.checkOutTime || '');
        setWindowMinutes(data.windowMinutes || 30);
      }
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load config');
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!lat || !lng) {
      setError('Latitude and longitude required');
      return;
    }
    try {
      setLoading(true);
      await api.post('/attendance/checkin-config', {
        lat: Number(lat),
        lng: Number(lng),
        radiusMeters: Number(radius) || 500,
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
        windowMinutes: Number(windowMinutes) || 30
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save config');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <h3>Check-In Geofence</h3>
        <span style={{ color: '#5e688f', fontSize: 12 }}>{loading ? 'Syncing…' : ''}</span>
      </div>
      <p className="auth-subtitle">Set the allowed location, radius and optional time windows (students only) for check-in/out.</p>
      {error ? <p className="error">{error}</p> : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8 }}>
        <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" type="number" step="0.000001" />
        <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" type="number" step="0.000001" />
        <input value={radius} onChange={(e) => setRadius(Number(e.target.value) || 500)} placeholder="Radius meters" type="number" />
        <input value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} placeholder="Check-in time (HH:MM)" type="time" />
        <input value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} placeholder="Check-out time (HH:MM)" type="time" />
        <input value={windowMinutes} onChange={(e) => setWindowMinutes(Number(e.target.value) || 30)} placeholder="Window minutes" type="number" />
      </div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <button className="primary-btn" onClick={save} disabled={loading}>Save</button>
        <button className="ghost-btn" onClick={loadConfig} disabled={loading}>Reload</button>
        {saved && <span style={{ color: '#0f7d49', fontWeight: 700 }}>Saved</span>}
      </div>
    </article>
  );
}
