import { ChatApp } from './app/ChatApp.js';
import { mountAppShell } from './ui/init/mount-app-shell.js';
import {
  getAuthSession,
  isAuthSessionValid,
  redirectToAuthPage,
  syncLegacyUserProfile
} from './shared/auth/auth-session.js';

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
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootOrionApp, { once: true });
} else {
  bootOrionApp();
}
