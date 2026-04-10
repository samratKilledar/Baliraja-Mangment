import React, { useEffect, useState } from "react";
import api from "../api/client";

type BaseRole = "admin" | "teacher" | "student" | "worker";

type User = {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: BaseRole | "super_admin" | "parent";
  passwordVisible?: string;
};

type AttendanceRecord = {
  _id: string;
  date: string;
  status: string;
  checkInAt?: string;
  checkOutAt?: string;
};

type Flagged = {
  _id: string;
  enrollmentNo?: string;
  userId?: string;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  role: BaseRole;
  enrollmentNo: string;
  specialization: string;
  experienceYears: string;
  password: string;
  contractStart: string;
  contractEnd: string;
  totalContractAmount: string;
};

type PagedResponse<T> = {
  items: T[];
  meta: {
    page: number;
    totalPages: number;
    total: number;
  };
};

const SUPER_EMAIL = import.meta.env.VITE_SUPER_EMAIL || "";
const SUPER_PASSWORD = import.meta.env.VITE_SUPER_PASSWORD || "";
const DEFAULT_ADMIN_PASSWORD = import.meta.env.VITE_DEFAULT_ADMIN_PASSWORD || "123456";
const DEFAULT_STUDENT_PASSWORD = import.meta.env.VITE_DEFAULT_STUDENT_PASSWORD || "123456";
const PAGE_SIZE = 10;

function safeToken(): string {
  return localStorage.getItem("ims_token") || localStorage.getItem("token") || "";
}

function paginationButtons(totalPages: number) {
  return Array.from({ length: totalPages }, (_, index) => index + 1);
}

export default function AdminManagement(): JSX.Element {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phone: "",
    role: "admin",
    enrollmentNo: "",
    specialization: "",
    experienceYears: "",
    password: DEFAULT_ADMIN_PASSWORD,
    contractStart: "",
    contractEnd: "",
    totalContractAmount: ""
  });
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState<BaseRole>("admin");
  const [flagged, setFlagged] = useState<Flagged[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [token, setToken] = useState<string>(safeToken());
  const [autoTried, setAutoTried] = useState(false);
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    const stored = safeToken();
    if (stored) {
      api.defaults.headers.common.Authorization = `Bearer ${stored}`;
      if (!token) setToken(stored);
    }

    const logoutHandler = () => {
      setToken("");
      setError("Session expired. Please refresh to re-auth.");
    };

    window.addEventListener("ims:logout", logoutHandler as EventListener);
    return () => window.removeEventListener("ims:logout", logoutHandler as EventListener);
  }, [token]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter]);

  useEffect(() => {
    setForm((prev) => {
      if (prev.role === "admin") {
        return prev.password ? prev : { ...prev, password: DEFAULT_ADMIN_PASSWORD };
      }
      if (prev.password === DEFAULT_ADMIN_PASSWORD) {
        return { ...prev, password: "" };
      }
      return prev;
    });
  }, [form.role]);

  useEffect(() => {
    if (token) {
      fetchUsers(roleFilter, page);
      fetchFlagged();
      fetchMyAttendance();
    } else if (!autoTried && SUPER_EMAIL && SUPER_PASSWORD) {
      signIn(SUPER_EMAIL, SUPER_PASSWORD, true);
      setAutoTried(true);
    }
  }, [roleFilter, page, token, autoTried]);

  async function fetchUsers(role: BaseRole, nextPage = 1) {
    setLoading(true);
    try {
      const { data } = await api.get<PagedResponse<User>>("/users", {
        params: { role, page: nextPage, limit: PAGE_SIZE }
      });
      setUsers(data.items || []);
      setPageMeta(data.meta || { page: nextPage, totalPages: 1, total: 0 });
      setError("");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Could not load users";
      setUsers([]);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFlagged() {
    try {
      const { data } = await api.get<Flagged[]>("/attendance/flagged/missing");
      setFlagged(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchMyAttendance() {
    try {
      const { data } = await api.get<AttendanceRecord[]>("/attendance/my");
      setMyAttendance(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function addUser() {
    if (!token) {
      setError("Please log in as super admin first.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role
      };

      if (form.password.trim()) payload.password = form.password.trim();
      if (form.role === "student") payload.enrollmentNo = form.enrollmentNo;
      if (form.role === "teacher") {
        payload.specialization = form.specialization
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean);
        if (form.experienceYears) payload.experienceYears = Number(form.experienceYears);
      }
      if (form.role === "worker") {
        payload.roleTitle = "worker";
        payload.contractStart = form.contractStart || undefined;
        payload.contractEnd = form.contractEnd || undefined;
        if (form.totalContractAmount) payload.totalContractAmount = Number(form.totalContractAmount);
      }

      const { data } = await api.post("/users", payload);
      const finalPassword = data.tempPassword || form.password;
      alert(
        `User created as ${payload.role}.\nEmail: ${payload.email}\nMobile: ${payload.phone || "—"}\nPassword: ${finalPassword || "Generated but unavailable"}`
      );

      setForm({
        fullName: "",
        email: "",
        phone: "",
        role: form.role,
        enrollmentNo: "",
        specialization: "",
        experienceYears: "",
        password: form.role === "admin" ? DEFAULT_ADMIN_PASSWORD : "",
        contractStart: "",
        contractEnd: "",
        totalContractAmount: ""
      });

      await fetchUsers(roleFilter, page);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Unable to create user";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteUser(id: string) {
    if (!window.confirm("Delete this user?")) return;

    setBusyUserId(id);
    try {
      await api.delete(`/users/${id}`);
      const nextPage = users.length === 1 && page > 1 ? page - 1 : page;
      if (nextPage !== page) setPage(nextPage);
      else await fetchUsers(roleFilter, page);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Unable to delete";
      setError(msg);
    } finally {
      setBusyUserId(null);
    }
  }

  async function resetPassword(id: string) {
    const nextPassword = passwordDrafts[id]?.trim();
    if (!nextPassword || nextPassword.length < 6) {
      setError("Enter a password with at least 6 characters.");
      return;
    }

    setBusyUserId(id);
    try {
      await api.put(`/users/${id}/password`, { newPassword: nextPassword });
      setPasswordDrafts((prev) => ({ ...prev, [id]: "" }));
      await fetchUsers(roleFilter, page);
      setError("");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Unable to update password";
      setError(msg);
    } finally {
      setBusyUserId(null);
    }
  }

  async function applyDefaultAdminPassword(id: string) {
    setPasswordDrafts((prev) => ({ ...prev, [id]: DEFAULT_ADMIN_PASSWORD }));
    setBusyUserId(id);
    try {
      await api.put(`/users/${id}/password`, { newPassword: DEFAULT_ADMIN_PASSWORD });
      setPasswordDrafts((prev) => ({ ...prev, [id]: "" }));
      await fetchUsers(roleFilter, page);
      setError("");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Unable to apply default password";
      setError(msg);
    } finally {
      setBusyUserId(null);
    }
  }

  async function applyDefaultStudentPassword(id: string) {
    setPasswordDrafts((prev) => ({ ...prev, [id]: DEFAULT_STUDENT_PASSWORD }));
    setBusyUserId(id);
    try {
      await api.put(`/users/${id}/password`, { newPassword: DEFAULT_STUDENT_PASSWORD });
      setPasswordDrafts((prev) => ({ ...prev, [id]: "" }));
      await fetchUsers(roleFilter, page);
      setError("");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Unable to apply default student password";
      setError(msg);
    } finally {
      setBusyUserId(null);
    }
  }

  async function signIn(identifier: string, password: string, silent = false) {
    setLoading(true);
    if (!silent) setError("");
    try {
      const { data } = await api.post<{ token: string }>("/auth/login", {
        identifier,
        password,
        clientType: 'web',
      });
      localStorage.setItem("ims_token", data.token);
      api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
      setToken(data.token);
    } catch (err: unknown) {
      if (!silent) {
        const msg = (err as any)?.response?.data?.message || "Login failed";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("ims_token");
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
    setToken("");
    setUsers([]);
  }

  return (
    <div style={styles.page}>
      {!token && (
        <div style={styles.banner}>
          {SUPER_EMAIL && SUPER_PASSWORD
            ? "Authenticating as super admin..."
            : "No auth token. Please log in from the main login page first."}
          {error && <span style={{ marginLeft: 8, color: "#ff4d4f" }}>{error}</span>}
        </div>
      )}

      <div style={styles.sectionGrid}>
        <div style={styles.card}>
          <div style={styles.sectionHead}>
            <h4>Create User</h4>
            <span style={styles.badge}>{form.role}</span>
          </div>

          <div style={styles.grid}>
            <input style={styles.input} placeholder="Full Name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <input style={styles.input} placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input style={styles.input} placeholder="Mobile Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <input
              style={styles.input}
              placeholder={form.role === "admin" ? `Password (default: ${DEFAULT_ADMIN_PASSWORD})` : "Password (leave blank to auto-generate)"}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <select style={styles.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as BaseRole })}>
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="worker">Worker</option>
            </select>

            {form.role === "student" && (
              <input style={styles.input} placeholder="Enrollment No" value={form.enrollmentNo} onChange={(e) => setForm({ ...form, enrollmentNo: e.target.value })} />
            )}

            {form.role === "teacher" && (
              <>
                <input style={styles.input} placeholder="Specialization (comma separated)" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
                <input style={styles.input} placeholder="Experience (years)" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
              </>
            )}

            {form.role === "worker" && (
              <>
                <input style={styles.input} type="date" value={form.contractStart} onChange={(e) => setForm({ ...form, contractStart: e.target.value })} />
                <input style={styles.input} type="date" value={form.contractEnd} onChange={(e) => setForm({ ...form, contractEnd: e.target.value })} />
                <input style={styles.input} type="number" placeholder="Total contract amount" value={form.totalContractAmount} onChange={(e) => setForm({ ...form, totalContractAmount: e.target.value })} />
              </>
            )}
          </div>

          {form.role === "admin" && (
            <p style={styles.passwordHint}>
              Default admin password: <strong>{DEFAULT_ADMIN_PASSWORD}</strong>
            </p>
          )}

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actionRow}>
            <button style={styles.createBtn} disabled={submitting || !token} onClick={addUser}>
              {submitting ? "Saving..." : token ? `Create ${form.role}` : "Login required"}
            </button>
            {token && <button style={styles.ghostBtn} onClick={logout}>Logout</button>}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.listHeader}>
            <h4>User List</h4>
            <select style={styles.input} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as BaseRole)}>
              <option value="admin">Admins</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
              <option value="worker">Workers</option>
            </select>
          </div>

          {loading && <p style={styles.muted}>Loading users...</p>}
          {!loading && users.length === 0 && <p style={styles.muted}>No users found for this role.</p>}

          {users.map((user) => {
            const isBusy = busyUserId === user._id;
            const fallbackPassword =
              user.role === "admin"
                ? DEFAULT_ADMIN_PASSWORD
                : user.role === "student"
                  ? DEFAULT_STUDENT_PASSWORD
                  : "";
            const visiblePassword = user.passwordVisible || fallbackPassword || "Not available";
            return (
              <div key={user._id} style={styles.userCard}>
                <div>
                  <strong>{user.fullName}</strong>
                  <div style={styles.muted}>{user.email} · {user.phone || "—"}</div>
                  <div style={styles.roleRow}>
                    <span style={styles.chip}>{user.role}</span>
                    <span style={styles.passwordPill}>Password: {visiblePassword}</span>
                  </div>
                </div>

                <div style={styles.userActions}>
                  <input
                    style={styles.smallInput}
                    placeholder="New password"
                    type="password"
                    value={passwordDrafts[user._id] || ""}
                    onChange={(e) => setPasswordDrafts((prev) => ({ ...prev, [user._id]: e.target.value }))}
                  />
                  <button style={styles.ghostBtn} onClick={() => resetPassword(user._id)} disabled={isBusy || !token}>
                    {isBusy ? "Updating..." : "Reset Password"}
                  </button>
                  {user.role === "admin" && (
                    <button style={styles.highlightBtn} onClick={() => applyDefaultAdminPassword(user._id)} disabled={isBusy || !token}>
                      {isBusy ? "Updating..." : "Use Default Admin Password"}
                    </button>
                  )}
                  {user.role === "student" && (
                    <button style={styles.highlightBtn} onClick={() => applyDefaultStudentPassword(user._id)} disabled={isBusy || !token}>
                      {isBusy ? "Updating..." : "Use Default Student Password"}
                    </button>
                  )}
                  <button style={styles.deleteBtn} onClick={() => deleteUser(user._id)} disabled={isBusy || !token}>
                    {isBusy ? "Working..." : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}

          <div style={styles.pagination}>
            {paginationButtons(pageMeta.totalPages).map((value) => (
              <button
                key={value}
                style={{ ...styles.pageBtn, ...(pageMeta.page === value ? styles.pageBtnActive : {}) }}
                onClick={() => setPage(value)}
                disabled={loading}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={styles.sectionGrid}>
        <div style={styles.card}>
          <h4>Flagged (no check-in 3 days)</h4>
          {flagged.length === 0 ? <p style={styles.muted}>None</p> : flagged.map((student) => (
            <div key={student._id} style={styles.listItem}>
              <div>
                <strong>{student.enrollmentNo || student._id}</strong>
                <div style={styles.muted}>User: {student.userId}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <h4>My Attendance</h4>
          {myAttendance.length === 0 ? <p style={styles.muted}>No records</p> : (
            <div style={styles.attendanceGrid}>
              {myAttendance.slice(0, 10).map((record) => (
                <div key={record._id} style={styles.attendanceCard}>
                  <div style={styles.attDate}>{new Date(record.date).toLocaleDateString()}</div>
                  <div style={styles.attStatus}>{record.status}</div>
                  <div style={styles.attTimes}>
                    In: {record.checkInAt ? new Date(record.checkInAt).toLocaleTimeString() : "-"} · Out: {record.checkOutAt ? new Date(record.checkOutAt).toLocaleTimeString() : "-"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    width: "100%",
    fontFamily: "'Manrope','Segoe UI',sans-serif",
    color: "#15213d",
    display: "flex",
    flexDirection: "column",
    gap: 12
  },
  card: {
    background: "#ffffff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 8px 18px rgba(20,31,66,0.08)",
    border: "1px solid #e4e8f3"
  },
  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
    gap: 18
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    gap: 12
  },
  input: {
    padding: 12,
    border: "1px solid #d7deef",
    borderRadius: 10,
    fontSize: 14,
    background: "#f9fbff"
  },
  smallInput: {
    padding: "10px 12px",
    border: "1px solid #d7deef",
    borderRadius: 10,
    fontSize: 13,
    background: "#f9fbff",
    minWidth: 150
  },
  error: {
    color: "#d32f2f",
    marginTop: 8
  },
  passwordHint: {
    margin: "10px 0 0",
    color: "#6a5200",
    background: "#fff8e5",
    border: "1px solid #f4dfaa",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 13
  },
  createBtn: {
    padding: "10px 18px",
    background: "#2344b2",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "700",
    boxShadow: "0 8px 16px rgba(35,68,178,0.25)"
  },
  ghostBtn: {
    padding: "10px 14px",
    background: "transparent",
    color: "#2344b2",
    border: "1px solid #d4dcf5",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: "700"
  },
  deleteBtn: {
    background: "#ff4d4f",
    color: "white",
    border: "none",
    padding: "10px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700
  },
  highlightBtn: {
    padding: "10px 14px",
    background: "#fff5d6",
    color: "#8a5a00",
    border: "1px solid #f1d179",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700
  },
  listItem: {
    padding: "12px 0",
    borderBottom: "1px solid #e9edf5"
  },
  userCard: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "16px 0",
    borderBottom: "1px solid #e9edf5",
    alignItems: "center"
  },
  userActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end"
  },
  muted: { color: "#637093", marginTop: 4 },
  listHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 },
  badge: { background: "#e7ecff", color: "#2344b2", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 },
  chip: { background: "#f1f5ff", color: "#2344b2", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 },
  passwordPill: { background: "#fff8e5", color: "#8a6b21", padding: "2px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700 },
  roleRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  attendanceGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 12 },
  attendanceCard: { background: "#f8faff", border: "1px solid #e4e8f3", borderRadius: 10, padding: 12 },
  attDate: { fontWeight: 700, marginBottom: 4 },
  attStatus: { fontSize: 13, fontWeight: 700, color: "#2344b2" },
  attTimes: { fontSize: 12, color: "#637093" },
  sectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  banner: { background: "#fff8e5", border: "1px solid #fde7b5", color: "#8a6b21", padding: 12, borderRadius: 10 },
  actionRow: { display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" },
  pagination: { display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" },
  pageBtn: {
    minWidth: 40,
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #d4dcf5",
    background: "#fff",
    color: "#2344b2",
    cursor: "pointer",
    fontWeight: 700
  },
  pageBtnActive: {
    background: "#2344b2",
    color: "#fff",
    borderColor: "#2344b2"
  }
};
