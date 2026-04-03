import {
  getAuthSession,
  getAppHomeHref,
  isAuthSessionValid,
  redirectToAppHome,
  setAuthSession,
  syncLegacyUserProfile
} from '../shared/auth/auth-session.js';
import { buildApiUrl } from '../shared/api/api-url.js';

const PHONE_UA_RE = /^\+380\d{9}$/;
const SIGNUP_NICKNAME_CACHE_PREFIX = 'orion_signup_nickname:';
const OFFLINE_AUTH_USERS_KEY = 'orion_offline_auth_users_v1';
const DEFAULT_OFFLINE_USER = {
  id: 'offline-demo-user',
  phone: '+380000000000',
  password: 'orion123',
  nickname: 'Demo Orion',
  name: 'Demo Orion',
  avatarColor: '#4f6b8a'
};

function safeTrim(value) {
  return String(value || '').trim();
}

function normalizeOfflineUser(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = safeTrim(raw.id);
  const phone = normalizePhone(raw.phone || raw.mobile || '');
  const password = safeTrim(raw.password);
  const nickname = safeTrim(raw.nickname || raw.name || 'Користувач Orion');
  const name = safeTrim(raw.name || raw.nickname || nickname || 'Користувач Orion');
  if (!id || !PHONE_UA_RE.test(phone) || !password) return null;
  return {
    id,
    phone,
    password,
    nickname: nickname || 'Користувач Orion',
    name: name || nickname || 'Користувач Orion',
    avatarColor: safeTrim(raw.avatarColor || '')
  };
}

function readOfflineUsers() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(OFFLINE_AUTH_USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => normalizeOfflineUser(item))
      .filter(Boolean);
  } catch {
    return [];
  }
}

function writeOfflineUsers(users = []) {
  if (typeof window === 'undefined') return;
  const safeUsers = Array.isArray(users)
    ? users.map((item) => normalizeOfflineUser(item)).filter(Boolean)
    : [];
  try {
    window.localStorage.setItem(OFFLINE_AUTH_USERS_KEY, JSON.stringify(safeUsers));
  } catch {
    // Ignore storage errors.
  }
}

function ensureDefaultOfflineUserSeeded() {
  const users = readOfflineUsers();
  const hasDefault = users.some((item) => item.id === DEFAULT_OFFLINE_USER.id);
  if (hasDefault) return users;
  const nextUsers = [normalizeOfflineUser(DEFAULT_OFFLINE_USER), ...users].filter(Boolean);
  writeOfflineUsers(nextUsers);
  return nextUsers;
}

function buildOfflineAuthPayload(user) {
  const safeUser = normalizeOfflineUser(user);
  if (!safeUser) return null;
  return {
    token: `offline-token:${safeUser.id}`,
    user: {
      id: safeUser.id,
      name: safeUser.name,
      nickname: safeUser.nickname,
      phone: safeUser.phone,
      mobile: safeUser.phone,
      status: 'online',
      avatarColor: safeUser.avatarColor,
      offlineMode: true
    }
  };
}

function isBackendUnavailableError(error) {
  const status = Number(error?.status || 0);
  if (Number.isFinite(status) && status >= 500) return true;
  const message = safeTrim(error?.message).toLowerCase();
  if (!message) return false;
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('load failed') ||
    message.includes('network request failed') ||
    message.includes('fetch') ||
    message.includes('сервер недоступний')
  );
}

function tryOfflineLogin(phone, password) {
  const normalizedPhone = normalizePhone(phone);
  const safePassword = safeTrim(password);
  if (!PHONE_UA_RE.test(normalizedPhone) || !safePassword) return null;
  const users = ensureDefaultOfflineUserSeeded();
  const matchedUser = users.find((item) => item.phone === normalizedPhone && item.password === safePassword);
  if (!matchedUser) return null;
  return buildOfflineAuthPayload(matchedUser);
}

function createOfflineUser({ phone, password, nickname }) {
  const normalizedPhone = normalizePhone(phone);
  const safePassword = safeTrim(password);
  const safeNickname = safeTrim(nickname);
  if (!PHONE_UA_RE.test(normalizedPhone)) {
    throw new Error('Введіть номер у форматі +380XXXXXXXXX.');
  }
  if (safePassword.length < 6) {
    throw new Error('Пароль має містити щонайменше 6 символів.');
  }
  if (safeNickname.length < 2) {
    throw new Error('Введіть нікнейм (щонайменше 2 символи).');
  }

  const users = ensureDefaultOfflineUserSeeded();
  const existing = users.find((item) => item.phone === normalizedPhone);
  if (existing) {
    if (existing.password !== safePassword) {
      throw new Error('Користувач із цим номером уже існує локально.');
    }
    return buildOfflineAuthPayload(existing);
  }

  const generatedId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `offline-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const nextUser = normalizeOfflineUser({
    id: generatedId,
    phone: normalizedPhone,
    password: safePassword,
    nickname: safeNickname,
    name: safeNickname
  });
  if (!nextUser) {
    throw new Error('Не вдалося створити локальний акаунт.');
  }
  writeOfflineUsers([nextUser, ...users]);
  return buildOfflineAuthPayload(nextUser);
}

function decodeJwtPayload(token) {
  const raw = safeTrim(token);
  if (!raw) return null;
  const parts = raw.split('.');
  if (parts.length < 2) return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padLength = normalized.length % 4;
    const padded = normalized + (padLength ? '='.repeat(4 - padLength) : '');
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function getAuthUserId(authPayload) {
  const direct = safeTrim(
    authPayload?.user?.id ||
      authPayload?.user?.userId ||
      authPayload?.user?._id ||
      authPayload?.user?.sub
  );
  if (direct) return direct;
  const jwtPayload = decodeJwtPayload(authPayload?.token || '');
  return safeTrim(jwtPayload?.sub || jwtPayload?.userId || jwtPayload?.id);
}

function normalizePhone(value) {
  let phone = safeTrim(value).replace(/[^\d+]/g, '');

  if (phone.startsWith('380')) {
    phone = `+${phone}`;
  }

  if (!phone.startsWith('+')) {
    phone = `+${phone.replace(/\+/g, '')}`;
  }

  return phone;
}

function setCachedSignupNickname(phone, nickname) {
  if (typeof window === 'undefined') return;
  const normalizedPhone = safeTrim(phone);
  const normalizedNickname = safeTrim(nickname);
  if (!normalizedPhone || !normalizedNickname) return;
  try {
    window.sessionStorage.setItem(`${SIGNUP_NICKNAME_CACHE_PREFIX}${normalizedPhone}`, normalizedNickname);
  } catch {
    // Ignore storage errors.
  }
}

function getCachedSignupNickname(phone) {
  if (typeof window === 'undefined') return '';
  const normalizedPhone = safeTrim(phone);
  if (!normalizedPhone) return '';
  try {
    return safeTrim(window.sessionStorage.getItem(`${SIGNUP_NICKNAME_CACHE_PREFIX}${normalizedPhone}`));
  } catch {
    return '';
  }
}

function clearCachedSignupNickname(phone) {
  if (typeof window === 'undefined') return;
  const normalizedPhone = safeTrim(phone);
  if (!normalizedPhone) return;
  try {
    window.sessionStorage.removeItem(`${SIGNUP_NICKNAME_CACHE_PREFIX}${normalizedPhone}`);
  } catch {
    // Ignore storage errors.
  }
}

function setTheme(isDark) {
  document.documentElement.classList.toggle('dark-theme', isDark);
  try {
    localStorage.setItem('orion_theme', isDark ? 'dark' : 'light');
  } catch {
    // Ignore storage errors.
  }
}

function redirectToAppHomeNow() {
  if (typeof window === 'undefined') return;
  const targetHref = getAppHomeHref();
  try {
    window.location.replace(targetHref);
  } catch {
    window.location.assign(targetHref);
  }
  window.setTimeout(() => {
    if (window.location.href !== targetHref) {
      window.location.assign(targetHref);
    }
  }, 120);
}

function readInitialTheme() {
  try {
    const saved = localStorage.getItem('orion_theme');
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
  } catch {
    // Ignore storage errors.
  }
  return true;
}

async function readJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function requestAuth(endpoint, payload) {
  let response;
  try {
    response = await fetch(buildApiUrl(endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (networkError) {
    const error = new Error('Сервер недоступний.');
    error.status = 0;
    error.cause = networkError;
    throw error;
  }

  const data = await readJsonSafe(response);
  if (!response.ok) {
    const rawMessage = data?.message || data?.error;
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter(Boolean).join(' ')
      : rawMessage || 'Помилка запиту до сервера.';
    const error = new Error(message);
    error.status = Number(response.status || 0);
    error.data = data || null;
    throw error;
  }

  return data || {};
}

async function updateProfileNickname(userId, nickname) {
  const safeUserId = safeTrim(userId);
  const safeNickname = safeTrim(nickname);
  if (!safeUserId || !safeNickname) return null;

  const response = await fetch(buildApiUrl('/users/me'), {
    method: 'PATCH',
    headers: buildAuthorizedHeaders(safeUserId, { json: true }),
    body: JSON.stringify({ nickname: safeNickname })
  });

  const data = await readJsonSafe(response);
  if (!response.ok) {
    const rawMessage = data?.message || data?.error;
    const message = Array.isArray(rawMessage)
      ? rawMessage.filter(Boolean).join(' ')
      : rawMessage || 'Не вдалося зберегти нікнейм профілю.';
    throw new Error(message);
  }

  return data || null;
}

async function fetchCurrentProfile(userId) {
  const safeUserId = safeTrim(userId);
  if (!safeUserId) return null;

  const response = await fetch(buildApiUrl('/users/me'), {
    method: 'GET',
    headers: buildAuthorizedHeaders(safeUserId)
  });
  const data = await readJsonSafe(response);
  if (!response.ok || !data || typeof data !== 'object') {
    return null;
  }
  return data;
}

function extractAuthPayload(data, fallbackUser = {}) {
  const token = safeTrim(
    data?.token ||
      data?.accessToken ||
      data?.access_token ||
      data?.data?.token ||
      data?.data?.accessToken ||
      data?.data?.access_token
  );
  const apiUser = data?.user || data?.data?.user || {};
  const user = {
    ...fallbackUser,
    ...apiUser
  };

  if (!token) {
    throw new Error('Сервер не повернув токен авторизації.');
  }

  return { token, user };
}

function getAuthorizationHeaderValue() {
  const session = getAuthSession();
  const rawToken = safeTrim(
    session?.token ||
      session?.accessToken ||
      session?.access_token
  );
  if (!rawToken) return '';
  return rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`;
}

function buildAuthorizedHeaders(userId, { json = false } = {}) {
  const headers = {};
  if (json) headers['Content-Type'] = 'application/json';
  const authHeader = getAuthorizationHeaderValue();
  if (authHeader) headers.Authorization = authHeader;
  const safeUserId = safeTrim(userId);
  if (safeUserId) headers['X-User-Id'] = safeUserId;
  return headers;
}

document.addEventListener('DOMContentLoaded', () => {
  ensureDefaultOfflineUserSeeded();
  const existing = getAuthSession();
  if (isAuthSessionValid(existing)) {
    redirectToAppHome();
    return;
  }

  const loginForm = document.getElementById('authLoginForm');
  const registerForm = document.getElementById('authRegisterForm');
  const panelTitle = document.getElementById('authPanelTitle');
  const themeToggle = document.getElementById('authThemeToggle');
  const authFormsRoot = document.querySelector('.auth-forms');
  const authPageRoot = document.querySelector('.auth-page');
  const switchToRegisterBtn = document.getElementById('switchToRegister');
  const switchToLoginBtn = document.getElementById('switchToLogin');
  const passwordToggles = document.querySelectorAll('[data-toggle-password]');
  const phoneInputs = document.querySelectorAll('[data-phone-input]');

  if (!loginForm || !registerForm || !panelTitle || !themeToggle || !authFormsRoot) {
    return;
  }

  // Lock zoom interactions for the standalone auth page.
  const zoomKeys = new Set(['+', '=', '-', '_', '0']);
  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && zoomKeys.has(event.key)) {
      event.preventDefault();
    }
  });
  document.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
  const preventGestureZoom = (event) => event.preventDefault();
  document.addEventListener('gesturestart', preventGestureZoom);
  document.addEventListener('gesturechange', preventGestureZoom);
  document.addEventListener('gestureend', preventGestureZoom);

  const state = {
    mode: 'login',
    pending: false
  };
  const FORM_ANIMATION_MS = 240;
  let activeForm = loginForm;
  let formAnimationTimer = 0;

  const setFormLoadingState = (form, pending) => {
    if (!form) return;
    const submitBtn = form.querySelector('.auth-submit');
    if (!submitBtn) return;
    const idleText = submitBtn.getAttribute('data-idle') || submitBtn.textContent || '';
    const pendingText = submitBtn.getAttribute('data-pending') || idleText;
    submitBtn.textContent = pending ? pendingText : idleText;
    submitBtn.classList.toggle('is-loading', pending);
  };

  const setPending = (pending) => {
    state.pending = pending;
    authFormsRoot.classList.toggle('is-pending', pending);
    for (const button of authFormsRoot.querySelectorAll('button')) {
      button.disabled = pending;
    }
    for (const input of authFormsRoot.querySelectorAll('input')) {
      input.disabled = pending;
    }
    setFormLoadingState(loginForm, pending && state.mode === 'login');
    setFormLoadingState(registerForm, pending && state.mode === 'register');
  };

  const setFeedback = (message, type = 'error') => {
    const text = safeTrim(message);
    if (!text) return;
    const method = type === 'success' ? 'info' : 'warn';
    console[method](`[auth] ${text}`);
  };

  const setMode = (mode, { animate = true } = {}) => {
    state.mode = mode === 'register' ? 'register' : 'login';
    const isRegister = state.mode === 'register';
    const nextForm = isRegister ? registerForm : loginForm;
    const prevForm = activeForm;
    authFormsRoot.dataset.transition = isRegister ? 'forward' : 'backward';

    if (formAnimationTimer) {
      window.clearTimeout(formAnimationTimer);
      formAnimationTimer = 0;
    }

    if (animate && prevForm !== nextForm) {
      prevForm.classList.remove('is-active');
      prevForm.classList.add('is-leaving');
      nextForm.classList.remove('is-leaving');
      nextForm.classList.add('is-active');
      formAnimationTimer = window.setTimeout(() => {
        if (activeForm !== prevForm) {
          prevForm.classList.remove('is-leaving');
        }
        formAnimationTimer = 0;
      }, FORM_ANIMATION_MS);
    } else {
      loginForm.classList.toggle('is-active', !isRegister);
      registerForm.classList.toggle('is-active', isRegister);
      loginForm.classList.remove('is-leaving');
      registerForm.classList.remove('is-leaving');
    }
    activeForm = nextForm;
    authFormsRoot.dataset.mode = state.mode;
    if (authPageRoot) authPageRoot.dataset.authMode = state.mode;
    setFormLoadingState(loginForm, false);
    setFormLoadingState(registerForm, false);

    panelTitle.textContent = isRegister ? 'Реєстрація' : 'Вхід';

    setFeedback('');
  };

  if (switchToRegisterBtn) {
    switchToRegisterBtn.addEventListener('click', () => setMode('register'));
  }
  if (switchToLoginBtn) {
    switchToLoginBtn.addEventListener('click', () => setMode('login'));
  }

  const syncPasswordToggleState = (button, input) => {
    const isVisible = input.type === 'text';
    button.classList.toggle('is-visible', isVisible);
    button.setAttribute('aria-label', isVisible ? 'Сховати пароль' : 'Показати пароль');
  };

  passwordToggles.forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const selector = btn.getAttribute('data-toggle-password');
    if (!selector) return;
    const input = document.querySelector(selector);
    if (!(input instanceof HTMLInputElement)) return;
    syncPasswordToggleState(btn, input);
    btn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      syncPasswordToggleState(btn, input);
    });
  });

  phoneInputs.forEach((input) => {
    if (!(input instanceof HTMLInputElement)) return;
    input.addEventListener('focus', () => {
      if (!input.value.trim()) input.value = '+380';
    });
    input.addEventListener('blur', () => {
      input.value = normalizePhone(input.value);
    });
  });

  const initialDark = readInitialTheme();
  const updateThemeToggleA11y = () => {
    const isDark = document.documentElement.classList.contains('dark-theme');
    themeToggle.setAttribute('aria-label', isDark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему');
  };
  setTheme(initialDark);
  updateThemeToggleA11y();
  themeToggle.addEventListener('click', () => {
    const isDark = !document.documentElement.classList.contains('dark-theme');
    setTheme(isDark);
    updateThemeToggleA11y();
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.pending) return;

    const phone = normalizePhone(document.getElementById('authLoginPhone')?.value);
    const password = safeTrim(document.getElementById('authLoginPassword')?.value);

    if (!PHONE_UA_RE.test(phone)) {
      setFeedback('Введіть номер у форматі +380XXXXXXXXX.');
      return;
    }
    if (!password) {
      setFeedback('Введіть пароль.');
      return;
    }

    setPending(true);
    setFeedback('');
    try {
      const cachedNickname = getCachedSignupNickname(phone);
      const data = await requestAuth('/auth/sign-in', {
        mobile: phone,
        password
      });
      let auth = extractAuthPayload(data, {
        name: cachedNickname || '',
        nickname: cachedNickname || '',
        phone,
        mobile: phone
      });
      const authUserId = getAuthUserId(auth);
      const profile = await fetchCurrentProfile(authUserId);
      if (profile) {
        auth = {
          ...auth,
          user: {
            ...auth.user,
            ...profile
          }
        };
      }
      setAuthSession(auth);
      syncLegacyUserProfile(auth.user);
      clearCachedSignupNickname(phone);
      redirectToAppHomeNow();
    } catch (error) {
      const offlineAuth = tryOfflineLogin(phone, password);
      if (offlineAuth) {
        setAuthSession(offlineAuth);
        syncLegacyUserProfile(offlineAuth.user);
        clearCachedSignupNickname(phone);
        const fallbackMessage = isBackendUnavailableError(error)
          ? 'Бекенд недоступний. Виконано локальний вхід.'
          : 'Виконано локальний вхід (demo mode).';
        setFeedback(fallbackMessage, 'success');
        redirectToAppHomeNow();
        return;
      }
      setFeedback(error?.message || 'Не вдалося виконати вхід.');
    } finally {
      setPending(false);
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.pending) return;

    const phone = normalizePhone(document.getElementById('authRegisterPhone')?.value);
    const nickname = safeTrim(document.getElementById('authRegisterNickname')?.value);
    const password = safeTrim(document.getElementById('authRegisterPassword')?.value);
    const confirmPassword = safeTrim(document.getElementById('authRegisterPasswordConfirm')?.value);

    if (nickname.length < 2) {
      setFeedback("Введіть нікнейм (щонайменше 2 символи).");
      return;
    }
    if (!PHONE_UA_RE.test(phone)) {
      setFeedback('Введіть номер у форматі +380XXXXXXXXX.');
      return;
    }
    if (password.length < 6) {
      setFeedback('Пароль має містити щонайменше 6 символів.');
      return;
    }
    if (password !== confirmPassword) {
      setFeedback('Паролі не співпадають.');
      return;
    }

    setPending(true);
    setFeedback('');
    try {
      setCachedSignupNickname(phone, nickname);
      const data = await requestAuth('/auth/sign-up', {
        mobile: phone,
        password,
        nickname,
        name: nickname,
        username: nickname
      });

      let authPayload = null;
      try {
        authPayload = extractAuthPayload(data, {
          name: nickname,
          nickname,
          phone,
          mobile: phone
        });
      } catch {
        authPayload = null;
      }

      if (authPayload) {
        const authUserId = getAuthUserId(authPayload);
        if (authUserId) {
          try {
            const profileUpdate = await updateProfileNickname(authUserId, nickname);
            const updatedUser = profileUpdate && typeof profileUpdate === 'object'
              ? { ...authPayload.user, ...profileUpdate, nickname }
              : { ...authPayload.user, nickname };
            authPayload = { ...authPayload, user: updatedUser };
          } catch (profileError) {
            // Do not block sign-up flow, but show explicit backend sync warning.
            setFeedback(profileError?.message || 'Акаунт створено, але нікнейм не збережено на сервері.');
          }
        }

        const profile = await fetchCurrentProfile(authUserId);
        if (profile) {
          authPayload = {
            ...authPayload,
            user: {
              ...authPayload.user,
              ...profile
            }
          };
        }

        setAuthSession(authPayload);
        syncLegacyUserProfile(authPayload.user);
        clearCachedSignupNickname(phone);
        redirectToAppHomeNow();
        return;
      }

      const loginPhone = document.getElementById('authLoginPhone');
      if (loginPhone instanceof HTMLInputElement) loginPhone.value = phone;
      setMode('login');
      setFeedback('Реєстрацію завершено. Увійдіть у свій акаунт.', 'success');
    } catch (error) {
      if (isBackendUnavailableError(error)) {
        try {
          const offlineAuthPayload = createOfflineUser({ phone, password, nickname });
          setAuthSession(offlineAuthPayload);
          syncLegacyUserProfile(offlineAuthPayload.user);
          clearCachedSignupNickname(phone);
          setFeedback('Бекенд недоступний. Акаунт створено локально.', 'success');
          redirectToAppHomeNow();
          return;
        } catch (offlineError) {
          setFeedback(offlineError?.message || 'Не вдалося створити локальний акаунт.');
          return;
        }
      }
      setFeedback(error?.message || 'Не вдалося завершити реєстрацію.');
    } finally {
      setPending(false);
    }
  });

  setMode('login', { animate: false });
});
