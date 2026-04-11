import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {AuthUser} from '../types';
import {setupPushNotifications} from '../notifications/pushSetup';
import {registerSessionListener} from '../utils/sessionEvents';

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  updateUser: (nextUser: AuthUser) => void;
  clearSession: () => void;
  logout: () => void;
  hydrated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: ReactNode}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  // ensures we don't block rendering while rehydrating but lets consumers know
  const [hydrated, setHydrated] = useState(false);
  const [logoutPromptVisible, setLogoutPromptVisible] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem('ims_token'),
          AsyncStorage.getItem('ims_user'),
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

  const setSession = useCallback((nextToken: string, nextUser: AuthUser) => {
    setToken(nextToken);
    setUser(nextUser);
    AsyncStorage.setItem('ims_token', nextToken).catch(() => {});
    AsyncStorage.setItem('ims_user', JSON.stringify(nextUser)).catch(() => {});
    setupPushNotifications(nextUser.role);
  }, []);

  const updateUser = useCallback((nextUser: AuthUser) => {
    setUser(nextUser);
    AsyncStorage.setItem('ims_user', JSON.stringify(nextUser)).catch(() => {});
  }, []);

  const clearSession = useCallback(() => {
    if (user?.role === 'super_admin') {
      return;
    }
    setToken(null);
    setUser(null);
    AsyncStorage.multiRemove(['ims_token', 'ims_user']).catch(() => {});
  }, [user]);

  const forceClearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    AsyncStorage.multiRemove(['ims_token', 'ims_user']).catch(() => {});
  }, []);

  useEffect(() => {
    const unsubscribe = registerSessionListener(() => {
      if (logoutPromptVisible) {
        return;
      }
      setLogoutPromptVisible(true);
      Alert.alert(
        'Session expired',
        'Your session has expired. Please login again.',
        [
          {
            text: 'Logout',
            onPress: () => {
              setLogoutPromptVisible(false);
              forceClearSession();
            },
          },
        ],
        {
          cancelable: true,
          onDismiss: () => {
            setLogoutPromptVisible(false);
            forceClearSession();
          },
        },
      );
    });
    return unsubscribe;
  }, [forceClearSession, logoutPromptVisible]);

  const value = useMemo(
    () => ({
      token,
      user,
      hydrated,
      setSession,
      updateUser,
      clearSession,
      logout: forceClearSession,
    }),
    [token, user, hydrated, setSession, updateUser, clearSession, forceClearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
