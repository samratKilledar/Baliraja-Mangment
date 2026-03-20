import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/common/LoginPage';
import SuperAdminDashboard from '../pages/superAdmin/SuperAdminDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';

const ALLOWED_ROLES = ['super_admin', 'admin', 'teacher'];

function RoleHome({ role }) {
  if (role === 'super_admin') return <Navigate to="/super-admin" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  if (role === 'teacher') return <Navigate to="/teacher" replace />;
  return <Navigate to="/login" replace />;
}

function ProtectedRoute({ user, role, children }) {
  if (!user) return <Navigate to="/login" replace />;
  if (!ALLOWED_ROLES.includes(user.role)) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function AppRoutes() {
  const { user } = useAuth();
  const hasAllowedUser = user && ALLOWED_ROLES.includes(user.role);

  return (
    <Routes>
      <Route path="/login" element={hasAllowedUser ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route
        path="/super-admin/*"
        element={
          <ProtectedRoute user={user} role="super_admin">
            <SuperAdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute user={user} role="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/teacher"
        element={
          <ProtectedRoute user={user} role="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={hasAllowedUser ? <RoleHome role={user.role} /> : <Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
