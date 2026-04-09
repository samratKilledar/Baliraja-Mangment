import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const INACTIVITY_LIMIT_MS = 3 * 60 * 1000;
const IDLE_DEADLINE_KEY = 'ims_idle_deadline';

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

  useEffect(() => {
    if (typeof window === 'undefined' || !user) return undefined;

    let timeoutId;
    let watchdogId;

    const resetTimer = () => {
      const nextDeadline = Date.now() + INACTIVITY_LIMIT_MS;
      localStorage.setItem(IDLE_DEADLINE_KEY, String(nextDeadline));
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        logout('expired');
      }, INACTIVITY_LIMIT_MS);
    };

    const enforceDeadline = () => {
      const stored = Number(localStorage.getItem(IDLE_DEADLINE_KEY) || 0);
      if (stored && Date.now() >= stored) {
        logout('expired');
      }
    };

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click'
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });
    document.addEventListener('visibilitychange', enforceDeadline);
    window.addEventListener('focus', enforceDeadline);

    resetTimer();
    watchdogId = window.setInterval(enforceDeadline, 15000);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (watchdogId) window.clearInterval(watchdogId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });
      document.removeEventListener('visibilitychange', enforceDeadline);
      window.removeEventListener('focus', enforceDeadline);
      localStorage.removeItem(IDLE_DEADLINE_KEY);
    };
  }, [user, logout]);

  const value = useMemo(() => ({ user, login, logout, updateUser }), [user, login, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
