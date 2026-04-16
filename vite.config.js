import { defineConfig } from 'vite';

function normalizeBasePath(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw === '/') return '/';

  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

const DEFAULT_PAGES_BASE = '/Nymo/';
const configuredPagesBase = normalizeBasePath(process.env.VITE_BASE_PATH);
const pagesBase = configuredPagesBase || DEFAULT_PAGES_BASE;

export default defineConfig(({ command }) => ({
  base: command === 'build' ? pagesBase : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
      port: 5173,
      clientPort: 5173
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        auth: 'auth/index.html'
      }
    }
  }
}));
