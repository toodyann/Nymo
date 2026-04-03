const DEFAULT_DEV_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_PROD_API_BASE_URL = 'https://chat-app-anzi.onrender.com';

function readViteEnv() {
  try {
    const meta = import.meta;
    if (!meta || typeof meta !== 'object') return {};
    const env = meta.env;
    if (!env || typeof env !== 'object') return {};
    return env;
  } catch {
    return {};
  }
}

function normalizeApiBaseUrl(value = '') {
  const normalized = String(value || '')
    .trim()
    .replace(/\/+$/, '');
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (/^(localhost|127(?:\.\d{1,3}){3})(?::\d+)?$/i.test(normalized)) {
    return `http://${normalized}`;
  }
  return `https://${normalized}`;
}

function isLocalApiBaseUrl(value = '') {
  const normalized = String(value || '').trim();
  if (!normalized) return false;
  return /^(https?:\/\/)?(localhost|127(?:\.\d{1,3}){3})(?::\d+)?$/i.test(normalized);
}

function isLocalBrowserRuntime() {
  if (typeof window === 'undefined') return false;
  const hostname = String(window.location.hostname || '').trim();
  return /^(localhost|127(?:\.\d{1,3}){3})$/i.test(hostname);
}

export function getApiBaseUrl() {
  const env = readViteEnv();
  const explicitApiBase = String(env.VITE_API_BASE_URL || '').trim();
  if (env.DEV || isLocalBrowserRuntime()) {
    const devApiBase = isLocalApiBaseUrl(explicitApiBase) ? explicitApiBase : DEFAULT_DEV_API_BASE_URL;
    return normalizeApiBaseUrl(devApiBase);
  }
  return normalizeApiBaseUrl(explicitApiBase || DEFAULT_PROD_API_BASE_URL);
}

export const BASE_URL = getApiBaseUrl();

export function buildApiUrl(path = '') {
  const normalizedPath = String(path || '').trim();
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

  const endpoint = normalizedPath
    ? (normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`)
    : '';
  return endpoint ? `${BASE_URL}${endpoint}` : BASE_URL;
}
