import { useState } from 'react';
import api from '../api/client';
import VectorIcon from './VectorIcon';

const initialForm = {
  fullName: '',
  mobileNo: '',
  email: '',
  subjectName: '',
  qualification: '',
  totalExperience: '',
  monthlySalary: '',
  joiningDate: '',
  address: '',
  contractStart: '',
  contractEnd: '',
  totalContractAmount: ''
};

export default function TeacherForm() {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdPassword, setCreatedPassword] = useState('');
  const [showCreatedPassword, setShowCreatedPassword] = useState(false);

  function setField(key, value) {
    const nextValue = key === 'mobileNo' ? String(value || '').replace(/\D+/g, '') : value;
    setForm((prev) => ({ ...prev, [key]: nextValue }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setCreatedPassword('');
    setShowCreatedPassword(false);
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: form.mobileNo,
        role: 'teacher',
        specialization: form.subjectName ? [form.subjectName] : [],
        experienceYears: form.totalExperience ? Number(form.totalExperience) : undefined,
        details: form,
        contractStart: form.contractStart || undefined,
        contractEnd: form.contractEnd || undefined,
        totalContractAmount: form.totalContractAmount ? Number(form.totalContractAmount) : undefined,
        monthlySalary: form.monthlySalary ? Number(form.monthlySalary) : undefined
      };

      const { data } = await api.post('/users', payload);
      const nextPassword = data?.tempPassword || '123456';
      setCreatedPassword(nextPassword);
      alert(`Teacher saved to database. Default password: ${nextPassword}`);
      setForm(initialForm);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save teacher');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="student-form" onSubmit={onSubmit}>
      <div className="form-head">
        <h3>Add Teacher</h3>
        <p>Capture subject, salary, experience and profile details</p>
      </div>

      <section className="form-section">
        <h4>Teacher Details</h4>
        <div className="form-grid">
          <label><span>Full Name</span><input value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} /></label>
          <label><span>Mobile No</span><input inputMode="numeric" pattern="[0-9]*" value={form.mobileNo} onChange={(e) => setField('mobileNo', e.target.value)} /></label>
          <label><span>Email</span><input value={form.email} onChange={(e) => setField('email', e.target.value)} /></label>
          <label><span>Subject Name</span><input value={form.subjectName} onChange={(e) => setField('subjectName', e.target.value)} /></label>
          <label><span>Qualification</span><input value={form.qualification} onChange={(e) => setField('qualification', e.target.value)} /></label>
          <label><span>Total Experience (Years)</span><input value={form.totalExperience} onChange={(e) => setField('totalExperience', e.target.value)} /></label>
          <label><span>Monthly Salary</span><input type="number" value={form.monthlySalary} onChange={(e) => setField('monthlySalary', e.target.value)} /></label>
          <label><span>Joining Date</span><input type="date" value={form.joiningDate} onChange={(e) => setField('joiningDate', e.target.value)} /></label>
          <label><span>Contract Start</span><input type="date" value={form.contractStart} onChange={(e) => setField('contractStart', e.target.value)} /></label>
          <label><span>Contract End</span><input type="date" value={form.contractEnd} onChange={(e) => setField('contractEnd', e.target.value)} /></label>
          <label><span>Total Contract Amount</span><input type="number" value={form.totalContractAmount} onChange={(e) => setField('totalContractAmount', e.target.value)} /></label>
          <label className="full"><span>Address</span><input value={form.address} onChange={(e) => setField('address', e.target.value)} /></label>
        </div>
      </section>

      <div className="form-submit">
        {error && <p className="error">{error}</p>}
        {createdPassword ? (
          <div
            style={{
              marginBottom: 12,
              border: '1px solid var(--line)',
              background: 'rgba(126, 105, 165, 0.08)',
              borderRadius: 10,
              padding: 10
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Default Teacher Password</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' }}>
              <strong style={{ color: 'var(--text-primary)', letterSpacing: 0.3 }}>
                {showCreatedPassword ? createdPassword : '******'}
              </strong>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setShowCreatedPassword((prev) => !prev)}
                title={showCreatedPassword ? 'Hide password' : 'Show password'}
                style={{ marginTop: 0, width: 'auto', padding: '7px 10px', display: 'inline-flex', alignItems: 'center' }}
              >
                <VectorIcon name={showCreatedPassword ? 'eyeOff' : 'eye'} size={14} />
              </button>
            </div>
            <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-secondary)' }}>
              Teacher will be asked to change password after first login.
            </div>
          </div>
        ) : null}
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save Teacher'}
        </button>
      </div>
    </form>
  );
}
