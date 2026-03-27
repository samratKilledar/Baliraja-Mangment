import { useEffect, useState } from 'react';
import api from '../api/client';

const CLASS_OPTIONS = ['11th Std', '12th Std', 'Trainning'];

export default function SubjectManager() {
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    code: '',
    currentClasses: ['11th Std', '12th Std', 'Trainning'],
    teacherId: ''
  });

  useEffect(() => {
    loadTeachers();
    loadSubjects();
  }, []);

  async function loadTeachers() {
    try {
      const { data } = await api.get('/teachers');
      setTeachers(Array.isArray(data) ? data : []);
    } catch (err) {
      setTeachers([]);
    }
  }

  async function loadSubjects() {
    setLoading(true);
    try {
      const { data } = await api.get('/subjects');
      setSubjects(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setSubjects([]);
      setError(err?.response?.data?.message || 'Unable to load subjects');
    } finally {
      setLoading(false);
    }
  }

  function toggleClass(currentClass) {
    setForm((prev) => {
      const hasValue = prev.currentClasses.includes(currentClass);
      return {
        ...prev,
        currentClasses: hasValue
          ? prev.currentClasses.filter((value) => value !== currentClass)
          : [...prev.currentClasses, currentClass]
      };
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/subjects', form);
      setForm({ name: '', code: '', currentClasses: ['11th Std', '12th Std', 'Trainning'], teacherId: '' });
      await loadSubjects();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save subject');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <form className="student-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            <span>Subject Name</span>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          </label>
          <label>
            <span>Subject Code</span>
            <input value={form.code} onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))} />
          </label>
          <label>
            <span>Teacher</span>
            <select value={form.teacherId} onChange={(e) => setForm((prev) => ({ ...prev, teacherId: e.target.value }))}>
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>
                  {teacher.userId?.fullName || teacher.fullName || 'Teacher'}
                </option>
              ))}
            </select>
          </label>
          <div className="full">
            <span style={{ display: 'block', marginBottom: 8, color: '#6b7280', fontWeight: 700 }}>Available For</span>
            <div className="subject-filter">
              {CLASS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`result-chip ${form.currentClasses.includes(option) ? 'active' : ''}`}
                  onClick={() => toggleClass(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="primary-btn" disabled={saving}>
          {saving ? 'Saving...' : 'Add Subject'}
        </button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Code</th>
              <th>Teacher</th>
              <th>Classes</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject._id}>
                <td>{subject.name}</td>
                <td>{subject.code || '—'}</td>
                <td>{subject.teacherName || subject.teacherId?.userId?.fullName || '—'}</td>
                <td>{Array.isArray(subject.currentClasses) && subject.currentClasses.length ? subject.currentClasses.join(', ') : 'All'}</td>
              </tr>
            ))}
            {!subjects.length && (
              <tr>
                <td colSpan={4}>{loading ? 'Loading subjects...' : 'No subjects added yet.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
