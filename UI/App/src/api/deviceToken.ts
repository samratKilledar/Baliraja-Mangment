import { Platform } from 'react-native';
import client from './client';

export async function registerDeviceToken(token: string, app: 'admin' | 'student' | 'parent' | 'teacher' = 'student') {
  if (!token) return;
  await client.post('/device-tokens', {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    app
  });
}
