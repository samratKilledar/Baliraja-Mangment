import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// LAN IP of dev machine (update if network changes)
const LAN_IP = '10.24.70.232';

function resolveBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envUrl) return envUrl;

  // On Android physical devices we need the LAN IP; emulator can also reach it.
  if (Platform.OS === 'android') return `http://${LAN_IP}:4000/api/v1`;
  return 'http://localhost:4000/api/v1';
}

const client = axios.create({ baseURL: resolveBaseUrl() });

// Attach auth token from storage if available
client.interceptors.request.use(async (config) => {
  try {
    const token = (await AsyncStorage.getItem('ims_token')) || (await AsyncStorage.getItem('token'));
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    // ignore token read errors
  }
  return config;
});

export default client;
