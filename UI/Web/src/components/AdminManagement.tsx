import React, { useEffect, useState } from "react";
import api from "../api/client";

type BaseRole = "admin" | "teacher" | "student" | "worker";

type User = {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: BaseRole | "super_admin" | "parent";
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
  contractStart?: string;
  contractEnd?: string;
  totalContractAmount?: string;
};

const SUPER_EMAIL = import.meta.env.VITE_SUPER_EMAIL || "";
const SUPER_PASSWORD = import.meta.env.VITE_SUPER_PASSWORD || "";

function safeToken(): string {
  return (
    localStorage.getItem("ims_token") ||
    localStorage.getItem("token") ||
    ""
  );
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
    password: ""
  });

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState<BaseRole>("admin");
  const [flagged, setFlagged] = useState<Flagged[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [token, setToken] = useState<string>(safeToken());
  const [autoTried, setAutoTried] = useState(false);

  // Prime axios with stored token
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
    if (token) {
      fetchUsers(roleFilter);
      fetchFlagged();
      fetchMyAttendance();
      fetchAdmins();
    } else if (!autoTried && SUPER_EMAIL && SUPER_PASSWORD) {
      signIn(SUPER_EMAIL, SUPER_PASSWORD, true);
      setAutoTried(true);
    }
  }, [roleFilter, token, autoTried]);

  const fetchUsers = async (role: Role) => {
    setLoading(true);
    try {
      const { data } = await api.get<User[]>("/users", { params: { role } });
      setUsers(data);
      setError("");
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Could not load users";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchFlagged = async () => {
    try {
      const { data } = await api.get<Flagged[]>("/attendance/flagged/missing");
      setFlagged(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      const { data } = await api.get<AttendanceRecord[]>("/attendance/my");
      setMyAttendance(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const { data } = await api.get<User[]>("/users", { params: { role: "admin" } });
      setAdmins(data);
    } catch (err) {
      console.error(err);
    }
  };

  const addUser = async () => {
    if (!token) {
      setError("Please log in as super admin first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload: any = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        role: form.role
      };

      if (form.role === "admin" && form.password) payload.password = form.password;
      if (form.role === "student") payload.enrollmentNo = form.enrollmentNo;
      if (form.role === "teacher") {
        payload.specialization = form.specialization
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        if (form.experienceYears) payload.experienceYears = Number(form.experienceYears);
      }
      if (form.role === "worker") {
        payload.roleTitle = "worker";
        payload.contractStart = form.contractStart;
        payload.contractEnd = form.contractEnd;
        if (form.totalContractAmount) payload.totalContractAmount = Number(form.totalContractAmount);
      }

      const { data } = await api.post("/users", payload);

      alert(
        `User created as ${payload.role}.\nEmail: ${payload.email}\n` +
          (data.tempPassword ? `Temporary password: ${data.tempPassword}` : "")
      );

      setForm({
        ...form,
        fullName: "",
        email: "",
        phone: "",
        enrollmentNo: "",
        specialization: "",
        experienceYears: "",
        password: "",
        contractStart: "",
        contractEnd: "",
        totalContractAmount: ""
      });

      fetchUsers(roleFilter);
      fetchAdmins();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Unable to create user";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: string) => {
    const ok = window.confirm("Delete this user?");
    if (!ok) return;
    setLoading(true);
    try {
      await api.delete(`/users/${id}`);
      fetchUsers(roleFilter);
      fetchAdmins();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || "Unable to delete";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (identifier: string, pwd: string, silent = false) => {
    setLoading(true);
    if (!silent) setError("");
    try {
      const { data } = await api.post<{ token: string }>("/auth/login", {
        identifier,
        password: pwd
      });
      localStorage.setItem("ims_token", data.token);
      api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
      setToken(data.token);
      if (!silent) {
        fetchUsers(roleFilter);
        fetchFlagged();
        fetchMyAttendance();
        fetchAdmins();
      }
    } catch (err: unknown) {
      if (!silent) {
        const msg = (err as any)?.response?.data?.message || "Login failed";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("ims_token");
    localStorage.removeItem("token");
    delete api.defaults.headers.common.Authorization;
    setToken("");
    setUsers([]);
    setAdmins([]);
  };

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
            <input
              style={styles.input}
              placeholder="Full Name"
              value={form.fullName}
              onChange={(e) =>
                setForm({ ...form, fullName: e.target.value })
              }
            />

            <input
              style={styles.input}
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setForm({ ...form, email: e.target.value })
              }
            />

            <input
              style={styles.input}
              placeholder="Mobile Number"
              value={form.phone}
              onChange={(e) =>
                setForm({ ...form, phone: e.target.value })
              }
            />

            {form.role === "admin" && (
              <input
                style={styles.input}
                placeholder="Password (optional, else temp will be generated)"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm({ ...form, password: e.target.value })
                }
              />
            )}

            <select
              style={styles.input}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as BaseRole })}
            >
              <option value="admin">Admin</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="worker">Worker</option>
            </select>

            {form.role === "student" && (
              <input
                style={styles.input}
                placeholder="Enrollment No"
                value={form.enrollmentNo}
                onChange={(e) =>
                  setForm({ ...form, enrollmentNo: e.target.value })
                }
              />
            )}

            {form.role === "teacher" && (
              <>
                <input
                  style={styles.input}
                  placeholder="Specialization (comma separated)"
                  value={form.specialization}
                  onChange={(e) =>
                    setForm({ ...form, specialization: e.target.value })
                  }
                />
                <input
                  style={styles.input}
                  placeholder="Experience (years)"
                  value={form.experienceYears}
                  onChange={(e) =>
                    setForm({ ...form, experienceYears: e.target.value })
                  }
                />
              </>
            )}

            {form.role === "worker" && (
              <>
                <input
                  style={styles.input}
                  type="date"
                  placeholder="Contract start"
                  value={form.contractStart || ""}
                  onChange={(e) => setForm({ ...form, contractStart: e.target.value })}
                />
                <input
                  style={styles.input}
                  type="date"
                  placeholder="Contract end"
                  value={form.contractEnd || ""}
                  onChange={(e) => setForm({ ...form, contractEnd: e.target.value })}
                />
                <input
                  style={styles.input}
                  type="number"
                  placeholder="Total contract amount"
                  value={form.totalContractAmount || ""}
                  onChange={(e) => setForm({ ...form, totalContractAmount: e.target.value })}
                />
              </>
            )}

          </div>

          {error && <p style={styles.error}>{error}</p>}

          <div style={{display:"flex", gap:12, alignItems:"center", marginTop:12}}>
            <button style={styles.createBtn} disabled={loading || !token} onClick={addUser}>
              {loading ? "Saving..." : token ? `Create ${form.role}` : "Login required"}
            </button>
            {token && <button style={styles.ghostBtn} onClick={logout}>Logout</button>}
          </div>
          {!token && <p style={styles.muted}>Please log in as super admin to submit.</p>}

        </div>

        <div style={styles.card}>
          <div style={styles.listHeader}>
            <h4>User List</h4>
            <select
              style={styles.input}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as BaseRole)}
            >
              <option value="admin">Admins</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
              <option value="worker">Workers</option>
            </select>
          </div>

          {users.length === 0 && !loading && (
            <p style={styles.muted}>No users found for this role.</p>
          )}

          {users.map((user) => (
            <div key={user._id} style={styles.listItem}>

              <div>
                <strong>{user.fullName}</strong><br/>
                <span style={styles.muted}>{user.email} · {user.phone}</span><br/>
                <span style={styles.chip}>{user.role}</span>
              </div>

              <button
                style={styles.deleteBtn}
                onClick={() => deleteUser(user._id)}
                disabled={!token}
              >
                Delete
              </button>

            </div>
          ))}

          {loading && <p style={styles.muted}>Loading...</p>}

        </div>
      </div>

      <div style={styles.sectionGrid}>
        <div style={styles.card}>
          <div style={styles.listHeader}>
            <h4>Admins (Super Admin view)</h4>
          </div>
          {admins.length === 0 ? (
            <p style={styles.muted}>No admins yet.</p>
          ) : (
            admins.map((admin) => (
              <div key={admin._id} style={styles.listItem}>
                <div>
                  <strong>{admin.fullName}</strong><br/>
                  <span style={styles.muted}>{admin.email} · {admin.phone}</span>
                </div>
                <button
                  style={styles.deleteBtn}
                  onClick={() => deleteUser(admin._id)}
                  disabled={!token}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <h4>Flagged (no check-in 3 days)</h4>
          {flagged.length === 0 ? <p style={styles.muted}>None</p> : (
            flagged.map((s) => (
              <div key={s._id} style={styles.listItem}>
                <div>
                  <strong>{s.enrollmentNo || s._id}</strong><br/>
                  <span style={styles.muted}>User: {s.userId}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div style={styles.cardWide}>
        <h4>My Attendance (admin)</h4>
        {myAttendance.length === 0 ? <p style={styles.muted}>No records</p> : (
          <div style={styles.attendanceGrid}>
            {myAttendance.slice(0,10).map((a) => (
              <div key={a._id} style={styles.attendanceCard}>
                <div style={styles.attDate}>{new Date(a.date).toLocaleDateString()}</div>
                <div style={styles.attStatus}>{a.status}</div>
                <div style={styles.attTimes}>
                  In: {a.checkInAt ? new Date(a.checkInAt).toLocaleTimeString() : '-'} · Out: {a.checkOutAt ? new Date(a.checkOutAt).toLocaleTimeString() : '-'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page:{
    width:"100%",
    fontFamily:"'Manrope','Segoe UI',sans-serif",
    color:"#15213d",
    display:"flex",
    flexDirection:"column",
    gap:12
  },
  card:{
    background:"#ffffff",
    padding:20,
    borderRadius:12,
    boxShadow:"0 8px 18px rgba(20,31,66,0.08)",
    marginBottom:18,
    border:"1px solid #e4e8f3"
  },
  cardWide:{
    background:"#ffffff",
    padding:20,
    borderRadius:12,
    boxShadow:"0 8px 18px rgba(20,31,66,0.08)",
    marginBottom:18,
    border:"1px solid #e4e8f3"
  },
  sectionGrid:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",
    gap:18,
    marginBottom:18
  },
  grid:{
    display:"grid",
    gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
    gap:12
  },
  input:{
    padding:12,
    border:"1px solid #d7deef",
    borderRadius:10,
    fontSize:14,
    background:"#f9fbff"
  },
  error:{
    color:"#d32f2f",
    marginTop:8
  },
  createBtn:{
    padding:"10px 18px",
    background:"#2344b2",
    color:"white",
    border:"none",
    borderRadius:8,
    cursor:"pointer",
    fontWeight:"700",
    boxShadow:"0 8px 16px rgba(35,68,178,0.25)"
  },
  ghostBtn:{
    padding:"10px 14px",
    background:"transparent",
    color:"#2344b2",
    border:"1px solid #d4dcf5",
    borderRadius:8,
    cursor:"pointer",
    fontWeight:"700"
  },
  listItem:{
    display:"flex",
    justifyContent:"space-between",
    alignItems:"center",
    padding:"12px 0",
    borderBottom:"1px solid #e9edf5"
  },
  deleteBtn:{
    background:"#ff4d4f",
    color:"white",
    border:"none",
    padding:"6px 12px",
    borderRadius:5,
    cursor:"pointer"
  },
  muted:{ color:"#637093", margin:0 },
  listHeader:{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:12 },
  badge:{ background:"#e7ecff", color:"#2344b2", padding:"4px 10px", borderRadius:999, fontSize:12, fontWeight:700, textTransform:"uppercase", letterSpacing:0.6 },
  chip:{ background:"#f1f5ff", color:"#2344b2", padding:"2px 8px", borderRadius:6, fontSize:12, fontWeight:700 },
  attendanceGrid:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 },
  attendanceCard:{ background:"#f8faff", border:"1px solid #e4e8f3", borderRadius:10, padding:12 },
  attDate:{ fontWeight:700, marginBottom:4 },
  attStatus:{ fontSize:13, fontWeight:700, color:"#2344b2" },
  attTimes:{ fontSize:12, color:"#637093" },
  sectionHead:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  banner:{ background:"#fff8e5", border:"1px solid #fde7b5", color:"#8a6b21", padding:12, borderRadius:10, marginBottom:12 }
};
