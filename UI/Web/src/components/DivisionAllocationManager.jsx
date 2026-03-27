import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import SharedGrid from './SharedGrid';

const CLASS_OPTIONS = ['11th Std', '12th Std'];

export default function DivisionAllocationManager() {
  const [currentClass, setCurrentClass] = useState('11th Std');
  const [batchId, setBatchId] = useState('');
  const [batches, setBatches] = useState([]);
  const [roster, setRoster] = useState({ totalStudents: 0, divisions: {}, items: [] });
  const [divisionName, setDivisionName] = useState('A');
  const [capacityPerDivision, setCapacityPerDivision] = useState('60');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedCount = selectedIds.length;

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    loadRoster();
  }, [currentClass, batchId]);

  async function loadBatches() {
    try {
      const { data } = await api.get('/courses/batches');
      setBatches(Array.isArray(data) ? data : []);
    } catch {
      setBatches([]);
    }
  }

  async function loadRoster() {
    setLoading(true);
    try {
      const { data } = await api.get('/students/division-allocation', {
        params: {
          currentClass,
          batchId: batchId || undefined
        }
      });
      setRoster(data || { totalStudents: 0, divisions: {}, items: [] });
      setSelectedIds([]);
      setError('');
    } catch (err) {
      setRoster({ totalStudents: 0, divisions: {}, items: [] });
      setError(err?.response?.data?.message || 'Unable to load division allocation roster');
    } finally {
      setLoading(false);
    }
  }

  async function assignDivision() {
    if (!selectedIds.length || !divisionName.trim()) return;
    setSaving(true);
    try {
      await api.post('/students/division-allocation/assign', {
        studentIds: selectedIds,
        division: divisionName
      });
      await loadRoster();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to assign division');
    } finally {
      setSaving(false);
    }
  }

  async function autoAllocate() {
    setSaving(true);
    try {
      await api.post('/students/division-allocation/auto', {
        currentClass,
        batchId: batchId || undefined,
        capacityPerDivision: Number(capacityPerDivision) || 60
      });
      await loadRoster();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to auto allocate divisions');
    } finally {
      setSaving(false);
    }
  }

  function toggleStudent(studentId) {
    setSelectedIds((prev) => (
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    ));
  }

  const filteredBatches = useMemo(() => (
    batches.filter((batch) => {
      const name = `${batch.batchName || ''} ${batch.courseId?.name || ''}`.toLowerCase();
      return !currentClass || name.includes(currentClass.toLowerCase().replace(' std', ''));
    })
  ), [batches, currentClass]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="attendance-toolbar">
        <label>
          <span>Class</span>
          <select value={currentClass} onChange={(e) => setCurrentClass(e.target.value)}>
            {CLASS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label>
          <span>Batch</span>
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            <option value="">All Batches</option>
            {filteredBatches.map((batch) => (
              <option key={batch._id} value={batch._id}>
                {batch.batchName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Manual Division</span>
          <input value={divisionName} onChange={(e) => setDivisionName(e.target.value.toUpperCase())} placeholder="A / B / C" />
        </label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="ghost-btn" onClick={assignDivision} disabled={!selectedCount || saving}>
            {saving ? 'Saving...' : `Assign ${selectedCount || ''} Students`}
          </button>
        </div>
      </div>

      <div className="attendance-toolbar">
        <label>
          <span>Auto Division Capacity</span>
          <input type="number" value={capacityPerDivision} onChange={(e) => setCapacityPerDivision(e.target.value)} />
        </label>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="ghost-btn" onClick={autoAllocate} disabled={saving}>
            Auto Allocate
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'end' }}>
          <button className="ghost-btn" onClick={loadRoster} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <SharedGrid columns={4} className="snapshot-box">
        <div>
          <small>Total Students</small>
          <strong>{roster.totalStudents || 0}</strong>
        </div>
        {Object.entries(roster.divisions || {}).map(([division, count]) => (
          <div key={division}>
            <small>Division {division}</small>
            <strong>{count}</strong>
          </div>
        ))}
      </SharedGrid>

      {error ? <p className="error">{error}</p> : null}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Select</th>
              <th>Student</th>
              <th>Enrollment</th>
              <th>Batch</th>
              <th>Branch</th>
              <th>Division</th>
            </tr>
          </thead>
          <tbody>
            {(roster.items || []).map((student) => (
              <tr key={student.studentId}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(student.studentId)}
                    onChange={() => toggleStudent(student.studentId)}
                  />
                </td>
                <td>{student.studentName}</td>
                <td>{student.enrollmentNo || '—'}</td>
                <td>{student.batchName || '—'}</td>
                <td>{student.branch || '—'}</td>
                <td>{student.division || 'Not Assigned'}</td>
              </tr>
            ))}
            {!roster.items?.length && (
              <tr>
                <td colSpan={6}>{loading ? 'Loading students...' : 'No students found for division allocation.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
