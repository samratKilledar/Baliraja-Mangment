import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import VectorIcon from './VectorIcon';
import api from '../api/client';

const CLASS_OPTIONS = ['11th Std', '12th Std'];

const initialForm = {
  admissionNo: '',
  admissionDate: '',
  firstName: '',
  middleName: '',
  lastName: '',
  dob: '',
  age: '',
  gender: '',
  status: 'active',
  bloodGroup: '',
  aadhaarNo: '',
  mobileNo: '',
  email: '',
  previousSchool: '',
  currentClass: '',
  division: '',
  board: '',
  medium: '',
  passingYear: '',
  percentage: '',
  tenthSchoolName: '',
  tenthBoard: '',
  tenthPassingYear: '',
  tenthPercentage: '',
  tenthMarks: '',
  eleventhSchoolName: '',
  eleventhBoard: '',
  eleventhPassingYear: '',
  eleventhPercentage: '',
  eleventhMarks: '',
  twelfthSchoolName: '',
  twelfthBoard: '',
  twelfthPassingYear: '',
  twelfthPercentage: '',
  twelfthMarks: '',
  height: '',
  weight: '',
  vision: '',
  disability: '',
  allergy: '',
  fatherName: '',
  fatherJob: '',
  fatherMobile: '',
  motherName: '',
  motherJob: '',
  motherMobile: '',
  guardianName: '',
  guardianRelation: '',
  guardianMobile: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  district: '',
  state: '',
  pinCode: '',
  feeAmount: '',
  feeFrom: '',
  feeTo: '',
  batchId: ''
};

function sanitizeNumeric(value) {
  return String(value || '').replace(/\D+/g, '');
}

function calculateAge(value) {
  if (!value) return '';
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthGap = today.getMonth() - dob.getMonth();
  if (monthGap < 0 || (monthGap === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? String(age) : '';
}

export default function StudentAdmissionForm({ editId = null, onSaved }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fee, setFee] = useState(null);
  const [payments, setPayments] = useState([]);
  const [payForm, setPayForm] = useState({ amount: '', mode: 'cash', transactionRef: '', note: '' });
  const [loading, setLoading] = useState(false);
  const [geoStatus, setGeoStatus] = useState('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [batches, setBatches] = useState([]);
  const [feeReason, setFeeReason] = useState('');
  const { user } = useAuth() || {};

  useEffect(() => {
    loadBatches();
    if (editId) {
      loadExisting(editId);
    }
  }, [editId]);

  async function loadBatches() {
    try {
      const { data } = await api.get('/courses/batches');
      setBatches(data || []);
      if (!editId && !form.batchId && Array.isArray(data) && data.length) {
        const currentYear = new Date().getFullYear();
        const preferred =
          data.find((b) => b.startDate && new Date(b.startDate).getFullYear() === currentYear) ||
          data[0];
        if (preferred?._id) {
          setForm((prev) => ({ ...prev, batchId: preferred._id }));
        }
      }
    } catch {
      setBatches([]);
    }
  }

  async function loadExisting(id) {
    setLoading(true);
    try {
      const [{ data: student }, feeRes] = await Promise.all([
        api.get(`/students/${id}`),
        api.get(`/fees/student/${id}`).catch(() => null)
      ]);
      const st = student;
      const d = st.details || {};
      setForm({
        ...initialForm,
        admissionNo: st.enrollmentNo || '',
        admissionDate: st.admissionDate ? st.admissionDate.substring(0,10) : '',
        firstName: st.userId?.fullName?.split(' ')[0] || '',
        middleName: d.personal?.middleName || d.middleName || '',
        lastName: d.personal?.lastName || d.lastName || st.userId?.fullName?.split(' ').slice(1).join(' ') || '',
        dob: st.dateOfBirth ? st.dateOfBirth.substring(0, 10) : '',
        age: st.age ? String(st.age) : calculateAge(st.dateOfBirth),
        gender: d.personal?.gender || st.gender || '',
        bloodGroup: d.personal?.bloodGroup || '',
        aadhaarNo: d.personal?.aadhaarNo || '',
        mobileNo: sanitizeNumeric(st.userId?.phone || ''),
        email: st.userId?.email || '',
        status: st.status || 'active',
        previousSchool: d.education?.previousSchool || '',
        currentClass: d.education?.currentClass || '',
        division: d.education?.division || '',
        board: d.education?.board || '',
        medium: d.education?.medium || '',
        passingYear: d.education?.passingYear || '',
        percentage: d.education?.percentage || '',
        tenthSchoolName: d.education?.academicHistory?.tenth?.schoolName || '',
        tenthBoard: d.education?.academicHistory?.tenth?.board || '',
        tenthPassingYear: d.education?.academicHistory?.tenth?.passingYear || '',
        tenthPercentage: d.education?.academicHistory?.tenth?.percentage || '',
        tenthMarks: d.education?.academicHistory?.tenth?.marks || '',
        eleventhSchoolName: d.education?.academicHistory?.eleventh?.schoolName || '',
        eleventhBoard: d.education?.academicHistory?.eleventh?.board || '',
        eleventhPassingYear: d.education?.academicHistory?.eleventh?.passingYear || '',
        eleventhPercentage: d.education?.academicHistory?.eleventh?.percentage || '',
        eleventhMarks: d.education?.academicHistory?.eleventh?.marks || '',
        twelfthSchoolName: d.education?.academicHistory?.twelfth?.schoolName || '',
        twelfthBoard: d.education?.academicHistory?.twelfth?.board || '',
        twelfthPassingYear: d.education?.academicHistory?.twelfth?.passingYear || '',
        twelfthPercentage: d.education?.academicHistory?.twelfth?.percentage || '',
        twelfthMarks: d.education?.academicHistory?.twelfth?.marks || '',
        height: d.physical?.height || '',
        weight: d.physical?.weight || '',
        vision: d.physical?.vision || '',
        disability: d.physical?.disability || '',
        allergy: d.physical?.allergy || '',
        fatherName: d.parent?.fatherName || '',
        fatherJob: d.parent?.fatherJob || '',
        fatherMobile: sanitizeNumeric(d.parent?.fatherMobile || ''),
        motherName: d.parent?.motherName || '',
        motherJob: d.parent?.motherJob || '',
        motherMobile: sanitizeNumeric(d.parent?.motherMobile || ''),
        guardianName: d.parent?.guardianName || '',
        guardianRelation: d.parent?.guardianRelation || '',
        guardianMobile: sanitizeNumeric(d.parent?.guardianMobile || ''),
        addressLine1: d.address?.addressLine1 || st.address || '',
        addressLine2: d.address?.addressLine2 || '',
        city: d.address?.city || '',
        district: d.address?.district || '',
        state: d.address?.state || '',
        pinCode: d.address?.pinCode || '',
        feeAmount: feeRes?.data?.totalAmount || '',
        feeFrom: feeRes?.data?.feeStartDate?.substring?.(0, 10) || '',
        feeTo: feeRes?.data?.feeEndDate?.substring?.(0, 10) || '',
        batchId: st.batchId || ''
      });
      if (feeRes?.data) {
        setFee(feeRes.data);
        setPayments(feeRes.data.transactions || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load student');
    } finally {
      setLoading(false);
    }
  }

  function setField(key, value) {
    const nextValue = ['mobileNo', 'fatherMobile', 'motherMobile', 'guardianMobile', 'pinCode'].includes(key)
      ? sanitizeNumeric(value)
      : value;
    setForm((prev) => {
      const next = { ...prev, [key]: nextValue };
      if (key === 'dob') {
        next.age = calculateAge(nextValue);
      }
      return next;
    });
  }

  function detectAddressFromLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoStatus('Geolocation not supported in this browser');
      return;
    }
    setGeoLoading(true);
    setGeoStatus('Detecting location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const { data } = await api.get('/students/reverse-geocode', { params: { lat: latitude, lon: longitude } });
          const addr = data?.address || {};
          setForm((prev) => ({
            ...prev,
            addressLine1: addr.addressLine1 || prev.addressLine1,
            addressLine2: addr.addressLine2 || prev.addressLine2,
            city: addr.city || prev.city,
            district: addr.district || prev.district,
            state: addr.state || prev.state,
            pinCode: addr.pinCode || prev.pinCode
          }));
          setGeoStatus(addr.displayName ? `Detected: ${addr.displayName}` : `Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}`);
        } catch (err) {
          setGeoStatus(err?.response?.data?.message || 'Unable to resolve address');
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoStatus(err?.message || 'Location permission denied');
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const currentYear = new Date().getFullYear();
    const fallbackBatchId = form.batchId || (() => {
      const yearBatch = batches.find((b) => b.startDate && new Date(b.startDate).getFullYear() === currentYear);
      return (yearBatch || batches[0])?._id;
    })();
    try {
    const payload = {
      fullName: [form.firstName, form.middleName, form.lastName].filter(Boolean).join(' ').trim() || 'Student',
      email: form.email,
      phone: form.mobileNo,
      role: 'student',
      enrollmentNo: editId ? form.admissionNo : undefined,
        admissionDate: form.admissionDate || form.feeFrom || undefined,
        dateOfBirth: form.dob,
        gender: form.gender,
        status: form.status,
        age: form.age ? Number(form.age) : undefined,
        address: [form.addressLine1, form.addressLine2, form.city, form.state, form.pinCode].filter(Boolean).join(', '),
        emergencyContact: form.guardianMobile || form.fatherMobile || form.motherMobile,
        details: form,
      feeAmount: ['super_admin', 'admin'].includes(user?.role) && form.feeAmount ? Number(form.feeAmount) : undefined,
      feeDueDate: form.feeTo || undefined,
      feeFrom: form.feeFrom || undefined,
      feeTo: form.feeTo || undefined,
      feeStartDate: form.feeFrom || undefined,
      feeEndDate: form.feeTo || undefined,
      batchId: fallbackBatchId || undefined
    };

      if (editId) {
        await api.put(`/students/${editId}`, payload);
        if (fee) {
          await api.put(`/fees/${fee._id}`, {
            totalAmount: ['super_admin', 'admin'].includes(user?.role) && form.feeAmount ? Number(form.feeAmount) : undefined,
            feeStartDate: form.feeFrom || fee.feeStartDate,
            feeEndDate: form.feeTo || fee.feeEndDate,
            dueDate: form.feeTo || fee.dueDate,
            reason: feeReason.trim() || 'Updated from student master form'
          });
        }
      } else {
        await api.post('/users', payload);
      }

      alert(editId ? 'Student updated.' : 'Student saved to database.');
      setForm(initialForm);
      setFee(null);
      setPayments([]);
      setFeeReason('');
      onSaved && onSaved();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Unable to save student';
      setError(msg);
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  const isSeniorSecondary = ['11th Std', '12th Std'].includes(form.currentClass);
  const isTwelfthAdmission = form.currentClass === '12th Std';

  return (
    <form className="student-form" onSubmit={onSubmit}>
      <div className="form-head">
        <h3>Student Master Form {editId ? '(Edit)' : ''}</h3>
        <p>Personal, education, physical and parent details</p>
      </div>
      {loading && <p>Loading student...</p>}

      <section className="form-section">
        <h4><VectorIcon name="users" size={16} /> Personal Info</h4>
        <div className="form-grid">
          <label><span>Admission No</span><input value={form.admissionNo || 'Auto-generated on save'} disabled readOnly /></label>
          <label><span>Admission Date</span><input type="date" value={form.admissionDate} onChange={(e)=>setField('admissionDate', e.target.value)} /></label>
          <label><span>Batch (Academic Year {new Date().getFullYear()})</span>
            <select value={form.batchId} onChange={(e)=>setField('batchId', e.target.value)}>
              <option value="">Select batch</option>
              {batches.map((b)=>{
                const yr = b.startDate ? new Date(b.startDate).getFullYear() : new Date().getFullYear();
                return (
                  <option key={b._id} value={b._id}>
                    {b.batchName} · {yr}{b.courseId?.name ? ` · ${b.courseId.name}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
          <label><span>First Name</span><input value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} /></label>
          <label><span>Middle Name</span><input value={form.middleName} onChange={(e) => setField('middleName', e.target.value)} /></label>
          <label><span>Last Name</span><input value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} /></label>
          <label><span>Status</span>
            <select value={form.status} onChange={(e)=>setField('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label><span>Date of Birth</span><input type="date" value={form.dob} onChange={(e) => setField('dob', e.target.value)} /></label>
          <label><span>Age</span><input value={form.age} readOnly disabled /></label>
          <label><span>Gender</span>
            <select value={form.gender} onChange={(e) => setField('gender', e.target.value)}>
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label><span>Blood Group</span><input value={form.bloodGroup} onChange={(e) => setField('bloodGroup', e.target.value)} /></label>
          <label><span>Aadhaar No</span><input value={form.aadhaarNo} onChange={(e) => setField('aadhaarNo', e.target.value)} /></label>
          <label><span>Mobile No</span><input inputMode="numeric" pattern="[0-9]*" value={form.mobileNo} onChange={(e) => setField('mobileNo', e.target.value)} /></label>
          <label><span>Email</span><input value={form.email} onChange={(e) => setField('email', e.target.value)} /></label>
        </div>
      </section>

      <section className="form-section">
        <h4><VectorIcon name="chart" size={16} /> Education Info</h4>
        <div className="form-grid">
          <label><span>Previous School</span><input value={form.previousSchool} onChange={(e) => setField('previousSchool', e.target.value)} /></label>
          <label><span>Current Class</span>
            <select value={form.currentClass} onChange={(e) => setField('currentClass', e.target.value)}>
              <option value="">Select Class</option>
              {CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label><span>Division</span><input value={form.division} onChange={(e) => setField('division', e.target.value.toUpperCase())} placeholder="A / B / Science / Commerce" /></label>
          <label><span>Board</span><input value={form.board} onChange={(e) => setField('board', e.target.value)} /></label>
          <label><span>Medium</span><input value={form.medium} onChange={(e) => setField('medium', e.target.value)} /></label>
          <label><span>Passing Year</span><input value={form.passingYear} onChange={(e) => setField('passingYear', e.target.value)} /></label>
          <label><span>Percentage / Grade</span><input value={form.percentage} onChange={(e) => setField('percentage', e.target.value)} /></label>
        </div>
        {isSeniorSecondary && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <h5 style={{ gridColumn: '1 / -1', marginBottom: 0 }}>Previous Marks To Store In Database</h5>
            <label><span>10th School Name</span><input value={form.tenthSchoolName} onChange={(e) => setField('tenthSchoolName', e.target.value)} /></label>
            <label><span>10th Board</span><input value={form.tenthBoard} onChange={(e) => setField('tenthBoard', e.target.value)} /></label>
            <label><span>10th Passing Year</span><input value={form.tenthPassingYear} onChange={(e) => setField('tenthPassingYear', e.target.value)} /></label>
            <label><span>10th Percentage</span><input value={form.tenthPercentage} onChange={(e) => setField('tenthPercentage', e.target.value)} /></label>
            <label><span>10th Marks</span><input value={form.tenthMarks} onChange={(e) => setField('tenthMarks', e.target.value)} /></label>

            {isTwelfthAdmission && (
              <>
                <label><span>11th School / College</span><input value={form.eleventhSchoolName} onChange={(e) => setField('eleventhSchoolName', e.target.value)} /></label>
                <label><span>11th Board</span><input value={form.eleventhBoard} onChange={(e) => setField('eleventhBoard', e.target.value)} /></label>
                <label><span>11th Passing Year</span><input value={form.eleventhPassingYear} onChange={(e) => setField('eleventhPassingYear', e.target.value)} /></label>
                <label><span>11th Percentage</span><input value={form.eleventhPercentage} onChange={(e) => setField('eleventhPercentage', e.target.value)} /></label>
                <label><span>11th Marks</span><input value={form.eleventhMarks} onChange={(e) => setField('eleventhMarks', e.target.value)} /></label>

                <label><span>12th School / College</span><input value={form.twelfthSchoolName} onChange={(e) => setField('twelfthSchoolName', e.target.value)} /></label>
                <label><span>12th Board</span><input value={form.twelfthBoard} onChange={(e) => setField('twelfthBoard', e.target.value)} /></label>
                <label><span>12th Passing Year</span><input value={form.twelfthPassingYear} onChange={(e) => setField('twelfthPassingYear', e.target.value)} /></label>
                <label><span>12th Percentage</span><input value={form.twelfthPercentage} onChange={(e) => setField('twelfthPercentage', e.target.value)} /></label>
                <label><span>12th Marks</span><input value={form.twelfthMarks} onChange={(e) => setField('twelfthMarks', e.target.value)} /></label>
              </>
            )}
          </div>
        )}
      </section>

      <section className="form-section">
        <h4><VectorIcon name="star" size={16} /> Physical & Medical Info</h4>
        <div className="form-grid">
          <label><span>Height (cm)</span><input value={form.height} onChange={(e) => setField('height', e.target.value)} /></label>
          <label><span>Weight (kg)</span><input value={form.weight} onChange={(e) => setField('weight', e.target.value)} /></label>
          <label><span>Vision</span><input value={form.vision} onChange={(e) => setField('vision', e.target.value)} /></label>
          <label><span>Disability</span><input value={form.disability} onChange={(e) => setField('disability', e.target.value)} /></label>
          <label className="full"><span>Allergies / Medical Notes</span><input value={form.allergy} onChange={(e) => setField('allergy', e.target.value)} /></label>
        </div>
      </section>

      <section className="form-section">
        <h4><VectorIcon name="users" size={16} /> Parent / Guardian Details</h4>
        <div className="form-grid">
          <label><span>Father Name</span><input value={form.fatherName} onChange={(e) => setField('fatherName', e.target.value)} /></label>
          <label><span>Father Job</span><input value={form.fatherJob} onChange={(e) => setField('fatherJob', e.target.value)} /></label>
          <label><span>Father Mobile</span><input inputMode="numeric" pattern="[0-9]*" value={form.fatherMobile} onChange={(e) => setField('fatherMobile', e.target.value)} /></label>
          <label><span>Mother Name</span><input value={form.motherName} onChange={(e) => setField('motherName', e.target.value)} /></label>
          <label><span>Mother Job</span><input value={form.motherJob} onChange={(e) => setField('motherJob', e.target.value)} /></label>
          <label><span>Mother Mobile</span><input inputMode="numeric" pattern="[0-9]*" value={form.motherMobile} onChange={(e) => setField('motherMobile', e.target.value)} /></label>
          <label><span>Guardian Name</span><input value={form.guardianName} onChange={(e) => setField('guardianName', e.target.value)} /></label>
          <label><span>Relation</span><input value={form.guardianRelation} onChange={(e) => setField('guardianRelation', e.target.value)} /></label>
          <label><span>Guardian Mobile</span><input inputMode="numeric" pattern="[0-9]*" value={form.guardianMobile} onChange={(e) => setField('guardianMobile', e.target.value)} /></label>
        </div>
      </section>

      <section className="form-section">
        <h4><VectorIcon name="calendar" size={16} /> Address Details</h4>
        <div className="form-grid">
          <label className="full"><span>Address Line 1</span><input value={form.addressLine1} onChange={(e) => setField('addressLine1', e.target.value)} /></label>
          <label className="full"><span>Address Line 2</span><input value={form.addressLine2} onChange={(e) => setField('addressLine2', e.target.value)} /></label>
          <label><span>City / Village</span><input value={form.city} onChange={(e) => setField('city', e.target.value)} /></label>
          <label><span>District</span><input value={form.district} onChange={(e) => setField('district', e.target.value)} /></label>
          <label><span>State</span><input value={form.state} onChange={(e) => setField('state', e.target.value)} /></label>
          <label><span>PIN Code</span><input inputMode="numeric" pattern="[0-9]*" value={form.pinCode} onChange={(e) => setField('pinCode', e.target.value)} /></label>
          <div className="full" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button type="button" className="ghost-btn" onClick={detectAddressFromLocation} disabled={geoLoading}>
              {geoLoading ? 'Detecting location…' : 'Use Current Location'}
            </button>
            {geoStatus && <span style={{ fontSize: 12, color: '#4a4a4a' }}>{geoStatus}</span>}
          </div>
        </div>
      </section>

      <section className="form-section">
        <h4><VectorIcon name="money" size={16} /> Fees</h4>
        <div className="form-grid">
          <label><span>Final Fees Amount</span><input type="number" value={form.feeAmount} onChange={(e) => setField('feeAmount', e.target.value)} disabled={!['super_admin', 'admin'].includes(user?.role)} /></label>
          <label><span>Fee From Date</span><input type="date" value={form.feeFrom} onChange={(e) => setField('feeFrom', e.target.value)} /></label>
          <label><span>Fee To Date</span><input type="date" value={form.feeTo} onChange={(e) => setField('feeTo', e.target.value)} /></label>
          {fee && ['super_admin', 'admin'].includes(user?.role) ? (
            <label><span>Fee Update Reason</span><input value={feeReason} onChange={(e) => setFeeReason(e.target.value)} placeholder="Reason for fee update" /></label>
          ) : null}
          {fee && (
            <>
              <label><span>Paid</span><input disabled value={fee.paidAmount || 0} /></label>
              <label><span>Remaining</span><input disabled value={fee.dueAmount || 0} /></label>
            </>
          )}
        </div>
        {fee && (
          <div className="form-grid">
            <h5 style={{ gridColumn: '1 / -1', marginTop: 8 }}>Add Payment</h5>
            <label><span>Amount</span><input type="number" value={payForm.amount} onChange={(e)=>setPayForm({...payForm, amount: e.target.value})} /></label>
            <label><span>Mode</span>
              <select value={payForm.mode} onChange={(e)=>setPayForm({...payForm, mode:e.target.value})}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </label>
            <label><span>Reference</span><input value={payForm.transactionRef} onChange={(e)=>setPayForm({...payForm, transactionRef:e.target.value})} /></label>
            <label><span>Note</span><input value={payForm.note} onChange={(e)=>setPayForm({...payForm, note:e.target.value})} /></label>
            <div style={{ gridColumn: '1 / -1' }}>
              <button type="button" className="primary-btn" onClick={async ()=>{
                if (!fee?._id) return;
                try{
                  await api.post(`/fees/${fee._id}/payments`, {
                    amount: Number(payForm.amount),
                    mode: payForm.mode,
                    transactionRef: payForm.transactionRef,
                    note: payForm.note
                  });
                  await loadExisting(editId);
                  setPayForm({ amount:'', mode:'cash', transactionRef:'', note:'' });
                }catch(err){
                  setError(err?.response?.data?.message || 'Unable to add payment');
                }
              }}>Add Payment</button>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <h5>Payments</h5>
              {payments.length ? (
                <table className="data-table">
                  <thead>
                    <tr><th>Date</th><th>Amount</th><th>Mode</th><th>Ref</th><th>Note</th></tr>
                  </thead>
                  <tbody>
                    {payments.map((p, idx)=>(
                      <tr key={idx}>
                        <td>{new Date(p.paidOn).toLocaleDateString()}</td>
                        <td>₹{p.amount}</td>
                        <td>{p.mode}</td>
                        <td>{p.transactionRef || '—'}</td>
                        <td>{p.note || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p>No payments yet.</p>}
            </div>
          </div>
        )}
      </section>

      <div className="form-submit">
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Save Student Details'}
        </button>
      </div>
    </form>
  );
}
