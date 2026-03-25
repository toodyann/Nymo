const AUTH_SESSION_KEY = 'orion_auth_session';
const DEFAULT_API_BASE_URL = 'https://chat-app-anzi.onrender.com';

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

function detectModuleBasePath() {
  try {
    const moduleUrl = new URL(import.meta.url);
    const modulePath = String(moduleUrl.pathname || '');
    const assetsIndex = modulePath.indexOf('/assets/');
    if (assetsIndex >= 0) {
      const base = modulePath.slice(0, assetsIndex + 1);
      return base || '/';
    }
  } catch {
    // Fall through to runtime path detection.
  }
  return '';
}

function detectRuntimeBasePath() {
  if (typeof window === 'undefined') return '/';
  const pathname = String(window.location.pathname || '/');
  const normalizedPath = pathname.replace(/\/+$/, '');
  if (normalizedPath.endsWith('/auth')) {
    const beforeAuth = normalizedPath.slice(0, -('/auth'.length));
    const safeBase = beforeAuth || '/';
    return safeBase.endsWith('/') ? safeBase : `${safeBase}/`;
  }

  const authMarkerIndex = pathname.indexOf('/auth/');
  if (authMarkerIndex >= 0) {
    const beforeAuth = pathname.slice(0, authMarkerIndex) || '/';
    return beforeAuth.endsWith('/') ? beforeAuth : `${beforeAuth}/`;
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 1 && !segments[0].includes('.')) {
    return `/${segments[0]}/`;
  }

  if (pathname.endsWith('/')) return pathname;
  const lastSlash = pathname.lastIndexOf('/');
  if (lastSlash >= 0) {
    const dir = pathname.slice(0, lastSlash + 1);
    return dir || '/';
  }
  return '/';
}

function normalizeBasePath() {
  const env = readViteEnv();
  const envBase = typeof env.BASE_URL === 'string' ? env.BASE_URL.trim() : '';
  const rawBase = envBase || detectModuleBasePath() || detectRuntimeBasePath() || '/';
  return rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
}

export function getAppHomeHref() {
  if (typeof window === 'undefined') return '/';
  return new URL(normalizeBasePath(), window.location.origin).href;
}

export function getAuthPageHref() {
  if (typeof window === 'undefined') return '/auth/';
  return new URL('auth/', getAppHomeHref()).href;
}

export function redirectToAuthPage() {
  if (typeof window === 'undefined') return;
  window.location.assign(getAuthPageHref());
}

export function redirectToAppHome() {
  if (typeof window === 'undefined') return;
  window.location.assign(getAppHomeHref());
}

export function getAuthSession() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
    return null;
  }
}

export function isAuthSessionValid(session) {
  if (!session || typeof session !== 'object') return false;
  const token = typeof session.token === 'string' ? session.token.trim() : '';
  return token.length > 0;
}

export function setAuthSession(session) {
  if (typeof window === 'undefined') return;
  const safeSession = {
    token: String(session?.token || ''),
    user: session?.user && typeof session.user === 'object' ? session.user : {},
    issuedAt: Date.now()
  };
  window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(safeSession));
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_SESSION_KEY);
}

export function syncLegacyUserProfile(user = {}) {
  if (typeof window === 'undefined') return;
  const avatarSource = String(user?.avatarImage || user?.avatarUrl || '').trim();
  const displayName = String(
    user?.nickname ||
      user?.name ||
      user?.username ||
      user?.fullName ||
      user?.displayName ||
      ''
  ).trim();
  const profile = {
    name: displayName || 'Користувач Orion',
    nickname: String(user?.nickname || '').trim(),
    email: user?.email || 'user@example.com',
    status: user?.status || 'online',
    bio: user?.bio || 'Вітаю!',
    dob: user?.dob || '',
    avatarUrl: avatarSource,
    avatarImage: avatarSource,
    avatarColor: user?.avatarColor || ''
  };
  window.localStorage.setItem('orion_user', JSON.stringify(profile));
}

export function buildApiUrl(path = '') {
  const normalizedPath = String(path || '').trim();
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

  const endpoint = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  const env = readViteEnv();
  const apiBase = String(env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL)
    .trim()
    .replace(/\/+$/, '');
  return apiBase ? `${apiBase}${endpoint}` : endpoint;
}
