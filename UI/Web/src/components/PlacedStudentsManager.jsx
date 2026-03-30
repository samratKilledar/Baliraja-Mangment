import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const initialForm = {
  studentId: '',
  placedDate: '',
  name: '',
  age: '',
  mobileNo: '',
  address: '',
  batch: '',
  note: '',
  opinion: '',
  academicYear: ''
};

function sanitizeNumeric(value) {
  return String(value || '').replace(/\D+/g, '');
}

export default function PlacedStudentsManager() {
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [placedItems, setPlacedItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filteredStudents = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return students;
    return students.filter((s) => {
      const text = [
        s.userId?.fullName,
        s.userId?.phone,
        s.enrollmentNo,
        s.batchId?.batchName
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(query);
    });
  }, [q, students]);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: placedData }, { data: studentData }] = await Promise.all([
        api.get('/placed-students', { params: { page: 1, limit: 200 } }),
        api.get('/students', { params: { page: 1, limit: 200 } })
      ]);
      setPlacedItems(Array.isArray(placedData?.items) ? placedData.items : []);
      setStudents(Array.isArray(studentData?.items) ? studentData.items : []);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load placed student data');
      setPlacedItems([]);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openPrefilledForm(student) {
    const today = new Date();
    const year = today.getFullYear();
    const next = `${year}-${year + 1}`;
    setForm({
      studentId: student?._id || '',
      placedDate: '',
      name: student?.userId?.fullName || '',
      age: student?.age ? String(student.age) : '',
      mobileNo: sanitizeNumeric(student?.userId?.phone || ''),
      address: student?.address || '',
      batch: student?.batchId?.batchName || '',
      note: '',
      opinion: '',
      academicYear: student?.details?.education?.batchYear ? `${student.details.education.batchYear}` : next
    });
    setShowForm(true);
  }

  async function submitPlacedStudent(e) {
    e.preventDefault();
    if (!form.placedDate || !form.name.trim()) {
      setError('Placed date and name are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/placed-students', {
        studentId: form.studentId || undefined,
        placedDate: form.placedDate,
        name: form.name.trim(),
        age: form.age ? Number(form.age) : undefined,
        mobileNo: form.mobileNo,
        address: form.address,
        batch: form.batch,
        note: form.note,
        opinion: form.opinion,
        academicYear: form.academicYear
      });
      setForm(initialForm);
      setShowForm(false);
      setError('');
      await loadAll();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save placed student');
    } finally {
      setSaving(false);
    }
  }

  const showIndexStudents = filteredStudents.length > 10;
  const showIndexPlaced = placedItems.length > 10;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card" style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <h4 style={{ margin: 0 }}>Placed Student Form</h4>
          <button className="primary-btn" type="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Close Form' : 'Add Placed Student'}
          </button>
        </div>
        {showForm ? (
          <form onSubmit={submitPlacedStudent} style={{ marginTop: 10 }}>
            <div className="grid two spacious">
              <label>Placed Date<input type="date" value={form.placedDate} onChange={(e) => setForm({ ...form, placedDate: e.target.value })} /></label>
              <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label>Age<input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
              <label>Mobile No<input value={form.mobileNo} onChange={(e) => setForm({ ...form, mobileNo: sanitizeNumeric(e.target.value) })} /></label>
              <label>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
              <label>Batch<input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} /></label>
              <label>Academic Year<input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" /></label>
              <label>Opinion<input value={form.opinion} onChange={(e) => setForm({ ...form, opinion: e.target.value })} /></label>
              <label style={{ gridColumn: '1/-1' }}>Note<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            </div>
            <div style={{ marginTop: 10 }}>
              <button className="primary-btn" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Placed Student'}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Student List (Click + to Place)</h4>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search student"
            style={{ minWidth: 220 }}
          />
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data-table">
            <thead>
              <tr>
                {showIndexStudents ? <th>#</th> : null}
                <th>Student</th>
                <th>Enrollment</th>
                <th>Mobile</th>
                <th>Batch</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student, idx) => (
                <tr key={student._id}>
                  {showIndexStudents ? <td>{idx + 1}</td> : null}
                  <td>{student.userId?.fullName || '—'}</td>
                  <td>{student.enrollmentNo || '—'}</td>
                  <td>{student.userId?.phone || '—'}</td>
                  <td>{student.batchId?.batchName || '—'}</td>
                  <td>
                    <button className="ghost-btn" type="button" onClick={() => openPrefilledForm(student)}>+</button>
                  </td>
                </tr>
              ))}
              {!filteredStudents.length ? (
                <tr>
                  <td colSpan={showIndexStudents ? 6 : 5}>{loading ? 'Loading students...' : 'No students found.'}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Placed Student List</h4>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data-table">
            <thead>
              <tr>
                {showIndexPlaced ? <th>#</th> : null}
                <th>Placed Date</th>
                <th>Name</th>
                <th>Age</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Batch</th>
                <th>Academic Year</th>
                <th>Opinion</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {placedItems.map((item, idx) => (
                <tr key={item._id}>
                  {showIndexPlaced ? <td>{idx + 1}</td> : null}
                  <td>{item.placedDate ? new Date(item.placedDate).toLocaleDateString() : '—'}</td>
                  <td>{item.name || '—'}</td>
                  <td>{item.age ?? '—'}</td>
                  <td>{item.mobileNo || '—'}</td>
                  <td>{item.address || '—'}</td>
                  <td>{item.batch || '—'}</td>
                  <td>{item.academicYear || '—'}</td>
                  <td>{item.opinion || '—'}</td>
                  <td>{item.note || '—'}</td>
                </tr>
              ))}
              {!placedItems.length ? (
                <tr>
                  <td colSpan={showIndexPlaced ? 10 : 9}>{loading ? 'Loading placed students...' : 'No placed students added yet.'}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
