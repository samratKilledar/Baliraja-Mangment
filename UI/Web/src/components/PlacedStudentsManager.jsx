import { useEffect, useState } from 'react';
import api from '../api/client';

const initialForm = {
  studentId: '',
  enrollmentNo: '',
  placedDate: '',
  name: '',
  age: '',
  mobileNo: '',
  address: '',
  batch: '',
  placementType: '',
  note: '',
  opinion: '',
  academicYear: ''
};

function sanitizeNumeric(value) {
  return String(value || '').replace(/\D+/g, '');
}

const PAGE_SIZE = 10;
const PLACED_SEARCH_MENUS = [
  { value: 'name', label: 'Name' },
  { value: 'enrollmentNo', label: 'Enrollment ID' },
  { value: 'mobileNo', label: 'Mobile' },
  { value: 'batch', label: 'Batch' },
  { value: 'academicYear', label: 'Academic Year' },
  { value: 'placementType', label: 'Placement Type' },
  { value: 'opinion', label: 'Opinion' },
  { value: 'note', label: 'Note' }
];

export default function PlacedStudentsManager() {
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [editingPlacedId, setEditingPlacedId] = useState('');
  const [placedItems, setPlacedItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [placedPage, setPlacedPage] = useState(1);
  const [placedMeta, setPlacedMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [studentPage, setStudentPage] = useState(1);
  const [studentMeta, setStudentMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [q, setQ] = useState('');
  const [placedSearchField, setPlacedSearchField] = useState('name');
  const [placedSearchValue, setPlacedSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadPlaced(page = 1) {
    setLoading(true);
    try {
      const [{ data: placedData }] = await Promise.all([
        api.get('/placed-students', {
          params: {
            page,
            limit: PAGE_SIZE,
            field: placedSearchField || undefined,
            q: placedSearchValue.trim() || undefined
          }
        })
      ]);
      setPlacedItems(Array.isArray(placedData?.items) ? placedData.items : []);
      setPlacedMeta(placedData?.meta || { page, totalPages: 1, total: 0 });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load placed student data');
      setPlacedItems([]);
      setPlacedMeta({ page: 1, totalPages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPlaced(placedPage);
  }, [placedPage, placedSearchField, placedSearchValue]);

  async function loadStudents(term, page = 1) {
    setStudentLoading(true);
    try {
      const { data } = await api.get('/students', { params: { q: term, page, limit: PAGE_SIZE } });
      setStudents(Array.isArray(data?.items) ? data.items : []);
      setStudentMeta(data?.meta || { page, totalPages: 1, total: 0 });
      setError('');
    } catch (err) {
      setStudents([]);
      setStudentMeta({ page: 1, totalPages: 1, total: 0 });
      setError(err?.response?.data?.message || 'Unable to search students');
    } finally {
      setStudentLoading(false);
    }
  }

  useEffect(() => {
    const term = q.trim();
    const timer = setTimeout(async () => {
      if (term.length < 2) {
        setStudents([]);
        setStudentMeta({ page: 1, totalPages: 1, total: 0 });
        setStudentPage(1);
        return;
      }
      setStudentPage(1);
      await loadStudents(term, 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    loadStudents(term, studentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentPage]);

  function openPrefilledForm(student) {
    const today = new Date();
    const year = today.getFullYear();
    const next = `${year}-${year + 1}`;
    setForm({
      studentId: student?._id || '',
      enrollmentNo: student?.enrollmentNo || '',
      placedDate: '',
      name: student?.userId?.fullName || '',
      age: student?.age ? String(student.age) : '',
      mobileNo: sanitizeNumeric(student?.userId?.phone || ''),
      address: student?.address || '',
      batch: student?.batchId?.batchName || '',
      placementType: '',
      note: '',
      opinion: '',
      academicYear: student?.details?.education?.batchYear ? `${student.details.education.batchYear}` : next
    });
    setEditingPlacedId('');
    setShowForm(true);
  }

  function startEditPlaced(item) {
    setForm({
      studentId: item.studentId?._id || item.studentId || '',
      enrollmentNo: item.enrollmentNo || item.studentId?.enrollmentNo || '',
      placedDate: item.placedDate ? new Date(item.placedDate).toISOString().slice(0, 10) : '',
      name: item.name || '',
      age: item.age ? String(item.age) : '',
      mobileNo: sanitizeNumeric(item.mobileNo || ''),
      address: item.address || '',
      batch: item.batch || '',
      placementType: item.placementType || '',
      note: item.note || '',
      opinion: item.opinion || '',
      academicYear: item.academicYear || ''
    });
    setEditingPlacedId(item._id || '');
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
      const payload = {
        studentId: form.studentId || undefined,
        enrollmentNo: form.enrollmentNo || undefined,
        placedDate: form.placedDate,
        name: form.name.trim(),
        age: form.age ? Number(form.age) : undefined,
        mobileNo: form.mobileNo,
        address: form.address,
        batch: form.batch,
        placementType: form.placementType,
        note: form.note,
        opinion: form.opinion,
        academicYear: form.academicYear
      };
      if (editingPlacedId) {
        await api.put(`/placed-students/${editingPlacedId}`, payload);
      } else {
        await api.post('/placed-students', payload);
      }
      setForm(initialForm);
      setShowForm(false);
      setEditingPlacedId('');
      setError('');
      await loadPlaced(placedPage);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save placed student');
    } finally {
      setSaving(false);
    }
  }

  async function quickAddPlacedStudent(student) {
    if (!student?._id) return;
    const today = new Date();
    const year = today.getFullYear();
    const next = `${year}-${year + 1}`;
    setSaving(true);
    try {
      await api.post('/placed-students', {
        studentId: student._id,
        enrollmentNo: student.enrollmentNo || undefined,
        placedDate: today.toISOString().slice(0, 10),
        name: student.userId?.fullName || 'Student',
        age: student.age ? Number(student.age) : undefined,
        mobileNo: sanitizeNumeric(student.userId?.phone || ''),
        address: student.address || '',
        batch: student.batchId?.batchName || '',
        placementType: '',
        academicYear: student?.details?.education?.batchYear ? `${student.details.education.batchYear}` : next,
        note: '',
        opinion: ''
      });
      await loadPlaced(1);
      setPlacedPage(1);
      setQ('');
      setStudents([]);
      setStudentMeta({ page: 1, totalPages: 1, total: 0 });
      setEditingPlacedId('');
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to add placed student');
    } finally {
      setSaving(false);
    }
  }

  async function deletePlacedStudentRow(item) {
    if (!item?._id) return;
    const ok = window.confirm(`Are you sure you want to delete placed student "${item.name || 'record'}"?`);
    if (!ok) return;
    setSaving(true);
    try {
      await api.delete(`/placed-students/${item._id}`);
      if (editingPlacedId === item._id) {
        setEditingPlacedId('');
        setForm(initialForm);
      }
      await loadPlaced(placedPage);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete placed student');
    } finally {
      setSaving(false);
    }
  }

  const showIndexStudents = studentMeta.total > PAGE_SIZE;
  const showIndexPlaced = placedMeta.total > PAGE_SIZE;

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="card" style={{ marginTop: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
          <button className="primary-btn" type="button" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? 'Close Form' : 'Add Placed Student'}
          </button>
        </div>
        {showForm ? (
          <form onSubmit={submitPlacedStudent} style={{ marginTop: 14, display: 'grid', gap: 12 }}>
            <div className="grid two spacious">
              <label style={{ display: 'grid', gap: 6 }}>Placed Date<input type="date" value={form.placedDate} onChange={(e) => setForm({ ...form, placedDate: e.target.value })} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Enrollment ID<input value={form.enrollmentNo} onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Age<input type="number" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Mobile No<input value={form.mobileNo} onChange={(e) => setForm({ ...form, mobileNo: sanitizeNumeric(e.target.value) })} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Address<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Batch<input value={form.batch} onChange={(e) => setForm({ ...form, batch: e.target.value })} /></label>
              <label style={{ display: 'grid', gap: 6 }}>Placement Type<input value={form.placementType} onChange={(e) => setForm({ ...form, placementType: e.target.value })} placeholder="Job / College / Course / Internship" /></label>
              <label style={{ display: 'grid', gap: 6 }}>Academic Year<input value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2025-2026" /></label>
              <label style={{ display: 'grid', gap: 6 }}>Opinion<input value={form.opinion} onChange={(e) => setForm({ ...form, opinion: e.target.value })} /></label>
              <label style={{ gridColumn: '1/-1', display: 'grid', gap: 6 }}>Note<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
            </div>
            <div style={{ marginTop: 4 }}>
              <button className="primary-btn" type="submit" disabled={saving}>
                {saving ? 'Saving...' : (editingPlacedId ? 'Update Placed Student' : 'Save Placed Student')}
              </button>
              {editingPlacedId ? (
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => {
                    setEditingPlacedId('');
                    setForm(initialForm);
                  }}
                  style={{ marginLeft: 8, width: 'auto', marginTop: 0 }}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
          </form>
        ) : null}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type name or enrollment ID"
            style={{ minWidth: 220 }}
          />
        </div>
        {q.trim().length < 2 ? (
          <p style={{ marginTop: 10, color: '#4b5774' }}>Enter at least 2 characters to display student list.</p>
        ) : (
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
                {students.map((student, idx) => (
                  <tr key={student._id}>
                    {showIndexStudents ? <td>{(studentMeta.page - 1) * PAGE_SIZE + idx + 1}</td> : null}
                    <td>{student.userId?.fullName || '—'}</td>
                    <td>{student.enrollmentNo || '—'}</td>
                    <td>{student.userId?.phone || '—'}</td>
                    <td>{student.batchId?.batchName || '—'}</td>
                    <td>
                      <button
                        className="primary-btn"
                        type="button"
                        onClick={() => quickAddPlacedStudent(student)}
                        disabled={saving}
                        style={{ marginTop: 0, width: 'auto', padding: '6px 10px' }}
                      >
                        Add
                      </button>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={() => openPrefilledForm(student)}
                        style={{ marginTop: 0, width: 'auto', padding: '6px 10px', marginLeft: 6 }}
                      >
                        Open Form
                      </button>
                    </td>
                  </tr>
                ))}
                {!students.length ? (
                  <tr>
                    <td colSpan={showIndexStudents ? 6 : 5}>{studentLoading ? 'Searching students...' : 'No students found.'}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {studentMeta.totalPages > 1 ? (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {Array.from({ length: studentMeta.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={studentMeta.page === pageNumber ? 'primary-btn' : 'ghost-btn'}
                    type="button"
                    onClick={() => setStudentPage(pageNumber)}
                    disabled={studentLoading}
                    style={{ minWidth: 40, marginTop: 0, width: 'auto' }}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {PLACED_SEARCH_MENUS.map((menu) => (
                <button
                  key={menu.value}
                  className={placedSearchField === menu.value ? 'primary-btn' : 'ghost-btn'}
                  type="button"
                  onClick={() => {
                    setPlacedPage(1);
                    setPlacedSearchField(menu.value);
                  }}
                  style={{ marginTop: 0, width: 'auto', minWidth: 40 }}
                >
                  {menu.label}
                </button>
              ))}
            </div>
            <input
              value={placedSearchValue}
              onChange={(e) => { setPlacedPage(1); setPlacedSearchValue(e.target.value); }}
              placeholder="Search placed student"
              style={{ minWidth: 180 }}
            />
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setPlacedPage(1);
                setPlacedSearchField('name');
                setPlacedSearchValue('');
              }}
              style={{ marginTop: 0, width: 'auto' }}
            >
              Clear
            </button>
          </div>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }}>
          <table className="data-table">
            <thead>
              <tr>
                {showIndexPlaced ? <th>#</th> : null}
                <th>Placed Date</th>
                <th>Name</th>
                <th>Enrollment ID</th>
                <th>Age</th>
                <th>Mobile</th>
                <th>Address</th>
                <th>Batch</th>
                <th>Placement Type</th>
                <th>Academic Year</th>
                <th>Opinion</th>
                <th>Note</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {placedItems.map((item, idx) => (
                <tr key={item._id}>
                  {showIndexPlaced ? <td>{(placedMeta.page - 1) * PAGE_SIZE + idx + 1}</td> : null}
                  <td>{item.placedDate ? new Date(item.placedDate).toLocaleDateString() : '—'}</td>
                  <td>{item.name || '—'}</td>
                  <td>{item.enrollmentNo || item.studentId?.enrollmentNo || '—'}</td>
                  <td>{item.age ?? '—'}</td>
                  <td>{item.mobileNo || '—'}</td>
                  <td>{item.address || '—'}</td>
                  <td>{item.batch || '—'}</td>
                  <td>{item.placementType || '—'}</td>
                  <td>{item.academicYear || '—'}</td>
                  <td>{item.opinion || '—'}</td>
                  <td>{item.note || '—'}</td>
                  <td>
                    <button
                      className="ghost-btn"
                      type="button"
                      onClick={() => startEditPlaced(item)}
                      style={{ marginTop: 0, width: 'auto', padding: '6px 10px' }}
                    >
                      Edit
                    </button>
                    <button
                      className="danger-btn"
                      type="button"
                      onClick={() => deletePlacedStudentRow(item)}
                      disabled={saving}
                      style={{ marginTop: 0, width: 'auto', padding: '6px 10px', marginLeft: 6 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!placedItems.length ? (
                <tr>
                  <td colSpan={showIndexPlaced ? 13 : 12}>{loading ? 'Loading placed students...' : 'No placed students added yet.'}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
          {placedMeta.totalPages > 1 ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {Array.from({ length: placedMeta.totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={placedMeta.page === pageNumber ? 'primary-btn' : 'ghost-btn'}
                  type="button"
                  onClick={() => setPlacedPage(pageNumber)}
                  disabled={loading}
                  style={{ minWidth: 40, marginTop: 0, width: 'auto' }}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
