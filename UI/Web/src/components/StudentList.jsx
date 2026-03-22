import { useEffect, useState, Fragment } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import StudentAdmissionForm from './StudentAdmissionForm';
import VectorIcon from './VectorIcon';

const DEFAULT_API_URL = import.meta.env.DEV
  ? 'http://localhost:4000/api/v1'
  : 'https://baliraja-mangment.onrender.com/api/v1';

export default function StudentList() {
  const { user } = useAuth() || {};
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    status: 'active'
  });
  const [pendingFees, setPendingFees] = useState({});
  const [feeMeta, setFeeMeta] = useState({});
  const [collectionRange, setCollectionRange] = useState('month');
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
  load();

  if (user?.role === 'super_admin' || user?.role === 'admin') {
    loadComplaints();
    loadLeaves();
  }
}, [user]);

useEffect(() => {
  const term = search.trim();
  const handler = setTimeout(() => {
    if (!term) {
      setError('');
      return;
    }
    searchStudents(term);
  }, 350);
  return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [search]);

  async function load(term) {
    setLoading(true);
    try {
      const [{ data: studentData }, { data: feeData }] = await Promise.all([
        api.get('/students', { params: term ? { q: term, limit: 50 } : { limit: 50 } }),
        api.get('/fees/list')
      ]);
      setStudents(studentData || []);
      const map = {};
      const meta = {};
      let totalCollected = 0;
      let totalPending = 0;
      feeData.forEach((f) => {
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
    await load(term);
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

  // no auto-open; sub-views open only on explicit click

  const filteredStudents = students;
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
    phone: s.userId?.phone || '',
    status: s.status || 'active'
  });
}

  async function saveEdit(id) {
    try {
      await api.put(`/students/${id}`, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        status: editForm.status
      });
      setEditing(null);
      setActiveAction({ type: null, studentId: null });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update student');
    }
  }

  async function downloadPdf(id) {
    const token = localStorage.getItem('ims_token') || localStorage.getItem('token');
    const url = `${(import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '')}/students/${id}/pdf`;
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
    try {
      await api.put(`/fees/${feeEdit._id}`, {
        totalAmount: user?.role === 'super_admin' ? feeEdit.totalAmount : undefined,
        paidAmount: feeEdit.paidAmount,
        dueDate: feeEdit.dueDate,
        feeStartDate: feeEdit.feeStartDate,
        feeEndDate: feeEdit.feeEndDate,
        reason: feeReason.trim()
      });
      setFeeEdit(null);
      setPayNow(null);
      setFeeReason('');
      setDetailPanel({ type:null, studentId:null });
      setActiveAction({ type: null, studentId: null });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update fee');
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
      await load(); // refresh list due/paid values
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to add payment');
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
          <option value="week">This week</option>
          <option value="month">This month</option>
            <option value="year">This year</option>
            <option value="all">All time</option>
          </select>
          {collection && (
            <span style={{ color: '#0f7d49', fontWeight: 700 }}>
              ₹{collection.collected || 0} / {collection.count || 0} txn
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontWeight: 700, color: '#1f2f75' }}>
            Year Collected: ₹{yearlyTotals.collected} | Pending: ₹{yearlyTotals.pending}
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
      <div className="card" style={{ padding: 0 }}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student</th>
                <th>Contact</th>
                <th>Batch</th>
                <th>Fees</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ padding: 16 }}>Loading students...</td></tr>
              )}
              {!loading && filteredStudents.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 16 }}>No data available. Try another search term.</td></tr>
              )}
              {!loading && filteredStudents.map((student, idx) => {
                const feeInfo = feeMeta[student._id];
                const due = pendingFees[student._id]?.dueAmount ?? 0;
                const highlightBg =
                  due > 0 && (pendingFees[student._id]?.paidAmount || feeInfo?.paid)
                    ? '#fff7e6'
                    : due > 0
                      ? '#ffecec'
                      : '#f3fff3';
                return (
                  <Fragment key={student._id}>
                    <tr style={{ background: highlightBg }}>
                      <td>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{student.userId?.fullName || 'N/A'}</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>ID: {student.enrollmentNo}</div>
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
                              <div style={{ color: '#4b5774', fontSize: 12 }}>
                                Range: {feeInfo.start ? new Date(feeInfo.start).toLocaleDateString() : '—'} - {feeInfo.end ? new Date(feeInfo.end).toLocaleDateString() : '—'}
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
                      <td colSpan={6} style={{ paddingTop: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 10,
                            marginTop: 8,
                            padding: 10,
                            borderRadius: 10,
                            boxShadow: '0 8px 18px rgba(0,0,0,0.07)',
                            border: '1px solid #e6e9f3',
                            background: '#fff'
                          }}
                        >
                          <button className="ghost-btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={()=>startEdit(student)}>Edit Info</button>
                          {user?.role === 'super_admin' && (
                            <button className="ghost-btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={()=>openFeeEditor(student._id)}>Edit Fee</button>
                          )}
                          <button className="ghost-btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={()=>openPayNow(student._id)}>Submit Fees</button>
                          <button className="ghost-btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={()=>{ setMasterEditId(student._id); setActiveAction({ type: 'master', studentId: student._id }); }}>Open Master</button>
                          <button className="ghost-btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={()=>downloadPdf(student._id)}>PDF</button>
                          {(user?.role === 'super_admin' || user?.role === 'admin') && (
                            <>
                              <button
                                className="ghost-btn"
                                style={{ padding: '6px 10px', fontSize: 13 }}
                                onClick={()=>toggleDetail(student._id,'complaints')}
                              >
                                Complaints
                              </button>
                              <button
                                className="ghost-btn"
                                style={{ padding: '6px 10px', fontSize: 13 }}
                                onClick={()=>toggleDetail(student._id,'leaves')}
                              >
                                Leave Requests
                              </button>
                            </>
                          )}
                          <button className="danger-btn" style={{ padding: '6px 10px', fontSize: 13 }} onClick={async ()=>{
                            if (!window.confirm('Delete this student and related fee records?')) return;
                            try {
                              await api.delete(`/students/${student._id}`);
                              await load();
                            } catch (err) {
                              setError(err?.response?.data?.message || 'Unable to delete');
                            }
                          }}>Delete</button>
                        </div>
                        <div style={{
                          marginTop: 12,
                          borderTop: '2px dashed #c9d3e6',
                          borderRadius: 10
                        }} />
                      </td>
                    </tr>
                    {editing === student._id && (
                      <tr>
                        <td colSpan={6}>
                          <div className="inline-edit">
                            <label>Name <input value={editForm.fullName} onChange={(e)=>setEditForm({...editForm, fullName:e.target.value})} /></label>
                            <label>Phone <input value={editForm.phone} onChange={(e)=>setEditForm({...editForm, phone:e.target.value})} /></label>
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
                        <td colSpan={6}>
                          <div className="inline-edit" style={{ marginTop: 4 }}>
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
                        <td colSpan={6}>
                          <div className="inline-edit" style={{ marginTop: 4 }}>
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
                        <td colSpan={6}>
                          <div className="card" style={{ marginTop: 6 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <h4>Edit in Master Form</h4>
                              <button className="ghost-btn" onClick={()=>{ setMasterEditId(null); setActiveAction({ type: null, studentId: null }); }}>Close</button>
                            </div>
                            <StudentAdmissionForm editId={student._id} onSaved={()=>{ setMasterEditId(null); setActiveAction({ type: null, studentId: null }); load(); }} />
                          </div>
                        </td>
                      </tr>
                    )}
                    {activeAction.type === 'fee' && activeAction.studentId === student._id && feeEdit && (
                      <tr>
                        <td colSpan={6}>
                          <div className="card form-card" style={{ marginTop: 6 }}>
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
                                <input type="number" value={feeEdit.paidAmount} onChange={(e)=>setFeeEdit({...feeEdit, paidAmount:Number(e.target.value)})} />
                              </label>
                              <label>
                                Due Date
                                <input type="date" value={feeEdit.dueDate?.substring?.(0,10) || ''} onChange={(e)=>setFeeEdit({...feeEdit, dueDate:e.target.value})} />
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
                              <button className="primary-btn" onClick={saveFeeEdit}>Save Fee</button>
                              <button className="ghost-btn" onClick={()=>addPayment()}>Add Payment</button>
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
                        <td colSpan={6}>
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
                              <button className="primary-btn" onClick={addPayment}>Submit Payment</button>
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
.card-title { font-weight: 800; color: #1f2f75; }
.card-sub { color: #5f6c93; font-size: 12px; display: flex; gap: 6px; align-items: center; }
.card-row { display: flex; justify-content: space-between; gap: 10px; color: #4a5674; font-size: 13px; }
.card-row strong { color: #1f2f75; }
.card-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
.status-chip { padding: 5px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.3px; }
.status-chip.active { background: #e3f8ef; color: #0b8a4a; border:1px solid #bfe7d2; }
.status-chip.inactive { background: #fff1f1; color: #c0392b; border:1px solid #f5c5c5; }
.inline-edit { margin-top: 10px; padding: 10px; border: 1px dashed #dfe4f4; border-radius: 10px; display: grid; gap: 8px; }
.inline-edit input, .inline-edit select { width: 100%; padding: 8px; border: 1px solid #dfe4f4; border-radius: 8px; }
.inline-edit-actions { display: flex; gap: 8px; }
.action-chip { border-color: #cfd8f6; }
.action-chip.active { background: #e8edff; border-color: #6a7be7; color: #1f2f75; }
.primary-btn.active { box-shadow: 0 0 0 2px #d8ddff; }
.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 12px;
}
.toolbar .search {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #dfe4f4;
  border-radius: 10px;
  background: #fff;
  font-size: 14px;
}
.form-card h4 { margin-bottom: 8px; }
.form-card p { margin-bottom: 12px; color: #4a5674; }
.grid.spacious { gap: 12px; }
.form-card label { font-weight: 600; color: #1f2f75; display: flex; flex-direction: column; gap: 6px; }
.form-card input, .form-card select { width: 100%; padding: 10px; border: 1px solid #dfe4f4; border-radius: 10px; }
.pill-list { display: grid; gap: 8px; margin-top: 8px; }
.pill-row { border: 1px solid #e6e9f3; border-radius: 10px; padding: 10px; background: #fbfcff; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 6px; }
.pill-row.column { grid-template-columns: 1fr; }
.pill-line { display: flex; justify-content: space-between; gap: 10px; font-size: 13px; color: #1f2f75; }
.pill-line span { color: #6c7595; }
.calendar-grid { margin-top:12px; display:grid; grid-template-columns: repeat(auto-fit,minmax(90px,1fr)); gap:8px; }
.cal-cell { border:1px solid #e5e9f7; border-radius:10px; padding:8px; background:#fff; }
.cal-cell.full { background:#e8f8f0; border-color:#c8eedc; }
.cal-cell.in { background:#fff7e6; border-color:#f3d9a5; }
.cal-cell.miss { background:#ffecec; border-color:#f1b6b6; }
.cal-date { font-weight:800; color:#1f2f75; }
.cal-time { font-size:12px; color:#6c7595; margin-top:4px; line-height:16px; }
.cal-loc a { font-size:12px; color:#2f6be0; }

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
  background:#f6f8ff;
  text-align:center;
  font-size:12px;
}

.fee-box span{
  display:block;
  color:#6c7595;
  font-size:11px;
}

.fee-box strong{
  font-size:15px;
  color:#1f2f75;
}

.fee-box.paid{
  background:#e8f8f0;
}

.fee-box.due{
  background:#ffecec;
}

.section-title{
  font-size:13px;
  font-weight:700;
  margin-bottom:8px;
  color:#1f2f75;
}

.payment-cards{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
  gap:8px;
}

.payment-card{
  border:1px solid #e6e9f3;
  border-radius:10px;
  padding:10px;
  background:#fbfcff;
  font-size:12px;
}

.payment-row{
  display:flex;
  justify-content:space-between;
  margin-bottom:4px;
}

.payment-row span{
  color:#6c7595;
}

.empty-note{  
  font-size:12px;
  color:#6c7595;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('student-list-css')) {
  const tag = document.createElement('style');
  tag.id = 'student-list-css';
  tag.innerHTML = css;
  document.head.appendChild(tag);
}
