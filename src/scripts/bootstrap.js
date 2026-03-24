import { ChatApp } from './app/ChatApp.js';
import { mountAppShell } from './ui/init/mount-app-shell.js';
import {
  getAuthSession,
  isAuthSessionValid,
  redirectToAuthPage,
  syncLegacyUserProfile
} from './shared/auth/auth-session.js';

document.addEventListener('DOMContentLoaded', () => {
  const session = getAuthSession();
  if (!isAuthSessionValid(session)) {
    redirectToAuthPage();
    return;
  }

  syncLegacyUserProfile(session?.user || {});
  mountAppShell();
  window.app = new ChatApp();
});
