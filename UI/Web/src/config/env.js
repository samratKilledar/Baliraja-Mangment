const LOCAL_API_URL = 'http://localhost:4000/api/v1';
const PRODUCTION_API_URL = 'https://baliraja-mangment.onrender.com/api/v1';

export function resolveApiBaseUrl() {
  const configured = import.meta.env.VITE_API_URL?.trim();
  const fallback = import.meta.env.DEV ? LOCAL_API_URL : PRODUCTION_API_URL;
  return (configured || fallback).replace(/\/+$/, '');
}

export function resolveApiOrigin() {
  return resolveApiBaseUrl().replace(/\/api\/v1$/, '');
}
