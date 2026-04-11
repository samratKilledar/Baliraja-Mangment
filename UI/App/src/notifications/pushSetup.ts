import PushNotification, { PushNotification as PN } from 'react-native-push-notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import { registerDeviceToken } from '../api/deviceToken';

let configured = false;
let lastRole: string | null = null;

function roleToApp(role?: string): 'admin' | 'student' | 'parent' | 'teacher' {
  if (role === 'super_admin' || role === 'admin') return 'admin';
  if (role === 'worker') return 'admin';
  if (role === 'teacher') return 'teacher';
  if (role === 'parent') return 'parent';
  return 'student';
}

async function requestAndroidNotificationPermission() {
  if (Platform.OS !== 'android') return;
  if (typeof Platform.Version !== 'number' || Platform.Version < 33) return;
  try {
    await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    );
  } catch (err) {
    console.warn('Android notification permission request failed', err);
  }
}

async function syncStoredToken(role?: string) {
  try {
    const storedToken = await AsyncStorage.getItem('ims_fcm_token');
    if (!storedToken) return;
    await registerDeviceToken(storedToken, roleToApp(role));
  } catch (err) {
    console.warn('Stored token sync failed', err);
  }
}

export function setupPushNotifications(role?: string) {
  if (configured && lastRole === role) return;
  lastRole = role || null;

  const senderId = process.env.FCM_SENDER_ID?.trim();
  void requestAndroidNotificationPermission();
  void syncStoredToken(role);

  PushNotification.configure({
    // (optional) Called when Token is generated (iOS and Android)
    onRegister: async function (token: PN) {
      try {
        const mappedApp = roleToApp(role);
        await AsyncStorage.setItem('ims_fcm_token', token.token);
        await registerDeviceToken(token.token, mappedApp);
      } catch (err) {
        console.warn('Device token registration failed', err);
      }
    },
    // (optional) Called when Token registration fails
    onRegistrationError: function (err) {
      console.warn('Push registration error', err?.message || err);
    },
    // Android FCM sender ID (optional if google-services.json handles it)
    senderID: senderId || undefined,
    popInitialNotification: false,
    requestPermissions: true
  });

  configured = true;
}
