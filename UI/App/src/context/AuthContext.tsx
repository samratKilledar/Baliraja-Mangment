import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser } from '../types';
import { setupPushNotifications } from '../notifications/pushSetup';

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  clearSession: () => void;
  hydrated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  // ensures we don't block rendering while rehydrating but lets consumers know
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem('ims_token'),
          AsyncStorage.getItem('ims_user')
        ]);
        if (savedToken && savedUser) {
          setToken(savedToken);
          const parsedUser = JSON.parse(savedUser) as AuthUser;
          setUser(parsedUser);
          setupPushNotifications(parsedUser.role);
        }
      } catch (err) {
        console.warn('Auth hydrate failed', err);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      hydrated,
      setSession: (nextToken: string, nextUser: AuthUser) => {
        setToken(nextToken);
        setUser(nextUser);
        AsyncStorage.setItem('ims_token', nextToken).catch(() => {});
        AsyncStorage.setItem('ims_user', JSON.stringify(nextUser)).catch(() => {});
        setupPushNotifications(nextUser.role);
      },
      clearSession: () => {
        setToken(null);
        setUser(null);
        AsyncStorage.multiRemove(['ims_token', 'ims_user']).catch(() => {});
      }
    }),
    [token, user, hydrated]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
