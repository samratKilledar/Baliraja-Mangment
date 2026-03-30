import { useEffect, useMemo, useState, Fragment } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StudentAdmissionForm from './StudentAdmissionForm';
import VectorIcon from './VectorIcon';
import { resolveApiBaseUrl } from '../config/env';

export default function StudentList() {
  const PAGE_SIZE = 10;
  const { user } = useAuth() || {};
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    status: 'active'
  });
  const [pendingFees, setPendingFees] = useState({});
  const [feeMeta, setFeeMeta] = useState({});
  const [collectionRange, setCollectionRange] = useState('year');
  const [collection, setCollection] = useState(null);
  const [feeEdit, setFeeEdit] = useState(null);
  const [feeReason, setFeeReason] = useState('');
  const [focusStudentId, setFocusStudentId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ feeId: null, amount: '', mode: 'cash', transactionRef: '', note: '', paidOn: '' });
  const [masterEditId, setMasterEditId] = useState(null);
  const [payNow, setPayNow] = useState(null);
  const [yearlyTotals, setYearlyTotals] = useState({ collected: 0, pending: 0 });
  const [attendanceModal, setAttendanceModal] = useState({ open: false, studentId: null, data: [] });
  const [attendanceVisible, setAttendanceVisible] = useState(10);
  const [attForm, setAttForm] = useState({ date: '', checkInAt: '', checkOutAt: '' });
  const [activeAction, setActiveAction] = useState({ type: null, studentId: null });
  const [search, setSearch] = useState('');
  const [leaves, setLeaves] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [detailPanel, setDetailPanel] = useState({ type: null, studentId: null });
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [studentView, setStudentView] = useState('all');
  const shouldShowIndex = pageMeta.total > PAGE_SIZE;
  const hasPagination = pageMeta.totalPages > 1;
  const columnCount = shouldShowIndex ? 6 : 5;

  // keep all sub-views closed on initial load
  useEffect(() => {
    setFeeEdit(null);
    setPayNow(null);
    setAttendanceModal({ open: false, studentId: null, data: [] });
    setMasterEditId(null);
    setActiveAction({ type: null, studentId: null });
    setDetailPanel({ type: null, studentId: null });
  }, []);

useEffect(() => {
  load(undefined, page);

  if (user?.role === 'super_admin' || user?.role === 'admin') {
    loadComplaints();
    loadLeaves();
  }
}, [user, page]);

useEffect(() => {
  const term = search.trim();
  const handler = setTimeout(() => {
    if (!term) {
      setError('');
      setPage(1);
      return;
    }
    searchStudents(term);
  }, 350);
  return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [search]);

  async function load(term, nextPage = 1) {
    setLoading(true);
    try {
      const [{ data: studentData }, { data: feeData }] = await Promise.all([
        api.get('/students', { params: term ? { q: term, page: nextPage, limit: PAGE_SIZE } : { page: nextPage, limit: PAGE_SIZE } }),
        api.get('/fees/list', { params: { page: 1, limit: 1000 } })
      ]);
      setStudents(studentData?.items || []);
      setPageMeta(studentData?.meta || { page: nextPage, totalPages: 1, total: 0 });
      const map = {};
      const meta = {};
      let totalCollected = 0;
      let totalPending = 0;
      (feeData?.items || []).forEach((f) => {
        if (f.studentId?._id) {
          map[f.studentId._id] = f;
          meta[f.studentId._id] = {
            total: f.totalAmount,
            paid: f.paidAmount,
            start: f.feeStartDate,
            end: f.feeEndDate
          };
          totalCollected += f.paidAmount || 0;
          totalPending += f.dueAmount || 0;
        }
      });
      setPendingFees(map);
      setFeeMeta(meta);
      setYearlyTotals({ collected: totalCollected, pending: totalPending });
      setError('');
    } catch (err) {
      setStudents([]);
      setError(err?.response?.data?.message || 'Unable to fetch students');
    } finally {
      setLoading(false);
    }
  }

  async function searchStudents(term) {
    setPage(1);
    await load(term, 1);
  }

  async function loadLeaves() {
    try {
      const { data } = await api.get('/attendance/leaves');
      setLeaves(data || []);
    } catch (err) {
      // ignore
    }
  }

  async function loadComplaints() {
    try {
      const { data } = await api.get('/complaints');
      setComplaints(data || []);
    } catch (err) {
      // ignore
    }
  }

  function toggleDetail(studentId, type) {
    setFeeEdit(null);
    setPayNow(null);
    setAttendanceModal({ open:false, studentId:null, data:[] });
    setMasterEditId(null);
    setActiveAction({ type: null, studentId: null });
    if (detailPanel.studentId === studentId && detailPanel.type === type) {
      setDetailPanel({ type: null, studentId: null });
    } else {
      setDetailPanel({ type, studentId });
    }
  }

  function isSelectedAction(studentId, type) {
    if (type === 'edit') return editing === studentId;
    if (type === 'complaints' || type === 'leaves') {
      return detailPanel.studentId === studentId && detailPanel.type === type;
    }
    return activeAction.studentId === studentId && activeAction.type === type;
  }

  // no auto-open; sub-views open only on explicit click

  const studentViewCounts = useMemo(() => {
    const serverCounts = pageMeta?.admissionTypeCounts;
    if (serverCounts && typeof serverCounts === 'object' && Object.keys(serverCounts).length) {
      return {
        all: Number(pageMeta?.total) || 0,
        ...Object.entries(serverCounts).reduce((acc, [key, value]) => {
          acc[key] = Number(value) || 0;
          return acc;
        }, {})
      };
    }

    const counts = { all: students.length };
    students.forEach((student) => {
      const admissionType = student.details?.education?.admissionType?.trim() || 'Other';
      counts[admissionType] = (counts[admissionType] || 0) + 1;
    });
    return counts;
  }, [pageMeta?.admissionTypeCounts, pageMeta?.total, students]);

  const studentViews = useMemo(() => ([
    { key: 'all', label: 'All Students' },
    ...Object.keys(studentViewCounts)
      .filter((key) => key !== 'all')
      .sort((left, right) => left.localeCompare(right))
      .map((key) => ({ key, label: key }))
  ]), [studentViewCounts]);

  useEffect(() => {
    if (!studentViews.some((view) => view.key === studentView)) {
      setStudentView('all');
    }
  }, [studentView, studentViews]);

  const filteredStudents = students.filter((student) => {
    if (studentView === 'all') return true;
    const admissionType = student.details?.education?.admissionType?.trim() || 'Other';
    return admissionType === studentView;
  });
function startEdit(s) {

  // close all other panels first
  setFeeEdit(null);
  setPayNow(null);
  setMasterEditId(null);
  setAttendanceModal({ open:false, studentId:null, data:[] });
  setDetailPanel({ type:null, studentId:null });

  setEditing(s._id);
  setActiveAction({ type: 'edit', studentId: s._id });

  setEditForm({
    fullName: s.userId?.fullName || '',
    phone: sanitizeNumeric(s.userId?.phone || ''),
    status: s.status || 'active'
  });
}

  async function saveEdit(id) {
    setActionBusy(`student-save-${id}`);
    try {
      await api.put(`/students/${id}`, {
        fullName: editForm.fullName,
        phone: sanitizeNumeric(editForm.phone),
        status: editForm.status
      });
      setEditing(null);
      setActiveAction({ type: null, studentId: null });
      await load(search.trim(), page);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update student');
    } finally {
      setActionBusy('');
    }
  }

  async function downloadPdf(id) {
    const token = localStorage.getItem('ims_token') || localStorage.getItem('token');
    const url = `${resolveApiBaseUrl()}/students/${id}/pdf`;
    try {
      const res = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
      if (res.status === 401) {
        localStorage.setItem('ims_logout_reason', 'expired');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('ims:logout', { detail: { reason: 'expired' } }));
        }
        throw new Error('Session expired');
      }
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `student-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError('Unable to download PDF');
    }
  }

  useEffect(() => {
    if (user?.role === 'super_admin') {
      loadCollection(collectionRange);
    }
  }, [collectionRange]);

  async function loadCollection(range) {
    try {
      const { data } = await api.get(`/fees/collection?range=${range}`);
      setCollection(data);
    } catch (err) {
      setCollection(null);
    }
  }

  async function openFeeEditor(studentId) {
    try {
      setDetailPanel({ type: null, studentId: null });
      setPayNow(null);
      setAttendanceModal({ open:false, studentId:null, data:[] });
      setMasterEditId(null);
      const { data } = await api.get(`/fees/student/${studentId}`);
      setFeeEdit({ ...data, studentId });
      setFeeReason('');
      setPaymentForm({ feeId: data._id, amount: '', mode: 'cash', transactionRef: '', note: '', paidOn: '' });
      setActiveAction({ type: 'fee', studentId });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load fee');
    }
  }

  async function openPayNow(studentId) {
    try {
      setDetailPanel({ type: null, studentId: null });
      setFeeEdit(null);
      setAttendanceModal({ open:false, studentId:null, data:[] });
      setMasterEditId(null);
      const { data } = await api.get(`/fees/student/${studentId}`);
      setPayNow({ ...data, studentId });
      setPaymentForm({
        feeId: data._id,
        amount: '',
        mode: 'cash',
        transactionRef: '',
        note: '',
        paidOn: ''
      });
      setActiveAction({ type: 'pay', studentId });
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load fee');
    }
  }

  async function saveFeeEdit() {
    if (!feeEdit?._id) return;
    if (!feeReason.trim()) {
      setError('Reason is required for fee updates');
      return;
    }
    setActionBusy(`fee-save-${feeEdit._id}`);
    try {
      await api.put(`/fees/${feeEdit._id}`, {
        totalAmount: user?.role === 'super_admin' ? feeEdit.totalAmount : undefined,
        paidAmount: user?.role === 'super_admin' ? feeEdit.paidAmount : undefined,
        dueDate: user?.role === 'super_admin' ? feeEdit.dueDate : undefined,
        feeStartDate: feeEdit.feeStartDate,
        feeEndDate: feeEdit.feeEndDate,
        reason: feeReason.trim()
      });
      setFeeEdit(null);
      setPayNow(null);
      setFeeReason('');
      setDetailPanel({ type:null, studentId:null });
      setActiveAction({ type: null, studentId: null });
      await load(search.trim(), page);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update fee');
    } finally {
      setActionBusy('');
    }
  }

  async function openAttendance(studentId) {
    try {
      setDetailPanel({ type: null, studentId: null });
      const { data } = await api.get(`/attendance/student/${studentId}`);
      setAttendanceModal({ open: true, studentId, data });
      setAttendanceVisible(10);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load attendance');
    }
  }

  async function saveAttendance() {
    if (!attendanceModal.studentId || !attForm.date) return;
    try {
      await api.post('/attendance', {
        studentId: attendanceModal.studentId,
        date: attForm.date,
        checkInAt: attForm.checkInAt ? new Date(attForm.checkInAt) : undefined,
        checkOutAt: attForm.checkOutAt ? new Date(attForm.checkOutAt) : undefined,
        status: 'present'
      });
      const { data } = await api.get(`/attendance/student/${attendanceModal.studentId}`);
      setAttendanceModal({ ...attendanceModal, data });
      setAttForm({ date: '', checkInAt: '', checkOutAt: '' });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to save attendance');
    }
  }

  async function addPayment() {
    if (!paymentForm.feeId || !paymentForm.amount) return;
    if (!paymentForm.paidOn) {
      setError('Please select payment date');
      return;
    }
    setActionBusy(`payment-save-${paymentForm.feeId}`);
    try {
      await api.post(`/fees/${paymentForm.feeId}/payments`, {
        amount: Number(paymentForm.amount),
        mode: paymentForm.mode,
        transactionRef: paymentForm.transactionRef,
        note: paymentForm.note,
        paidOn: paymentForm.paidOn
      });
      if (feeEdit?.studentId) {
        await openFeeEditor(feeEdit.studentId); // refresh fee data
      } else if (payNow?.studentId) {
        await openPayNow(payNow.studentId);
      }
      setPaymentForm({ ...paymentForm, amount: '', transactionRef: '', note: '', paidOn: '' });
      setError('');
      await load(search.trim(), page); // refresh list due/paid values
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to add payment');
    } finally {
      setActionBusy('');
    }
  }

  async function deletePaymentEntry(feeId, paymentId) {
    if (!feeId || !paymentId) return;
    if (!window.confirm('Delete this payment entry?')) return;
    const busyKey = `payment-delete-${feeId}-${paymentId}`;
    setActionBusy(busyKey);
    try {
      await api.delete(`/fees/${feeId}/payments/${paymentId}`);
      if (feeEdit?.studentId) {
        await openFeeEditor(feeEdit.studentId);
      } else if (payNow?.studentId) {
        await openPayNow(payNow.studentId);
      }
      await load(search.trim(), page);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete payment');
    } finally {
      setActionBusy('');
    }
  }

  async function deleteFeeRecord(studentId) {
    const fee = pendingFees[studentId];
    if (!fee?._id) {
      setError('No fee record found for this student');
      return;
    }
    if (!window.confirm('Delete this fee record?')) return;

    setActionBusy(`fee-delete-${fee._id}`);
    try {
      await api.delete(`/fees/${fee._id}`);
      if (feeEdit?._id === fee._id) {
        setFeeEdit(null);
        setActiveAction({ type: null, studentId: null });
      }
      await load(search.trim(), page);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to delete fee');
    } finally {
      setActionBusy('');
    }
  }

  async function updateLeave(id, status) {
    try {
      await api.put(`/attendance/leave/${id}/status`, { status });
      await loadLeaves();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update leave');
    }
  }

  return (
    <div className="table-wrap student-list-modern">
      {user?.role === 'super_admin' && (
      <div className="card" style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ fontWeight: 700 }}>Collections</span>
        <select value={collectionRange} onChange={(e)=>setCollectionRange(e.target.value)}>
          <option value="year">This year</option>
          </select>
          {collection && (
            <span style={{ color: '#0f7d49', fontWeight: 700 }}>
              ₹{collection.collected || 0} / {collection.count || 0} txn
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#1f2f75' }}>
            Year Collected: ₹{collection?.collected || 0} | Pending: ₹{yearlyTotals.pending}
          </span>
        </div>
      )}
      <div className="toolbar">
        <input
          className="search"
          placeholder="Search by name, ID or phone"
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
        />
        {error && <p className="error" style={{ margin: 0 }}>{error}</p>}
      </div>
      <div className="student-subview-strip">
        {studentViews.map((view) => (
          <button
            key={view.key}
            type="button"
            className={`student-subview-chip ${studentView === view.key ? 'active' : ''}`}
            onClick={() => setStudentView(view.key)}
          >
            {view.label}
            <span>{studentViewCounts[view.key] || 0}</span>
          </button>
        ))}
      </div>
      {hasPagination && (
        <div className="top-pagination" aria-label="Student list pages">
          {Array.from({ length: pageMeta.totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={`page-chip ${pageNumber === page ? 'active' : ''}`}
              onClick={() => setPage(pageNumber)}
              disabled={loading}
            >
              {pageNumber}
            </button>
          ))}
        </div>
      )}
      <div className="list-index-bar">
        <span>Showing Students: {filteredStudents.length} / {pageMeta.total || 0}</span>
        <span>Index: {shouldShowIndex ? 'Visible' : 'Hidden for 10 or fewer records'}</span>
      </div>
      <div className="card" style={{ padding: 10 }}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {shouldShowIndex ? <th>#</th> : null}
                <th>Student</th>
                <th>Contact</th>
                <th>Batch</th>
                <th>Fees</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={columnCount} style={{ padding: 16 }}>Loading students...</td></tr>
              )}
              {!loading && filteredStudents.length === 0 && (
                <tr><td colSpan={columnCount} style={{ padding: 16 }}>No data available. Try another search term.</td></tr>
              )}
              {!loading && filteredStudents.map((student, idx) => {
                const feeInfo = feeMeta[student._id];
                const due = pendingFees[student._id]?.dueAmount ?? 0;
                const feeRangeAlert = getFeeRangeAlert(feeInfo?.end);
                const highlightBg =
                  due > 0 && (pendingFees[student._id]?.paidAmount || feeInfo?.paid)
                    ? '#f4cf7a'
                    : due > 0
                      ? '#f2a3a3'
                      : '#98d8aa';
                return (
                  <Fragment key={student._id}>
                    <tr style={{ background: highlightBg, color: '#18243d' }}>
                      {shouldShowIndex ? <td>{(page - 1) * PAGE_SIZE + idx + 1}</td> : null}
                      <td>
                        <div style={{ fontWeight: 700 }}>{student.userId?.fullName || 'N/A'}</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>ID: {student.enrollmentNo}</div>
                        <div style={{ color: '#22335f', fontSize: 12 }}>Password: {student.userId?.passwordVisible || '123456'}</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>Added by: {student.createdBy?.fullName || '—'}</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>Admission: {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : '—'}</div>
                      </td>
                      <td>
                        <div><VectorIcon name="phone" size={12} /> {student.userId?.phone || '—'}</div>
                        <div><VectorIcon name="mail" size={12} /> {student.userId?.email || '—'}</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}><VectorIcon name="map-pin" size={12} /> {formatStudentAddress(student)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{student.batchId?.batchName || '—'}</div>
                        <div style={{ color: '#22335f', fontSize: 12 }}>Class: {student.details?.education?.currentClass || '—'}</div>
                        <div style={{ color: '#22335f', fontSize: 12 }}>Admission Type: {student.details?.education?.admissionType || 'Other'}</div>
                        <div style={{ color: '#22335f', fontSize: 12 }}>Age: {student.age ?? calculateAge(student.dateOfBirth) ?? '—'}</div>
                        <div style={{ color: '#22335f', fontSize: 12 }}>Gender: {student.gender || student.details?.personal?.gender || '—'}</div>
                        {student.batchId?.startDate ? (
                          <div style={{ color: '#4b5774', fontSize: 12 }}>
                            Year {new Date(student.batchId.startDate).getFullYear()}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {feeInfo
                          ? (
                            <div>
                              <div>₹{feeInfo.total || 0} total</div>
                              <div>Paid ₹{feeInfo.paid || 0}</div>
                              <div>Due ₹{due}</div>
                              <div
                                className={`fee-range-text ${feeRangeAlert.isCritical ? 'danger' : ''}`}
                                style={{ fontSize: 12 }}
                              >
                                Range: {feeInfo.start ? new Date(feeInfo.start).toLocaleDateString() : '—'} - {feeInfo.end ? new Date(feeInfo.end).toLocaleDateString() : '—'}
                                {feeRangeAlert.daysLeft !== null ? ` (${feeRangeAlert.daysLeft} days left)` : ''}
                              </div>
                              <div style={{ color: '#c0392b', fontSize: 12 }}>
                                Due date: {pendingFees[student._id]?.dueDate ? new Date(pendingFees[student._id].dueDate).toLocaleDateString() : '—'}
                              </div>
                            </div>
                          )
                          : '—'}
                      </td>
                      <td>
                        <span className={`status-chip ${student.status === 'active' ? 'active' : 'inactive'}`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={columnCount} style={{ paddingTop: 0 }}>
                        <div className="student-action-strip">
                          <button
                            className={`ghost-btn action-chip ${isSelectedAction(student._id, 'edit') ? 'active' : ''}`}
                            style={{ padding: '6px 10px', fontSize: 13 }}
                            onClick={()=>startEdit(student)}
                          >
                            Edit Info
                          </button>
                          {(user?.role === 'super_admin' || user?.role === 'admin') && (
                            <button
                              className={`ghost-btn action-chip ${isSelectedAction(student._id, 'fee') ? 'active' : ''}`}
                              style={{ padding: '6px 10px', fontSize: 13 }}
                              onClick={()=>openFeeEditor(student._id)}
                            >
                              Edit Fee
                            </button>
                          )}
                          <button
                            className={`ghost-btn action-chip ${isSelectedAction(student._id, 'pay') ? 'active' : ''}`}
                            style={{ padding: '6px 10px', fontSize: 13 }}
                            onClick={()=>openPayNow(student._id)}
                          >
                            Submit Fees
                          </button>
                          <button
                            className={`ghost-btn action-chip ${isSelectedAction(student._id, 'master') ? 'active' : ''}`}
                            style={{ padding: '6px 10px', fontSize: 13 }}
                            onClick={()=>{
                              setMasterEditId(student._id);
                              setActiveAction({ type: 'master', studentId: student._id });
                            }}
                          >
                            Open Master
                          </button>
                          <button className="ghost-btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={()=>downloadPdf(student._id)}>PDF</button>
                          {(user?.role === 'super_admin' || user?.role === 'admin') && (
                            <>
                              <button
                                className={`ghost-btn action-chip ${isSelectedAction(student._id, 'complaints') ? 'active' : ''}`}
                                style={{ padding: '6px 10px', fontSize: 13 }}
                                onClick={()=>toggleDetail(student._id,'complaints')}
                              >
                                Complaints
                              </button>
                              <button
                                className={`ghost-btn action-chip ${isSelectedAction(student._id, 'leaves') ? 'active' : ''}`}
                                style={{ padding: '6px 10px', fontSize: 13 }}
                                onClick={()=>toggleDetail(student._id,'leaves')}
                              >
                                Leave Requests
                              </button>
                            </>
                          )}
                          <button className="danger-btn student-delete-btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={async ()=>{
                            if (!window.confirm('Delete this student and related fee records?')) return;
                            try {
                              await api.delete(`/students/${student._id}`);
                              await load(search.trim(), page);
                            } catch (err) {
                              setError(err?.response?.data?.message || 'Unable to delete');
                            }
                          }}>Delete</button>
                        </div>
                        <div className="student-expand-divider" />
                      </td>
                    </tr>
                    {editing === student._id && (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="inline-edit student-expand-card">
                            <label>Name <input value={editForm.fullName} onChange={(e)=>setEditForm({...editForm, fullName:e.target.value})} /></label>
                            <label>Phone <input inputMode="numeric" pattern="[0-9]*" value={editForm.phone} onChange={(e)=>setEditForm({...editForm, phone:sanitizeNumeric(e.target.value)})} /></label>
                            <label>Status
                              <select value={editForm.status} onChange={(e)=>setEditForm({...editForm, status:e.target.value})}>
                                <option value="active">active</option>
                                <option value="inactive">inactive</option>
                                <option value="graduated">graduated</option>
                              </select>
                            </label>
                            <div className="inline-edit-actions">
                              <button className="primary-btn" onClick={()=>saveEdit(student._id)}>Save</button>
                              <button className="ghost-btn" onClick={()=>setEditing(null)}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {detailPanel.studentId === student._id && detailPanel.type === 'complaints' && (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="inline-edit student-expand-card" style={{ marginTop: 4 }}>
                            <h5>Complaints</h5>
                            {complaints.filter((c)=>c.studentId?._id === student._id).map((c)=>(
                              <div key={c._id} className="pill-row column" style={{
                                background: c.status==='done' ? '#e5f7e9' : c.status==='wip' ? '#fff4d6' : '#ffecec',
                                borderColor: c.status==='done' ? '#b7e4c2' : c.status==='wip' ? '#f3d9a5' : '#f1b6b6'
                              }}>
                                <div className="pill-line"><span>Subject</span><strong>{c.subject || 'Complaint'}</strong></div>
                                <div className="pill-line"><span>Message</span><strong>{c.message}</strong></div>
                                <div className="pill-line"><span>Status</span><strong>{c.status}</strong></div>
                                {c.adminNote ? <div className="pill-line"><span>Admin Note</span><strong>{c.adminNote}</strong></div> : null}
                              </div>
                            ))}
                            {!complaints.filter((c)=>c.studentId?._id === student._id).length ? <p style={{ marginTop:6 }}>No complaints for this student.</p> : null}
                          </div>
                        </td>
                      </tr>
                    )}
                    {detailPanel.studentId === student._id && detailPanel.type === 'leaves' && (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="inline-edit student-expand-card" style={{ marginTop: 4 }}>
                            <h5>Leave Requests</h5>
                            {leaves.filter((l)=>l.studentId?._id === student._id).map((l)=>(
                              <div key={l._id} className="pill-row column" style={{
                                background: l.leaveStatus==='approved' ? '#e5f7e9' : l.leaveStatus==='rejected' ? '#ffecec' : '#fff4d6',
                                borderColor: l.leaveStatus==='approved' ? '#b7e4c2' : l.leaveStatus==='rejected' ? '#f1b6b6' : '#f3d9a5'
                              }}>
                                <div className="pill-line"><span>Type</span><strong>{l.leaveType || 'full_day'}</strong></div>
                                <div className="pill-line"><span>From</span><strong>{l.leaveFrom ? new Date(l.leaveFrom).toLocaleDateString() : '—'}</strong></div>
                                <div className="pill-line"><span>To</span><strong>{l.leaveTo ? new Date(l.leaveTo).toLocaleDateString() : '—'}</strong></div>
                                {l.leaveReason ? <div className="pill-line"><span>Reason</span><strong>{l.leaveReason}</strong></div> : null}
                                <div className="pill-line"><span>Status</span><strong>{(l.leaveStatus || '').toUpperCase()}</strong></div>
                              </div>
                            ))}
                            {!leaves.filter((l)=>l.studentId?._id === student._id).length ? <p style={{ marginTop:6 }}>No leave requests for this student.</p> : null}
                          </div>
                        </td>
                      </tr>
                    )}
                    {activeAction.type === 'master' && activeAction.studentId === student._id && (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="card student-expand-card" style={{ marginTop: 6 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <h4>Edit in Master Form</h4>
                              <button className="ghost-btn" onClick={()=>{ setMasterEditId(null); setActiveAction({ type: null, studentId: null }); }}>Close</button>
                            </div>
                            <StudentAdmissionForm editId={student._id} onSaved={()=>{ setMasterEditId(null); setActiveAction({ type: null, studentId: null }); load(search.trim(), page); }} />
                          </div>
                        </td>
                      </tr>
                    )}
                    {activeAction.type === 'fee' && activeAction.studentId === student._id && feeEdit && (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="card form-card student-expand-card" style={{ marginTop: 6 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <h4>Edit Fee</h4>
                              <button className="ghost-btn" onClick={()=>{ setFeeEdit(null); setActiveAction({ type: null, studentId: null }); }}>Close</button>
                            </div>
                            <div className="grid two spacious">
                              <label>
                                Total Amount
                                <input type="number" value={feeEdit.totalAmount} disabled={user?.role !== 'super_admin'} onChange={(e)=>setFeeEdit({...feeEdit, totalAmount:Number(e.target.value)})} />
                              </label>
                              <label>
                                Paid Amount
                                <input type="number" value={feeEdit.paidAmount} disabled={user?.role !== 'super_admin'} onChange={(e)=>setFeeEdit({...feeEdit, paidAmount:Number(e.target.value)})} />
                              </label>
                              <label>
                                Due Date
                                <input type="date" value={feeEdit.dueDate?.substring?.(0,10) || ''} disabled={user?.role !== 'super_admin'} onChange={(e)=>setFeeEdit({...feeEdit, dueDate:e.target.value})} />
                              </label>
                              <label>
                                Fee Start
                                <input type="date" value={feeEdit.feeStartDate?.substring?.(0,10) || ''} onChange={(e)=>setFeeEdit({...feeEdit, feeStartDate:e.target.value})} />
                              </label>
                              <label>
                                Fee End
                                <input type="date" value={feeEdit.feeEndDate?.substring?.(0,10) || ''} onChange={(e)=>setFeeEdit({...feeEdit, feeEndDate:e.target.value})} />
                              </label>
                              <label>
                                Reason
                                <input value={feeReason} onChange={(e)=>setFeeReason(e.target.value)} placeholder="Why update?" />
                              </label>
                            </div>
                            <div style={{ display:'flex', gap:10, alignItems:'center', marginTop: 10 }}>
                              <button className="primary-btn" onClick={saveFeeEdit} disabled={actionBusy === `fee-save-${feeEdit._id}`}>
                                {actionBusy === `fee-save-${feeEdit._id}` ? 'Saving...' : 'Save Fee'}
                              </button>
                              <button className="ghost-btn" onClick={()=>addPayment()} disabled={actionBusy === `payment-save-${paymentForm.feeId}`}>
                                {actionBusy === `payment-save-${paymentForm.feeId}` ? 'Adding Payment...' : 'Add Payment'}
                              </button>
                              <span style={{ color:'#c0392b' }}>Due: ₹{feeEdit.dueAmount}</span>
                            </div>
                            <div className="fee-summary">
                              <div className="fee-box total">
                                <span>Total</span>
                                <strong>₹{feeEdit.totalAmount}</strong>
                              </div>

                              <div className="fee-box paid">
                                <span>Paid</span>
                                <strong>₹{feeEdit.paidAmount}</strong>
                              </div>

                              <div className="fee-box due">
                                <span>Pending</span>
                                <strong>₹{feeEdit.dueAmount}</strong>
                              </div>
                            </div>

                            <h5 className="section-title">Payment History</h5>
                            {feeEdit.transactions?.length ? (
                              <div className="payment-cards">
                                {feeEdit.transactions.map((t, idx) => (
                                  <div key={idx} className="payment-card">
                                    <div className="payment-row">
                                      <span>Date</span>
                                      <strong>{new Date(t.paidOn).toLocaleDateString()}</strong>
                                    </div>

                                    <div className="payment-row">
                                      <span>Amount</span>
                                      <strong>₹{t.amount}</strong>
                                    </div>

                                    <div className="payment-row">
                                      <span>Mode</span>
                                      <strong>{t.mode}</strong>
                                    </div>

                                    {t.transactionRef && (
                                      <div className="payment-row">
                                        <span>Ref</span>
                                        <strong>{t.transactionRef}</strong>
                                      </div>
                                    )}

                                    {t.note && (
                                      <div className="payment-row">
                                        <span>Note</span>
                                        <strong>{t.note}</strong>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="empty-note">No payments recorded</p>
                            )}
                            {feeEdit.updateHistory?.length ? (
                              <div style={{ marginTop: 14 }}>
                                <h5 className="section-title">Fee Update History</h5>
                                <div className="pill-list">
                                  {feeEdit.updateHistory.slice().reverse().map((h, idx) => (
                                    <div key={idx} className="pill-row column" style={{ background:'#f7f8ff' }}>
                                      <div className="pill-line"><span>When</span><strong>{h.changedAt ? new Date(h.changedAt).toLocaleString() : '—'}</strong></div>
                                      <div className="pill-line"><span>By</span><strong>{h.changedBy || '—'}</strong></div>
                                      <div className="pill-line"><span>Reason</span><strong>{h.reason || '—'}</strong></div>
                                      <div className="pill-line"><span>From</span><strong>₹{h.before?.totalAmount ?? '-'} | Paid ₹{h.before?.paidAmount ?? '-'}</strong></div>
                                      <div className="pill-line"><span>To</span><strong>₹{h.after?.totalAmount ?? '-'} | Paid ₹{h.after?.paidAmount ?? '-'}</strong></div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                    {activeAction.type === 'pay' && activeAction.studentId === student._id && payNow && (
                      <tr>
                        <td colSpan={columnCount}>
                          <div className="card form-card" style={{ marginTop: 6 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <h4>Submit Fees</h4>
                              <button className="ghost-btn" onClick={()=>{ setPayNow(null); setActiveAction({ type: null, studentId: null }); }}>Close</button>
                            </div>
                            <p>Student: {student.enrollmentNo} | Mobile: {student.userId?.phone || '—'}</p>
                            <div className="grid two spacious">
                              <label>Amount<input type="number" value={paymentForm.amount} onChange={(e)=>setPaymentForm({...paymentForm, amount:e.target.value})} /></label>
                              <label>Payment Date<input type="date" value={paymentForm.paidOn} onChange={(e)=>setPaymentForm({...paymentForm, paidOn:e.target.value})} /></label>
                              <label>Mode
                                <select value={paymentForm.mode} onChange={(e)=>setPaymentForm({...paymentForm, mode:e.target.value})}>
                                  <option value="cash">Cash</option>
                                  <option value="upi">UPI</option>
                                  <option value="card">Card</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                </select>
                              </label>
                              <label>Reference<input value={paymentForm.transactionRef} onChange={(e)=>setPaymentForm({...paymentForm, transactionRef:e.target.value})} /></label>
                              <label>Note<input value={paymentForm.note} onChange={(e)=>setPaymentForm({...paymentForm, note:e.target.value})} /></label>
                            </div>
                            <div style={{ marginTop: 12, display:'flex', gap:10, alignItems:'center' }}>
                              <button className="primary-btn" onClick={addPayment} disabled={actionBusy === `payment-save-${paymentForm.feeId}`}>
                                {actionBusy === `payment-save-${paymentForm.feeId}` ? 'Submitting...' : 'Submit Payment'}
                              </button>
                              <span>Remaining: ₹{payNow.dueAmount}</span>
                            </div>
                            {payNow.transactions?.length ? (
                              <div className="pill-list" style={{ marginTop: 12 }}>
                                {payNow.transactions.map((t, idx) => (
                                  <div key={idx} className="pill-row column">
                                    <div className="pill-line"><span>Date</span><strong>{new Date(t.paidOn).toLocaleDateString()}</strong></div>
                                    <div className="pill-line"><span>Amount</span><strong>₹{t.amount}</strong></div>
                                    <div className="pill-line"><span>Mode</span><strong>{t.mode}</strong></div>
                                    <div className="pill-line"><span>Ref</span><strong>{t.transactionRef || '—'}</strong></div>
                                    <div className="pill-line"><span>Note</span><strong>{t.note || '—'}</strong></div>
                                    <div className="pill-line"><span>Mobile</span><strong>{t.studentPhone || student.userId?.phone || '—'}</strong></div>
                                    <div style={{ marginTop: 6 }}>
                                      <button
                                        className="danger-btn"
                                        onClick={() => deletePaymentEntry(payNow._id, t._id)}
                                        disabled={actionBusy === `payment-delete-${payNow._id}-${t._id}`}
                                        style={{ padding: '6px 10px', fontSize: 12 }}
                                      >
                                        {actionBusy === `payment-delete-${payNow._id}-${t._id}` ? 'Deleting...' : 'Delete Payment'}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {attendanceModal.open && !feeEdit && !payNow && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <h4>Attendance (last 30 days)</h4>
            <button className="ghost-btn" onClick={()=>setAttendanceModal({ open:false, studentId:null, data:[] })}>Close</button>
          </div>
          <div className="grid three" style={{ marginTop: 10, alignItems:'flex-end', gap:12 }}>
            <label>
              Date
              <input type="date" value={attForm.date} onChange={(e)=>setAttForm({...attForm, date:e.target.value})} />
            </label>
            <label>
              Check In (time)
              <input type="datetime-local" value={attForm.checkInAt} onChange={(e)=>setAttForm({...attForm, checkInAt:e.target.value})} />
            </label>
            <label>
              Check Out (time)
              <input type="datetime-local" value={attForm.checkOutAt} onChange={(e)=>setAttForm({...attForm, checkOutAt:e.target.value})} />
            </label>
            <button className="primary-btn" onClick={saveAttendance} style={{ height:38 }}>Save / Update</button>
          </div>
          {renderAttendanceCalendar(attendanceModal.data.slice(0, attendanceVisible))}
          <table className="data-table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Address</th>
                <th>Map</th>
              </tr>
            </thead>
            <tbody>
              {attendanceModal.data.slice(0, attendanceVisible).map((a)=>(
                <tr key={a._id}>
                  <td>{new Date(a.date).toLocaleDateString()}</td>
                  <td>{a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString() : '—'}</td>
                  <td>{a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString() : '—'}</td>
                  <td>
                    {a.checkInAddress || a.checkOutAddress
                      ? `${a.checkInAddress || ''}${a.checkOutAddress ? ' / ' + a.checkOutAddress : ''}`
                      : '—'}
                  </td>
                  <td>
                    {a.checkInLocation?.lat ? (
                      <a href={`https://www.google.com/maps?q=${a.checkInLocation.lat},${a.checkInLocation.lng}`} target="_blank" rel="noreferrer">
                        Check-in map
                      </a>
                    ) : '—'}
                    {a.checkOutLocation?.lat ? (
                      <>
                        <br />
                        <a href={`https://www.google.com/maps?q=${a.checkOutLocation.lat},${a.checkOutLocation.lng}`} target="_blank" rel="noreferrer">
                          Check-out map
                        </a>
                      </>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {attendanceModal.data.length > attendanceVisible && (
            <div style={{ marginTop: 10 }}>
              <button className="primary-btn" onClick={()=>setAttendanceVisible((v)=>v+10)}>Load previous days</button>
            </div>
          )}
        </div>
      )}
      {/* Leave Requests list removed from default view; use per-student submenu to view leaves */}
    </div>
  );
}

function formatStudentAddress(student) {
  if (student.address) return student.address;
  const addr = student.details?.address || {};
  const fallback = [addr.addressLine1, addr.addressLine2, addr.city, addr.state, addr.pinCode].filter(Boolean).join(', ');
  return fallback || '—';
}

function sanitizeNumeric(value) {
  return String(value || '').replace(/\D+/g, '');
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthGap = today.getMonth() - dob.getMonth();
  if (monthGap < 0 || (monthGap === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function getFeeRangeAlert(endDate) {
  if (!endDate) return { isCritical: false, daysLeft: null };
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return { isCritical: false, daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return { isCritical: daysLeft <= 30, daysLeft };
}

// calendar helper
function renderAttendanceCalendar(data) {
  const now = new Date();
  const days = Array.from({ length: 30 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const map = {};
  data.forEach((a) => {
    const key = new Date(a.date).toDateString();
    map[key] = a;
  });
  return (
    <div className="calendar-grid">
      {days.map((d) => {
        const rec = map[d.toDateString()];
        const status = rec ? (rec.checkOutAt ? 'full' : 'in') : 'miss';
        return (
          <div key={d.toISOString()} className={`cal-cell ${status}`}>
            <div className="cal-date">{d.getDate()}</div>
            <div className="cal-time">
              {rec?.checkInAt ? new Date(rec.checkInAt).toLocaleTimeString() : '—'} /{' '}
              {rec?.checkOutAt ? new Date(rec.checkOutAt).toLocaleTimeString() : '—'}
            </div>
            {rec?.checkInLocation?.lat ? (
              <div className="cal-loc">
                <a
                  href={`https://www.google.com/maps?q=${rec.checkInLocation.lat},${rec.checkInLocation.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  map
                </a>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

// lightweight component styles (scoped via className)
const css = `
.student-list-modern {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 14px;
  color: #15213d;
}
.student-list-modern.table-wrap {
  padding: 12px;
}
.student-list-modern .data-table-wrap {
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: auto;
  background: #fff;
}
.student-list-modern .data-table {
  border-collapse: separate;
  border-spacing: 0 8px;
}
.student-list-modern .data-table tbody tr {
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
}
.student-list-modern .data-table tbody tr td {
  background: inherit;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}
.student-list-modern .data-table tbody tr td:first-child {
  border-left: 1px solid rgba(148, 163, 184, 0.25);
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}
.student-list-modern .data-table tbody tr td:last-child {
  border-right: 1px solid rgba(148, 163, 184, 0.25);
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}
.student-list-modern .fee-range-text {
  color: #4b5774;
}
.student-list-modern .fee-range-text.danger {
  color: #b91c1c;
  font-weight: 700;
  animation: feeRangeBounce 1.1s ease-in-out infinite;
}
@keyframes feeRangeBounce {
  0%, 100% { transform: translateY(0); }
  35% { transform: translateY(-2px); }
  70% { transform: translateY(1px); }
}
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
}
.card-grid.roomy { gap: 16px; }
.student-card {
  background: linear-gradient(145deg, #fdfdff, #f2f6ff);
  border: 1px solid #e1e7fb;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 16px 30px rgba(31,63,156,0.10);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.student-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 36px rgba(31,63,156,0.14);
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.title-wrap { display: flex; gap: 10px; align-items: center; }
.avatar-circle {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(145deg,#4f8bff,#7a63ff);
  color: #fff; display: grid; place-items: center;
  font-weight: 800; letter-spacing: 0.5px;
}
.card-title { font-weight: 800; color: var(--text-primary); }
.card-sub { color: var(--text-secondary); font-size: 12px; display: flex; gap: 6px; align-items: center; }
.card-row { display: flex; justify-content: space-between; gap: 10px; color: var(--text-secondary); font-size: 13px; }
.card-row strong { color: var(--text-primary); }
.card-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.status-chip { padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; }
.status-chip.active { background: rgba(22, 163, 74, 0.12); color: var(--success); border:1px solid rgba(22, 163, 74, 0.2); }
.status-chip.inactive { background: rgba(220, 38, 38, 0.1); color: var(--error); border:1px solid rgba(220, 38, 38, 0.18); }
.inline-edit { margin-top: 10px; padding: 10px; border: 1px dashed #dfe4f4; border-radius: 10px; display: grid; gap: 8px; }
.inline-edit input, .inline-edit select { width: 100%; padding: 8px; border: 1px solid #dfe4f4; border-radius: 8px; }
.inline-edit-actions { display: flex; gap: 8px; }
.student-action-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  margin-left: 12px;
  margin-right: 12px;
  padding: 12px;
  border-radius: 10px;
  box-shadow: 0 12px 26px rgba(17, 24, 39, 0.08);
  border: 1px solid var(--border);
  background: var(--card);
}
.action-chip {
  border-color: var(--border);
  border-radius: 10px;
  box-shadow: 0 6px 14px rgba(17, 24, 39, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}
.action-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(17, 24, 39, 0.1);
}
.action-chip.active { background: rgba(37, 99, 235, 0.12); border-color: var(--primary); color: var(--primary); }
.student-delete-btn {
  border-radius: 10px;
  background: var(--error);
  border: 1px solid var(--error);
  color: #fff;
  box-shadow: 0 10px 18px rgba(220, 38, 38, 0.18);
}
.student-delete-btn:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}
.student-expand-divider {
  width: calc(100% - 24px);
  margin-left: 12px;
  margin-right: 12px;
  margin-top: 14px;
  border-top: 3px solid rgba(37, 99, 235, 0.22);
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.08);
  border-radius: 10px;
}
.student-expand-card {
  margin-left: 12px;
  margin-right: 12px;
  border-radius: 10px;
  border: 1px solid rgba(37, 99, 235, 0.12);
  background: var(--card);
  box-shadow: 0 14px 28px rgba(17, 24, 39, 0.08);
  overflow: hidden;
}
.primary-btn.active { box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2); }
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 8px 0 12px;
}
.toolbar .search {
  flex: 1;
  min-width: 220px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}
.student-subview-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 12px;
}
.student-subview-chip {
  border: 1px solid var(--border);
  background: #f4f7ff;
  color: #1f2d55;
  border-radius: 999px;
  padding: 6px 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 700;
}
.student-subview-chip span {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  background: rgba(23, 36, 76, 0.1);
  color: #17244c;
  display: grid;
  place-items: center;
  font-size: 11px;
}
.student-subview-chip.active {
  border-color: #17244c;
  background: linear-gradient(180deg, #243056, #17203e);
  color: #f6f9ff;
  box-shadow: 0 10px 20px rgba(12, 18, 40, 0.2);
}
.student-subview-chip.active span {
  background: rgba(255, 255, 255, 0.2);
  color: #f6f9ff;
}
.list-index-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: -6px 0 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-weight: 700;
}
.top-pagination {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-left: auto;
}
.page-chip {
  min-width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.05);
  color: var(--primary);
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.18s ease;
}
.page-chip.active {
  background: linear-gradient(135deg, var(--primary), var(--primary-hover));
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 10px 18px rgba(35,68,178,0.2);
}
.page-chip:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.form-card h4 { margin-bottom: 8px; }
.form-card p { margin-bottom: 12px; color: var(--text-secondary); }
.grid.spacious { gap: 12px; }
.form-card label { font-weight: 600; color: var(--text-primary); display: flex; flex-direction: column; gap: 6px; }
.form-card input, .form-card select { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 10px; }
.pill-list { display: grid; gap: 8px; margin-top: 8px; }
.pill-row { border: 1px solid var(--border); border-radius: 10px; padding: 10px; background: rgba(37, 99, 235, 0.05); display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; }
.pill-row.column { grid-template-columns: 1fr; }
.pill-line { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: var(--text-primary); }
.pill-line span { color: var(--text-secondary); }
.calendar-grid { margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit,minmax(90px,1fr)); gap:8px; }
.cal-cell { border:1px solid #e5e9f7; border-radius:10px; padding:8px; background:#fff; }
.cal-cell.full { background:#e8f8f0; border-color:#c8eedc; }
.cal-cell.in { background:#fff7e6; border-color:#f3d9a5; }
.cal-cell.miss { background:#ffecec; border-color:#f1b6b6; }
.cal-date { font-weight:800; color:var(--text-primary); }
.cal-time { font-size:12px; color:var(--text-secondary); margin-top:4px; line-height:16px; }
.cal-loc a { font-size:12px; color:var(--info); }

@media (max-width: 768px) {
  .student-card { padding: 12px; }
  .card-title { font-size: 15px; }
  .card-row { font-size: 12px; flex-direction: column; gap: 6px; }
  .card-actions { flex-direction: column; }
}
  .fee-summary{
  display:flex;
  gap:10px;
  margin-top:12px;
  margin-bottom:12px;
}

.fee-box{
  flex:1;
  padding:10px;
  border-radius:10px;
  background:#dfe7ff;
  text-align:center;
  font-size:12px;
}

.fee-box span{
  display:block;
  color:var(--text-secondary);
  font-size:11px;
}

.fee-box strong{
  font-size:15px;
  color:var(--text-primary);
}

.fee-box.paid{
  background:#bfe8cb;
}

.fee-box.due{
  background:#f2b1b1;
}

.section-title{
  font-size:13px;
  font-weight:700;
  margin-bottom:8px;
  color:var(--text-primary);
}

.payment-cards{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
  gap:8px;
}

.payment-card{
  border:1px solid #9bb0df;
  border-radius:10px;
  padding:10px;
  background:#eaf0ff;
  font-size:12px;
}

.payment-row{
  display:flex;
  justify-content:space-between;
  margin-bottom:4px;
}

.payment-row span{
  color:var(--text-secondary);
}

.empty-note{  
  font-size:12px;
  color:var(--text-secondary);
}
`;

if (typeof document !== 'undefined' && !document.getElementById('student-list-css')) {
  const tag = document.createElement('style');
  tag.id = 'student-list-css';
  tag.innerHTML = css;
  document.head.appendChild(tag);
}
