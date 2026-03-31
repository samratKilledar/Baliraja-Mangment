import { useEffect, useMemo, useState } from 'react';
import api from '../api/client';
import VectorIcon from './VectorIcon';

const RESOURCES = {
  users: {
    label: 'Users',
    listPath: '/users',
    deletePath: (id) => `/users/${id}`,
    columns: ['fullName', 'email', 'role', 'phone']
  },
  students: {
    label: 'Students',
    listPath: '/students',
    deletePath: (id) => `/students/${id}`,
    columns: ['enrollmentNo', 'userId.fullName', 'userId.email', 'status']
  },
  complaints: {
    label: 'Complaints',
    listPath: '/complaints',
    deletePath: (id) => `/complaints/${id}`,
    columns: ['title', 'status', 'userId.email', 'createdAt']
  },
  notices: {
    label: 'Notices',
    listPath: '/notices',
    deletePath: (id) => `/notices/${id}`,
    columns: ['title', 'audience', 'createdAt']
  },
  leaves: {
    label: 'Applied Leaves',
    listPath: '/attendance/leaves',
    deletePath: (id) => `/attendance/leaves/${id}`,
    columns: ['studentId.enrollmentNo', 'studentId.userId.fullName', 'leaveFrom', 'leaveTo', 'leaveStatus', 'leaveReason']
  }
};

function pick(obj, path, fallback = '-') {
  if (!obj) return fallback;
  const parts = path.split('.');
  let val = obj;
  for (const p of parts) {
    if (val && Object.prototype.hasOwnProperty.call(val, p)) {
      val = val[p];
    } else {
      return fallback;
    }
  }
  if (val === undefined || val === null || val === '') return fallback;
  if (typeof val === 'string' && (!isNaN(Date.parse(val)) || path.toLowerCase().includes('date') || path.toLowerCase().includes('leavefrom') || path.toLowerCase().includes('leaveto'))) {
    try {
      return new Date(val).toLocaleString();
    } catch {
      return val;
    }
  }
  return val;
}

export default function DataCleanup() {
  const [resourceKey, setResourceKey] = useState('users');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState([]);
  const [actionBusyKey, setActionBusyKey] = useState('');

  const resource = useMemo(() => RESOURCES[resourceKey], [resourceKey]);
  const showIndex = rows.length > 10;

  async function load() {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(resource.listPath, { params: { page: 1, limit: 100 } });
      const nextRows = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
      setRows(nextRows);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to load data';
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [resourceKey]);

  function rowKeyFor(id) {
    return `${resourceKey}:${id}`;
  }

  function markDeletePending(id) {
    const key = rowKeyFor(id);
    setPendingDeleteKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }

  function restorePending(id) {
    const key = rowKeyFor(id);
    setPendingDeleteKeys((prev) => prev.filter((item) => item !== key));
  }

  async function handlePermanentDelete(id, label) {
    const ok = window.confirm(`Permanently delete ${label || 'this record'}? This cannot be undone.`);
    if (!ok) return;
    const rowKey = rowKeyFor(id);
    setActionBusyKey(rowKey);
    try {
      await api.delete(resource.deletePath(id));
      setRows((prev) => prev.filter((r) => (r._id || r.id) !== id));
      setPendingDeleteKeys((prev) => prev.filter((item) => item !== rowKey));
    } catch (err) {
      const msg = err?.response?.data?.message || 'Delete failed';
      alert(msg);
    } finally {
      setActionBusyKey('');
    }
  }

  return (
    <div style={styles.card}>
      <div style={styles.head}>
        <div style={styles.headInfo}>
          <VectorIcon name="trash" size={18} />
          <div>
            <h3 style={styles.title}>Data Cleanup</h3>
            <p style={styles.subtitle}>Review and permanently delete records to free storage.</p>
          </div>
        </div>
        <div style={styles.headActions}>
          <select
            value={resourceKey}
            onChange={(e) => setResourceKey(e.target.value)}
            style={styles.select}
          >
            {Object.entries(RESOURCES).map(([key, val]) => (
              <option key={key} value={key}>
                {val.label}
              </option>
            ))}
          </select>
          <button style={styles.refreshBtn} onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {rows.length === 0 && !loading ? (
        <p style={styles.muted}>No records found.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {showIndex ? <th style={styles.th}>#</th> : null}
                {resource.columns.map((c) => (
                  <th key={c} style={styles.th}>{c}</th>
                ))}
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const id = row._id || row.id;
                const rowKey = rowKeyFor(id);
                const isPendingDelete = pendingDeleteKeys.includes(rowKey);
                const isBusy = actionBusyKey === rowKey;
                const isProtectedUser = resourceKey === 'users' && String(row.role || '').toLowerCase() === 'super_admin';
                return (
                  <tr key={id}>
                    {showIndex ? <td style={styles.td}>{idx + 1}</td> : null}
                    {resource.columns.map((c) => (
                      <td key={c} style={styles.td}>{pick(row, c)}</td>
                    ))}
                    <td style={styles.td}>
                      <div style={styles.actionRow}>
                        {isProtectedUser ? (
                          <span style={styles.protectedTag}>Protected</span>
                        ) : !isPendingDelete ? (
                          <button
                            style={styles.deleteBtn}
                            onClick={() => markDeletePending(id)}
                            disabled={isBusy}
                          >
                            Delete
                          </button>
                        ) : (
                          <>
                            <button
                              style={styles.restoreBtn}
                              onClick={() => restorePending(id)}
                              disabled={isBusy}
                            >
                              Restore
                            </button>
                            <button
                              style={styles.deleteNowBtn}
                              onClick={() => handlePermanentDelete(id, pick(row, resource.columns[0]))}
                              disabled={isBusy}
                            >
                              {isBusy ? 'Deleting...' : 'Delete Permanently'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: 16,
    boxShadow: '0 10px 28px rgba(20,31,66,0.1)',
    border: '1px solid #e6eaf2'
  },
  head: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12
  },
  headInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: '1 1 280px'
  },
  headActions: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: '0 1 auto'
  },
  title: { margin: 0, fontSize: 18 },
  subtitle: { margin: 0, color: '#566074', fontSize: 13 },
  select: {
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #d3d9e6',
    background: '#f8f9fb',
    minWidth: 140
  },
  refreshBtn: {
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid #d3d9e6',
    background: '#1f6feb',
    color: '#fff',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    minWidth: 92,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: 720
  },
  th: {
    textAlign: 'left',
    padding: '10px 8px',
    background: '#f3f6fb',
    borderBottom: '1px solid #e3e7f0',
    fontSize: 13,
    color: '#3c4760'
  },
  td: {
    padding: '10px 8px',
    borderBottom: '1px solid #eef1f6',
    fontSize: 13,
    color: '#1f2a44'
  },
  deleteBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #ffb3b8',
    background: '#ffecef',
    color: '#d93025',
    cursor: 'pointer'
  },
  actionRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'nowrap',
    alignItems: 'center'
  },
  restoreBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #9ad8b0',
    background: '#e8fbef',
    color: '#166534',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  deleteNowBtn: {
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid #ffb3b8',
    background: '#ffecef',
    color: '#d93025',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  protectedTag: {
    padding: '4px 8px',
    borderRadius: 999,
    border: '1px solid #c5d1e8',
    color: '#4c5a77',
    fontSize: 12,
    background: '#f5f8ff'
  },
  muted: { color: '#77819a', fontSize: 13 },
  error: { color: '#d93025', marginBottom: 8 }
};
