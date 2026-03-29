import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/common/LoginPage';
import SuperAdminDashboard from '../pages/superAdmin/SuperAdminDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import TeacherDashboard from '../pages/teacher/TeacherDashboard';
import GlobalMotionLayer from '../components/GlobalMotionLayer';

const ALLOWED_ROLES = ['super_admin', 'admin', 'teacher'];
const ROUTE_BG_IMAGES = [
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=2000&q=80'
];

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
  const location = useLocation();
  const hasAllowedUser = user && ALLOWED_ROLES.includes(user.role);
  const [bgIndex, setBgIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBgIndex((prev) => (prev + 1) % ROUTE_BG_IMAGES.length);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <>
      <div className="app-route-bg-shell" aria-hidden="true">
        <AnimatePresence mode="wait">
          <motion.div
            key={`route-bg-${bgIndex}`}
            className="app-route-bg-image"
            style={{ backgroundImage: `url(${ROUTE_BG_IMAGES[bgIndex]})` }}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />
        </AnimatePresence>
        <div className="app-route-bg-overlay" />
      </div>
      <GlobalMotionLayer />
      <AnimatePresence mode="sync">
        <motion.div
          key={location.pathname}
          className="route-stage"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        >
          <Routes location={location}>
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
        </motion.div>
      </AnimatePresence>
    </>
  );
}
