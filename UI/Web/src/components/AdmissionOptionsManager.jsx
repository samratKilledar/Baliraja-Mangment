import { useEffect, useState } from 'react';
import api from '../api/client';
import VectorIcon from './VectorIcon';

const FALLBACK_ADMISSION_TYPES = ['11th', '12th', 'Police', 'Army', 'Summer Camp'];
const FALLBACK_ACADEMIC_STAGES = ['11th Std', '12th Std', 'Police Batch', 'Army Batch', 'Summer Camp'];

function uniqueClean(list = []) {
  return Array.from(new Set((list || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

export default function AdmissionOptionsManager() {
  const [admissionTypes, setAdmissionTypes] = useState(FALLBACK_ADMISSION_TYPES);
  const [academicStages, setAcademicStages] = useState(FALLBACK_ACADEMIC_STAGES);
  const [newAdmissionType, setNewAdmissionType] = useState('');
  const [newAcademicStage, setNewAcademicStage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    setLoading(true);
    try {
      const { data } = await api.get('/admission-options');
      setAdmissionTypes(uniqueClean(data?.admissionTypes).length ? uniqueClean(data?.admissionTypes) : FALLBACK_ADMISSION_TYPES);
      setAcademicStages(uniqueClean(data?.academicStages).length ? uniqueClean(data?.academicStages) : FALLBACK_ACADEMIC_STAGES);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load admission options');
    } finally {
      setLoading(false);
    }
  }

  function addItem(type) {
    if (type === 'admission') {
      const next = newAdmissionType.trim();
      if (!next) return;
      setAdmissionTypes((prev) => uniqueClean([...prev, next]));
      setNewAdmissionType('');
      return;
    }

    const next = newAcademicStage.trim();
    if (!next) return;
    setAcademicStages((prev) => uniqueClean([...prev, next]));
    setNewAcademicStage('');
  }

  function deleteItem(type, value) {
    if (type === 'admission') {
      setAdmissionTypes((prev) => prev.filter((item) => item !== value));
      return;
    }
    setAcademicStages((prev) => prev.filter((item) => item !== value));
  }

  async function saveOptions() {
    const nextAdmissionTypes = uniqueClean(admissionTypes);
    const nextAcademicStages = uniqueClean(academicStages);

    if (!nextAdmissionTypes.length || !nextAcademicStages.length) {
      setError('Both lists require at least one option.');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.put('/admission-options', {
        admissionTypes: nextAdmissionTypes,
        academicStages: nextAcademicStages
      });
      setMessage('Admission options saved successfully.');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save admission options');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="panel">
      <div className="panel-head">
        <h3>Admission Options Setup</h3>
        <VectorIcon name="spark" size={18} />
      </div>
      <p className="auth-subtitle" style={{ marginTop: 0 }}>
        Manage Admission Type and Academic Stage / Class used in Student Master Form.
      </p>
      {loading ? <p className="graph-note">Loading options...</p> : null}
      <div className="form-grid">
        <div className="form-section">
          <h4>Admission Type</h4>
          <div className="pill-list">
            {admissionTypes.map((item) => (
              <div key={item} className="pill-line">
                <span>{item}</span>
                <button type="button" className="ghost-btn" onClick={() => deleteItem('admission', item)}>Delete</button>
              </div>
            ))}
          </div>
          <div className="analytics-password-box" style={{ marginTop: 10 }}>
            <input
              value={newAdmissionType}
              placeholder="Add Admission Type"
              onChange={(e) => setNewAdmissionType(e.target.value)}
            />
            <button type="button" className="primary-btn" onClick={() => addItem('admission')}>Add</button>
          </div>
        </div>

        <div className="form-section">
          <h4>Academic Stage / Class</h4>
          <div className="pill-list">
            {academicStages.map((item) => (
              <div key={item} className="pill-line">
                <span>{item}</span>
                <button type="button" className="ghost-btn" onClick={() => deleteItem('stage', item)}>Delete</button>
              </div>
            ))}
          </div>
          <div className="analytics-password-box" style={{ marginTop: 10 }}>
            <input
              value={newAcademicStage}
              placeholder="Add Academic Stage / Class"
              onChange={(e) => setNewAcademicStage(e.target.value)}
            />
            <button type="button" className="primary-btn" onClick={() => addItem('stage')}>Add</button>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
        <button type="button" className="primary-btn" onClick={saveOptions} disabled={saving}>
          {saving ? 'Saving...' : 'Save Admission Options'}
        </button>
        <button type="button" className="ghost-btn" onClick={loadOptions} disabled={saving}>
          Reload
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="success">{message}</p> : null}
    </article>
  );
}
