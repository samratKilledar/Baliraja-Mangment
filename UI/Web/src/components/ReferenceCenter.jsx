import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const EMPTY_FORM = {
  studentName: '',
  mobileNo: '',
  address: '',
  note: ''
};

export default function ReferenceCenter({ mode = 'create' }) {
  const canCreate = mode === 'create' || mode === 'both';
  const canView = mode === 'list' || mode === 'both';
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1 });

  const loadReferences = useCallback(async (nextPage = 1, nextQuery = query) => {
    if (!canView) return;
    setLoading(true);
    try {
      const { data } = await api.get('/references', {
        params: {
          page: nextPage,
          limit: 20,
          q: nextQuery.trim() || undefined
        }
      });
      setItems(data?.items || []);
      setMeta(data?.meta || { page: nextPage, totalPages: 1 });
      setError('');
    } catch (err) {
      setItems([]);
      setMeta({ page: 1, totalPages: 1 });
      setError(err?.response?.data?.message || 'Unable to load references');
    } finally {
      setLoading(false);
    }
  }, [canView, query]);

  useEffect(() => {
    if (!canView) return;
    loadReferences(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  const sourceLabel = useMemo(() => ({
    android: 'Android',
    web: 'Web'
  }), []);

  async function submitReference(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        studentName: form.studentName.trim(),
        mobileNo: form.mobileNo.trim(),
        address: form.address.trim(),
        note: form.note.trim(),
        source: 'web'
      };
      await api.post('/references', payload);
      setForm(EMPTY_FORM);
      setSuccess('Reference submitted successfully.');
      if (canView) {
        loadReferences(1, query);
        setPage(1);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to submit reference');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card form-card" style={{ marginTop: 6 }}>
      {canCreate ? (
        <form onSubmit={submitReference}>
          <div className="grid two spacious">
            <label>
              Name of Student
              <input
                value={form.studentName}
                onChange={(e) => setForm((prev) => ({ ...prev, studentName: e.target.value }))}
                placeholder="Enter student name"
                required
              />
            </label>
            <label>
              Mobile No
              <input
                value={form.mobileNo}
                onChange={(e) => setForm((prev) => ({ ...prev, mobileNo: e.target.value }))}
                placeholder="Enter mobile number"
                required
              />
            </label>
            <label>
              Address
              <input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter address"
                required
              />
            </label>
            <label>
              Note
              <input
                value={form.note}
                onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Optional note"
              />
            </label>
          </div>
          <div className="inline-edit-actions">
            <button className="primary-btn" type="submit" disabled={saving}>
              {saving ? 'Submitting...' : 'Submit Reference'}
            </button>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setError('');
                setSuccess('');
              }}
              disabled={saving}
            >
              Clear
            </button>
          </div>
        </form>
      ) : null}

      {canView ? (
        <div style={{ marginTop: canCreate ? 18 : 0 }}>
          <div className="teacher-list-toolbar" style={{ marginBottom: 12 }}>
            <input
              className="teacher-search"
              placeholder="Search references by name, mobile, address or note"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                setPage(1);
                loadReferences(1, next);
              }}
            />
          </div>
          {loading ? <p className="graph-note">Loading references...</p> : null}
          {!loading && !items.length ? <p className="graph-note">No references found.</p> : null}
          <div style={{ display: 'grid', gap: 10 }}>
            {items.map((item) => (
              <article key={item._id} className="card" style={{ border: '1px solid #B7A8CF', borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <strong>{item.studentName}</strong>
                  <span className="status-chip active">{sourceLabel[item.source] || 'Web'}</span>
                </div>
                <p style={{ marginTop: 6, marginBottom: 0, color: '#4A3C64' }}>
                  Mobile: {item.mobileNo} | Address: {item.address}
                </p>
                {item.note ? <p style={{ marginTop: 6, marginBottom: 0 }}>Note: {item.note}</p> : null}
                <p style={{ marginTop: 6, marginBottom: 0, fontSize: 12, color: '#4A3C64' }}>
                  Submitted by: {item.createdBy?.fullName || item.createdByRole || 'Unknown'} | {new Date(item.createdAt).toLocaleString('en-IN')}
                </p>
              </article>
            ))}
          </div>
          {(meta.totalPages || 1) > 1 ? (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {Array.from({ length: meta.totalPages || 1 }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  key={pageNumber}
                  className={pageNumber === page ? 'primary-btn' : 'ghost-btn'}
                  onClick={() => {
                    setPage(pageNumber);
                    loadReferences(pageNumber, query);
                  }}
                  disabled={loading}
                >
                  {pageNumber}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="error" style={{ marginTop: 10 }}>{error}</p> : null}
      {success ? <p style={{ marginTop: 10, color: '#6D5A8E', fontWeight: 700 }}>{success}</p> : null}
    </div>
  );
}
