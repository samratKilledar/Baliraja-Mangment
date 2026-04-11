import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from './client';
import { Role } from '../types';

async function getOrCreateDeviceUuid() {
  const key = 'ims_device_uuid';
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const next = `uuid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(key, next);
  return next;
}

export async function registerDeviceToken(token: string, app: 'admin' | 'student' | 'parent' | 'teacher' = 'student') {
  if (!token) return;
  const deviceUuid = await getOrCreateDeviceUuid();
  await client.post('/device-tokens', {
    token,
    deviceUuid,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    app
  });
}

function roleToApp(role?: Role | string): 'admin' | 'student' | 'parent' | 'teacher' {
  if (role === 'super_admin' || role === 'admin') return 'admin';
  if (role === 'worker') return 'admin';
  if (role === 'teacher') return 'teacher';
  if (role === 'parent') return 'parent';
  return 'student';
}

export async function syncStoredDeviceRegistration(role?: Role | string) {
  const fcmToken = await AsyncStorage.getItem('ims_fcm_token');
  if (!fcmToken) return;
  await registerDeviceToken(fcmToken, roleToApp(role));
}
