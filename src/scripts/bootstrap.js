import './ui/init/mount-app-shell.js';
import { ChatApp } from './app/ChatApp.js';

document.addEventListener('DOMContentLoaded', () => {
  window.app = new ChatApp();
});
