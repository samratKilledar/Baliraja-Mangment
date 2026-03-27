import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ims_user');
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback(({ token, user: authUser }) => {
    localStorage.removeItem('ims_logout_reason');
    localStorage.setItem('ims_token', token);
    localStorage.setItem('token', token); // fallback key used elsewhere
    localStorage.setItem('ims_user', JSON.stringify(authUser));
    setUser(authUser);
  }, []);

  const updateUser = useCallback((nextUser) => {
    localStorage.setItem('ims_user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback((reason) => {
    if (reason) {
      localStorage.setItem('ims_logout_reason', reason);
    } else {
      localStorage.removeItem('ims_logout_reason');
    }
    localStorage.removeItem('ims_token');
    localStorage.removeItem('token');
    localStorage.removeItem('ims_user');
    setUser(null);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ims_token') || localStorage.getItem('token');
    if (!token && user) {
      logout();
    }
  }, [user, logout]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event) => {
      const reason = event?.detail?.reason || 'expired';
      logout(reason);
    };
    window.addEventListener('ims:logout', handler);
    return () => window.removeEventListener('ims:logout', handler);
  }, [logout]);

  const value = useMemo(() => ({ user, login, logout, updateUser }), [user, login, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
