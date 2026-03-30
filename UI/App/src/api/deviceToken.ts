import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from './client';

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
