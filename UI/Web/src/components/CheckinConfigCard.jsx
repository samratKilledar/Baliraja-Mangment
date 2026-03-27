import { useEffect, useState } from 'react';
import api from '../api/client';

const EMPTY_CONFIG = {
  lat: '',
  lng: '',
  radius: '',
  checkInTime: '',
  checkOutTime: '',
  windowMinutes: ''
};

export default function CheckinConfigCard() {
  const [lat, setLat] = useState(EMPTY_CONFIG.lat);
  const [lng, setLng] = useState(EMPTY_CONFIG.lng);
  const [radius, setRadius] = useState(EMPTY_CONFIG.radius);
  const [checkInTime, setCheckInTime] = useState(EMPTY_CONFIG.checkInTime);
  const [checkOutTime, setCheckOutTime] = useState(EMPTY_CONFIG.checkOutTime);
  const [windowMinutes, setWindowMinutes] = useState(EMPTY_CONFIG.windowMinutes);
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
        setRadius(data.radiusMeters ?? '');
        setCheckInTime(data.checkInTime || '');
        setCheckOutTime(data.checkOutTime || '');
        setWindowMinutes(data.windowMinutes ?? '');
      } else {
        resetForm();
      }
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load config');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setLat(EMPTY_CONFIG.lat);
    setLng(EMPTY_CONFIG.lng);
    setRadius(EMPTY_CONFIG.radius);
    setCheckInTime(EMPTY_CONFIG.checkInTime);
    setCheckOutTime(EMPTY_CONFIG.checkOutTime);
    setWindowMinutes(EMPTY_CONFIG.windowMinutes);
  }

  async function save() {
    try {
      setLoading(true);
      await api.post('/attendance/checkin-config', {
        lat: lat === '' ? null : Number(lat),
        lng: lng === '' ? null : Number(lng),
        radiusMeters: radius === '' ? null : Number(radius),
        checkInTime: checkInTime || undefined,
        checkOutTime: checkOutTime || undefined,
        windowMinutes: windowMinutes === '' ? null : Number(windowMinutes)
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

  async function resetConfig() {
    try {
      setLoading(true);
      await api.post('/attendance/checkin-config', {
        lat: null,
        lng: null,
        radiusMeters: null,
        checkInTime: undefined,
        checkOutTime: undefined,
        windowMinutes: null
      });
      resetForm();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to reset config');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="panel analytics-panel analytics-geofence-panel">
      <div className="panel-head">
        <h3>Check-In Geofence</h3>
        <span style={{ color: '#5e688f', fontSize: 12 }}>{loading ? 'Syncing…' : ''}</span>
      </div>
      <p className="auth-subtitle">Set the allowed location, radius and optional time windows (students only) for check-in/out.</p>
      {error ? <p className="error">{error}</p> : null}
      <div className="analytics-scroll-area">
      <div className="analytics-geofence-grid">
        <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" type="number" step="0.000001" />
        <input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" type="number" step="0.000001" />
        <input value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="Radius meters" type="number" />
        <input value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} placeholder="Check-in time (HH:MM)" type="time" />
        <input value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} placeholder="Check-out time (HH:MM)" type="time" />
        <input value={windowMinutes} onChange={(e) => setWindowMinutes(e.target.value)} placeholder="Window minutes" type="number" />
      </div>
      </div>
      <div className="analytics-geofence-actions">
        <button className="primary-btn" onClick={save} disabled={loading}>Save</button>
        <button className="ghost-btn" onClick={resetConfig} disabled={loading}>Reset</button>
        <button className="ghost-btn" onClick={loadConfig} disabled={loading}>Reload</button>
        {saved && <span style={{ color: '#0f7d49', fontWeight: 700 }}>Saved</span>}
      </div>
    </article>
  );
}
