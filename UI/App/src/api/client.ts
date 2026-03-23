import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRODUCTION_API_URL = 'https://baliraja-mangment.onrender.com/api/v1';

function resolveBaseUrl() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_URL;
  if (envUrl) return envUrl;

  return PRODUCTION_API_URL;
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
