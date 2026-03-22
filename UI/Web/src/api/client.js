import axios from 'axios';

function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  return (configured || 'http://localhost:4000/api/v1').replace(/\/+$/, '');
}

const api = axios.create({
  baseURL: resolveApiBaseUrl()
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ims_token') || localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      // Token invalid/expired – clear and let UI prompt re-login
      localStorage.removeItem('ims_token');
      localStorage.removeItem('token');
      localStorage.removeItem('ims_user');
      localStorage.setItem('ims_logout_reason', 'expired');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ims:logout', { detail: { reason: 'expired' } }));
      }
    }
    return Promise.reject(err);
  }
);

export default api;
