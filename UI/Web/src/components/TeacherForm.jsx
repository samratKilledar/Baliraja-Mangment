import { useState } from 'react';
import api from '../api/client';

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

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
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
        monthlySalary: form.monthlySalary ? Number(form.monthlySalary) : undefined,
        contractStart: form.contractStart || undefined,
        contractEnd: form.contractEnd || undefined
      };

      await api.post('/users', payload);
      alert('Teacher saved to database.');
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
          <label><span>Mobile No</span><input value={form.mobileNo} onChange={(e) => setField('mobileNo', e.target.value)} /></label>
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
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save Teacher'}
        </button>
      </div>
    </form>
  );
}
