import { ChatApp } from './app/ChatApp.js';
import { mountAppShell } from './ui/init/mount-app-shell.js';
import {
  getAuthSession,
  isAuthSessionValid,
  redirectToAuthPage,
  syncLegacyUserProfile
} from './shared/auth/auth-session.js';

function dispatchOrionPwaEvent(name, detail = {}) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function getAppBasePath() {
  const rawBase = typeof import.meta.env?.BASE_URL === 'string'
    ? import.meta.env.BASE_URL
    : '/';
  return rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
}

function getServiceWorkerRegistrationUrl() {
  return new URL(`${getAppBasePath()}sw.js`, window.location.origin);
}

function getServiceWorkerScopePath() {
  return getAppBasePath();
}

function queueOrionNotificationOpenRequest(payload = {}) {
  window.__ORION_PENDING_NOTIFICATION_OPEN = {
    chatServerId: String(payload.chatServerId || '').trim(),
    localChatId: payload.localChatId != null ? String(payload.localChatId).trim() : '',
    url: String(payload.url || '').trim()
  };
}

function consumeOrionNotificationOpenRequest() {
  const pending = window.__ORION_PENDING_NOTIFICATION_OPEN;
  if (!pending || typeof pending !== 'object') return false;
  const app = window.app;
  if (!app || !Array.isArray(app.chats)) return false;

  const chatServerId = String(pending.chatServerId || '').trim();
  const localChatId = String(pending.localChatId || '').trim();
  const targetChat = app.chats.find((chat) => {
    if (!chat) return false;
    if (chatServerId && typeof app.resolveChatServerId === 'function' && app.resolveChatServerId(chat) === chatServerId) {
      return true;
    }
    return localChatId && String(chat.id || '').trim() === localChatId;
  }) || null;

  if (!targetChat) return false;

  const navChats = document.getElementById('navChats');
  if (navChats && typeof app.setActiveNavButton === 'function') {
    app.setActiveNavButton(navChats);
  }
  if (typeof app.selectChat === 'function') {
    app.selectChat(targetChat.id);
  }
  delete window.__ORION_PENDING_NOTIFICATION_OPEN;
  return true;
}

function bindServiceWorkerNotificationRouting() {
  if (!('serviceWorker' in navigator)) return;
  if (window.__ORION_SW_MESSAGE_BOUND) return;
  window.__ORION_SW_MESSAGE_BOUND = true;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event?.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'orion-open-chat') return;
    queueOrionNotificationOpenRequest(data);
    consumeOrionNotificationOpenRequest();
  });
}

function setPendingPwaInstallPrompt(promptEvent = null) {
  window.__ORION_PWA_DEFERRED_PROMPT = promptEvent || null;
  dispatchOrionPwaEvent('orion:pwa-installable-change', {
    canInstall: Boolean(promptEvent)
  });
}

function setPendingPwaUpdateRegistration(registration = null) {
  window.__ORION_PWA_UPDATE_REGISTRATION = registration || null;
  dispatchOrionPwaEvent('orion:pwa-update-change', {
    hasUpdate: Boolean(registration?.waiting)
  });
}

function watchPwaRegistrationForUpdates(registration) {
  if (!registration) return;

  if (registration.waiting) {
    setPendingPwaUpdateRegistration(registration);
  }

  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing;
    if (!installingWorker) return;

    installingWorker.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        setPendingPwaUpdateRegistration(registration);
      }
    });
  });
}

function bindPwaLifecycleEvents() {
  if (window.__ORION_PWA_LIFECYCLE_BOUND) return;
  window.__ORION_PWA_LIFECYCLE_BOUND = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    setPendingPwaInstallPrompt(event);
  });

  window.addEventListener('appinstalled', () => {
    setPendingPwaInstallPrompt(null);
    dispatchOrionPwaEvent('orion:pwa-installed', { installed: true });
  });
}

async function registerOrionServiceWorker() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return null;

  try {
    const registration = await navigator.serviceWorker.register(getServiceWorkerRegistrationUrl(), {
      scope: getServiceWorkerScopePath()
    });
    watchPwaRegistrationForUpdates(registration);
    return registration;
  } catch (error) {
    console.warn('Orion service worker registration failed.', error);
    return null;
  }
}

function bootOrionApp() {
  if (window.__ORION_APP_BOOTSTRAPPED) return;
  window.__ORION_APP_BOOTSTRAPPED = true;

  const session = getAuthSession();
  if (!isAuthSessionValid(session)) {
    redirectToAuthPage();
    return;
  }

  syncLegacyUserProfile(session?.user || {});
  mountAppShell();
  if (window.app && typeof window.app.realtimeSocket?.disconnect === 'function') {
    try {
      window.app.realtimeSocket.removeAllListeners?.();
      window.app.realtimeSocket.disconnect();
    } catch {
      // Ignore stale socket shutdown errors.
    }
  }
  window.app = new ChatApp();
  consumeOrionNotificationOpenRequest();
}

bindServiceWorkerNotificationRouting();
bindPwaLifecycleEvents();
window.addEventListener('load', () => {
  registerOrionServiceWorker().catch(() => {});
}, { once: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootOrionApp, { once: true });
} else {
  bootOrionApp();
}
