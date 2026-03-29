import { Fragment, useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import VectorIcon from './VectorIcon';

export default function TeacherList() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    specialization: '',
    experienceYears: '',
    contractStart: '',
    contractEnd: '',
    totalContractAmount: '',
    monthlySalary: ''
  });
  const [payInput, setPayInput] = useState({ id: null, amount: '', note: '', paymentType: 'contract', monthOf: '' });
  const [activeAction, setActiveAction] = useState({ type: null, teacherId: null });
  const [attendance, setAttendance] = useState({});
  const [lectures, setLectures] = useState({});
  const [showPasswords, setShowPasswords] = useState({});
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [extendForm, setExtendForm] = useState({ months: '', date: '', note: '' });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data } = await api.get('/teachers');
      setTeachers(data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to fetch teachers');
    }
  }

  const visibleTeachers = teachers.filter((teacher) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    const haystack = [
      teacher.userId?.fullName,
      teacher.userId?.phone,
      teacher.userId?.email,
      ...(teacher.specialization || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  });

  function startEdit(t) {
    setActiveAction({ type: null, teacherId: null });
    setEditing(t._id);
    setEditForm({
      fullName: t.userId?.fullName || '',
      phone: t.userId?.phone || '',
      specialization: (t.specialization || []).join(', '),
      experienceYears: t.experienceYears || '',
      contractStart: t.contractStart ? t.contractStart.slice(0, 10) : '',
      contractEnd: t.contractEnd ? t.contractEnd.slice(0, 10) : '',
      totalContractAmount: t.totalContractAmount ?? '',
      monthlySalary: t.monthlySalary ?? ''
    });
  }

  function togglePassword(teacherId) {
    setShowPasswords((prev) => ({ ...prev, [teacherId]: !prev[teacherId] }));
  }

  async function saveEdit(id) {
    try {
      await api.put(`/teachers/${id}`, {
        fullName: editForm.fullName,
        phone: editForm.phone,
        specialization: editForm.specialization.split(',').map((s) => s.trim()).filter(Boolean),
        experienceYears: editForm.experienceYears ? Number(editForm.experienceYears) : undefined,
        contractStart: editForm.contractStart || undefined,
        contractEnd: editForm.contractEnd || undefined,
        totalContractAmount: user?.role === 'super_admin' && editForm.totalContractAmount !== '' ? Number(editForm.totalContractAmount) : undefined,
        monthlySalary: editForm.monthlySalary !== '' ? Number(editForm.monthlySalary) : undefined
      });
      setEditing(null);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to update teacher');
    }
  }

  async function addPayment(id) {
    try {
      if (!payInput.amount) return;
      await api.post(`/teachers/${id}/payments`, {
        amount: Number(payInput.amount),
        note: payInput.note,
        paymentType: payInput.paymentType,
        monthOf: payInput.monthOf ? new Date(`${payInput.monthOf}-01`).toISOString() : undefined
      });
      setPayInput({ id: null, amount: '', note: '', paymentType: 'contract', monthOf: '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to add payment');
    }
  }

  async function openAction(teacherId, type) {
    if (activeAction.teacherId === teacherId && activeAction.type === type) {
      setActiveAction({ type: null, teacherId: null });
      return;
    }
    setActiveAction({ type, teacherId });
    setEditing(null);

    if (type === 'attendance' && !attendance[teacherId]) {
      setLoadingDetail(true);
      try {
        const { data } = await api.get(`/teachers/${teacherId}/attendance`);
        setAttendance((prev) => ({ ...prev, [teacherId]: data }));
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load attendance');
      } finally {
        setLoadingDetail(false);
      }
    }
    if (type === 'lectures' && !lectures[teacherId]) {
      setLoadingDetail(true);
      try {
        const { data } = await api.get(`/teachers/${teacherId}/lectures`);
        setLectures((prev) => ({ ...prev, [teacherId]: data }));
      } catch (err) {
        setError(err?.response?.data?.message || 'Unable to load lectures');
      } finally {
        setLoadingDetail(false);
      }
    }
  }

  async function extendContract(teacherId) {
    try {
      await api.post(`/teachers/${teacherId}/extend-contract`, {
        extendMonths: extendForm.months ? Number(extendForm.months) : undefined,
        newEndDate: extendForm.date || undefined,
        note: extendForm.note || undefined
      });
      setExtendForm({ months: '', date: '', note: '' });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to extend contract');
    }
  }

  return (
    <div className="teacher-list-modern">
      <div className="teacher-list-toolbar">
        <input
          className="teacher-search"
          placeholder="Search by teacher name, phone, email or subject"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}

      <div className="card" style={{ padding: 0 }}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="teacher-index-col">#</th>
                <th>Teacher</th>
                <th>Contact</th>
                <th>Contract & Payments</th>
                <th>Salary</th>
                <th>Lectures</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleTeachers.map((t, idx) => {
                const remaining =
                  t.remainingAmount ??
                  (t.totalContractAmount !== undefined ? t.totalContractAmount - (t.paidAmount || 0) : null);
                const payments = (t.payments || []).slice().sort((a, b) => new Date(b.paidOn) - new Date(a.paidOn));
                const lecturesInfo = lectures[t._id];
                const attendanceInfo = attendance[t._id];
                const isActive = (kind) => activeAction.teacherId === t._id && activeAction.type === kind;
                const rowBg =
                  remaining !== null && remaining > 0
                    ? '#fff7e6'
                    : '#f3fff3';

                return (
                  <Fragment key={t._id}>
                    <tr style={{ background: rowBg }}>
                      <td className="teacher-index-col">{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{t.userId?.fullName || 'Teacher'}</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>
                          Spec: {(t.specialization || []).join(', ') || '—'}
                        </div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>Exp: {t.experienceYears || 0} yrs</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>
                          Contract: {t.contractStart ? t.contractStart.slice(0, 10) : '—'} →{' '}
                          {t.contractEnd ? t.contractEnd.slice(0, 10) : '—'}
                        </div>
                      </td>
                      <td>
                        <div>
                          <VectorIcon name="phone" size={12} /> {t.userId?.phone || '—'}
                        </div>
                        <div>
                          <VectorIcon name="mail" size={12} /> {t.userId?.email || '—'}
                        </div>
                        {(user?.role === 'super_admin' || user?.role === 'admin') && (
                          <div style={{ marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 12, color: '#4b5774' }}>
                              Password: {showPasswords[t._id] ? (t.userId?.passwordVisible || '123456') : '******'}
                            </span>
                            <button
                              type="button"
                              className="ghost-btn"
                              onClick={() => togglePassword(t._id)}
                              title={showPasswords[t._id] ? 'Hide password' : 'Show password'}
                              style={{ marginTop: 0, width: 'auto', padding: '6px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center' }}
                            >
                              <VectorIcon name={showPasswords[t._id] ? 'eyeOff' : 'eye'} size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td>
                        <div>Paid: ₹{t.paidAmount || 0}</div>
                        <div>Remaining: {remaining !== null ? `₹${remaining}` : '—'}</div>
                        {user?.role === 'super_admin' && (
                          <div style={{ color: '#4b5774', fontSize: 12 }}>Total: ₹{t.totalContractAmount ?? '—'}</div>
                        )}
                      </td>
                      <td>
                        <div>Monthly: ₹{t.monthlySalary || 0}</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>Salary paid: ₹{t.salaryPaidAmount || 0}</div>
                      </td>
                      <td>
                        <div>Total: {t.totalLectures || 0}</div>
                        <div style={{ color: '#4b5774', fontSize: 12 }}>Hours: {t.totalLectureHours || 0}</div>
                        <button className="ghost-btn" onClick={() => openAction(t._id, 'lectures')}>
                          {isActive('lectures') ? 'Hide' : 'Open'}
                        </button>
                      </td>
                      <td>
                        <span className="status-chip active">active</span>
                      </td>
                    </tr>

                    <tr>
                      <td colSpan={7} style={{ paddingTop: 0 }}>
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
                          <button className="ghost-btn" onClick={() => startEdit(t)}>
                            Edit Info
                          </button>
                          <button
                            className={`ghost-btn ${isActive('payment') ? 'action-chip active' : 'action-chip'}`}
                            onClick={() => {
                              setPayInput({ id: t._id, amount: '', note: '', paymentType: 'contract', monthOf: '' });
                              openAction(t._id, 'payment');
                            }}
                          >
                            Payment
                          </button>
                          <button
                            className={`ghost-btn ${isActive('attendance') ? 'action-chip active' : 'action-chip'}`}
                            onClick={() => openAction(t._id, 'attendance')}
                          >
                            Attendance
                          </button>
                          <button
                            className={`ghost-btn ${isActive('lectures') ? 'action-chip active' : 'action-chip'}`}
                            onClick={() => openAction(t._id, 'lectures')}
                          >
                            Lectures
                          </button>
                          <button
                            className={`ghost-btn ${isActive('notes') ? 'action-chip active' : 'action-chip'}`}
                            onClick={() => openAction(t._id, 'notes')}
                          >
                            Payment Notes
                          </button>
                          <button
                            className="danger-btn"
                            onClick={async () => {
                              if (!window.confirm('Delete this teacher?')) return;
                              try {
                                await api.delete(`/teachers/${t._id}`);
                                await load();
                              } catch (err) {
                                setError(err?.response?.data?.message || 'Unable to delete');
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {editing === t._id && (
                      <tr>
                        <td colSpan={7}>
                          <div className="card form-card" style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4>Edit Teacher</h4>
                              <button className="ghost-btn" onClick={() => setEditing(null)}>
                                Close
                              </button>
                            </div>
                            <div className="grid two spacious">
                              <label>Name<input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} /></label>
                              <label>Phone<input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></label>
                              <label>Specialization<input value={editForm.specialization} onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })} placeholder="Comma separated" /></label>
                              <label>Experience (years)<input value={editForm.experienceYears} onChange={(e) => setEditForm({ ...editForm, experienceYears: e.target.value })} /></label>
                              <label>Contract Start<input type="date" value={editForm.contractStart} onChange={(e) => setEditForm({ ...editForm, contractStart: e.target.value })} /></label>
                              <label>Contract End<input type="date" value={editForm.contractEnd} onChange={(e) => setEditForm({ ...editForm, contractEnd: e.target.value })} /></label>
                              {user?.role === 'super_admin' && (
                                <label>Total Contract<input type="number" value={editForm.totalContractAmount} onChange={(e) => setEditForm({ ...editForm, totalContractAmount: e.target.value })} /></label>
                              )}
                              <label>Monthly Salary<input type="number" value={editForm.monthlySalary} onChange={(e) => setEditForm({ ...editForm, monthlySalary: e.target.value })} /></label>
                            </div>
                            <div className="inline-edit-actions">
                              <button className="primary-btn" onClick={() => saveEdit(t._id)}>Save</button>
                              <button className="ghost-btn" onClick={() => setEditing(null)}>Cancel</button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {isActive('payment') && (
                      <tr>
                        <td colSpan={7}>
                          <div className="card form-card" style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4>Payments</h4>
                              <button className="ghost-btn" onClick={() => setActiveAction({ type: null, teacherId: null })}>Close</button>
                            </div>
                            <div className="pill-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                              <div className="pill-line"><span>Contract Paid</span><strong>₹{t.paidAmount || 0}</strong></div>
                              <div className="pill-line"><span>Contract Remaining</span><strong>{remaining !== null ? `₹${remaining}` : '—'}</strong></div>
                              <div className="pill-line"><span>Salary Paid</span><strong>₹{t.salaryPaidAmount || 0}</strong></div>
                              <div className="pill-line"><span>Monthly Salary</span><strong>₹{t.monthlySalary || 0}</strong></div>
                            </div>
                            <div className="grid three spacious" style={{ marginTop: 10 }}>
                              <label>Amount<input type="number" value={payInput.id === t._id ? payInput.amount : ''} onChange={(e) => setPayInput({ ...payInput, id: t._id, amount: e.target.value })} /></label>
                              <label>Type
                                <select value={payInput.id === t._id ? payInput.paymentType : 'contract'} onChange={(e) => setPayInput({ ...payInput, id: t._id, paymentType: e.target.value })}>
                                  <option value="contract">Contract</option>
                                  <option value="salary">Salary</option>
                                </select>
                              </label>
                              {payInput.paymentType === 'salary' && (
                                <label>Month
                                  <input type="month" value={payInput.id === t._id ? payInput.monthOf : ''} onChange={(e) => setPayInput({ ...payInput, id: t._id, monthOf: e.target.value })} />
                                </label>
                              )}
                              <label style={{ gridColumn: '1/-1' }}>Note<input value={payInput.id === t._id ? payInput.note : ''} onChange={(e) => setPayInput({ ...payInput, id: t._id, note: e.target.value })} placeholder="Add payment note" /></label>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                              <button className="primary-btn" onClick={() => addPayment(t._id)}>Record Payment</button>
                              {(user?.role === 'super_admin' || user?.role === 'admin') && (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <input style={{ width: 80 }} type="number" placeholder="+Months" value={extendForm.months} onChange={(e) => setExtendForm({ ...extendForm, months: e.target.value })} />
                                  <input style={{ width: 150 }} type="date" value={extendForm.date} onChange={(e) => setExtendForm({ ...extendForm, date: e.target.value })} />
                                  <input style={{ width: 150 }} placeholder="Note" value={extendForm.note} onChange={(e) => setExtendForm({ ...extendForm, note: e.target.value })} />
                                  <button className="ghost-btn" onClick={() => extendContract(t._id)}>Extend Contract</button>
                                </div>
                              )}
                            </div>
                            <h5 className="section-title" style={{ marginTop: 12 }}>Payment Timeline</h5>
                            {payments.length ? (
                              <div className="pill-list">
                                {payments.map((p, pIdx) => (
                                  <div key={pIdx} className="pill-row column">
                                    <div className="pill-line"><span>Date</span><strong>{p.paidOn ? new Date(p.paidOn).toLocaleDateString() : '—'}</strong></div>
                                    <div className="pill-line"><span>Type</span><strong>{p.paymentType}</strong></div>
                                    <div className="pill-line"><span>Amount</span><strong>₹{p.amount}</strong></div>
                                    {p.monthOf ? <div className="pill-line"><span>Month Of</span><strong>{new Date(p.monthOf).toLocaleDateString()}</strong></div> : null}
                                    {p.note ? <div className="pill-line"><span>Note</span><strong>{p.note}</strong></div> : null}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="empty-note">No payments recorded yet</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {isActive('attendance') && (
                      <tr>
                        <td colSpan={7}>
                          <div className="card" style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4>Attendance (day wise)</h4>
                              <button className="ghost-btn" onClick={() => setActiveAction({ type: null, teacherId: null })}>Close</button>
                            </div>
                            {loadingDetail && !attendanceInfo ? (
                              <p>Loading...</p>
                            ) : (
                              <table className="data-table" style={{ marginTop: 8 }}>
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>In Time</th>
                                    <th>Out Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(attendanceInfo || []).map((a) => (
                                    <tr key={a._id}>
                                      <td>{a.date ? new Date(a.date).toLocaleDateString() : '—'}</td>
                                      <td>{a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString() : '—'}</td>
                                      <td>{a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString() : '—'}</td>
                                    </tr>
                                  ))}
                                  {!attendanceInfo?.length && (
                                    <tr>
                                      <td colSpan={3}>No attendance yet</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {isActive('lectures') && (
                      <tr>
                        <td colSpan={7}>
                          <div className="card" style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4>Lectures Logged</h4>
                              <button className="ghost-btn" onClick={() => setActiveAction({ type: null, teacherId: null })}>Close</button>
                            </div>
                            {loadingDetail && !lecturesInfo ? (
                              <p>Loading...</p>
                            ) : (
                              <div className="pill-list" style={{ marginTop: 8 }}>
                                {(lecturesInfo?.logs || []).map((l, lIdx) => (
                                  <div key={lIdx} className="pill-row column">
                                    <div className="pill-line"><span>Date</span><strong>{l.date ? new Date(l.date).toLocaleDateString() : '—'}</strong></div>
                                    <div className="pill-line"><span>Count</span><strong>{l.count || 0} lecture(s)</strong></div>
                                    <div className="pill-line"><span>Hours</span><strong>{l.hours != null ? l.hours : '—'}</strong></div>
                                    {(l.startTime || l.endTime) ? (
                                      <div className="pill-line"><span>Time</span><strong>{l.startTime ? new Date(l.startTime).toLocaleTimeString() : '—'} — {l.endTime ? new Date(l.endTime).toLocaleTimeString() : '—'}</strong></div>
                                    ) : null}
                                    {l.note ? <div className="pill-line"><span>Note</span><strong>{l.note}</strong></div> : null}
                                  </div>
                                ))}
                                {!lecturesInfo?.logs?.length && <p className="empty-note">No lectures logged</p>}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}

                    {isActive('notes') && (
                      <tr>
                        <td colSpan={7}>
                          <div className="card" style={{ marginTop: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <h4>Payment Notes</h4>
                              <button className="ghost-btn" onClick={() => setActiveAction({ type: null, teacherId: null })}>Close</button>
                            </div>
                            {payments.filter((p) => p.note).length ? (
                              <div className="pill-list" style={{ marginTop: 8 }}>
                                {payments
                                  .filter((p) => p.note)
                                  .map((p, pIdx) => (
                                    <div key={pIdx} className="pill-row column" style={{ background: '#f7f8ff' }}>
                                      <div className="pill-line"><span>Date</span><strong>{p.paidOn ? new Date(p.paidOn).toLocaleDateString() : '—'}</strong></div>
                                      <div className="pill-line"><span>Type</span><strong>{p.paymentType}</strong></div>
                                      <div className="pill-line"><span>Note</span><strong>{p.note}</strong></div>
                                    </div>
                                  ))}
                              </div>
                            ) : (
                              <p className="empty-note">No payment notes yet</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!visibleTeachers.length && (
                <tr>
                  <td colSpan={7} style={{ padding: 16 }}>No teachers found for this search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// scoped styles (align with student list look)
const css = `
.teacher-list-modern {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  font-size: 14px;
}
.teacher-list-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.teacher-search {
  width: 100%;
  min-width: 220px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card);
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 600;
}
.teacher-index-col {
  width: 52px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
}
.status-chip {
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  background: rgba(22, 163, 74, 0.12);
  color: var(--success);
  border: 1px solid rgba(22, 163, 74, 0.2);
}
.action-chip {
  border-color: var(--border);
}
.action-chip.active {
  background: rgba(37, 99, 235, 0.12);
  border-color: var(--primary);
  color: var(--primary);
}
.inline-edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.pill-row {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px;
  background: rgba(37, 99, 235, 0.04);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 6px;
}
.pill-row.column { grid-template-columns: 1fr; }
.pill-line {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  font-size: 13px;
  color: var(--text-primary);
}
.pill-line span { color: var(--text-secondary); }
.pill-list { display: grid; gap: 8px; }
.empty-note { font-size: 12px; color: var(--text-secondary); }
@media (max-width: 768px) {
  .data-table th, .data-table td { font-size: 12px; }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('teacher-list-css')) {
  const tag = document.createElement('style');
  tag.id = 'teacher-list-css';
  tag.innerHTML = css;
  document.head.appendChild(tag);
}
