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
const hmrHost = String(process.env.VITE_HMR_HOST || '').trim();
const hmrProtocol = String(process.env.VITE_HMR_PROTOCOL || '').trim();
const hmrPort = Number.parseInt(process.env.VITE_HMR_PORT || '', 10);
const hmrClientPort = Number.parseInt(process.env.VITE_HMR_CLIENT_PORT || '', 10);
const hasCustomHmrConfig = Boolean(
  hmrHost
  || hmrProtocol
  || Number.isFinite(hmrPort)
  || Number.isFinite(hmrClientPort)
);

const hmrConfig = hasCustomHmrConfig
  ? {
      ...(hmrProtocol ? { protocol: hmrProtocol } : {}),
      ...(hmrHost ? { host: hmrHost } : {}),
      ...(Number.isFinite(hmrPort) ? { port: hmrPort } : {}),
      ...(Number.isFinite(hmrClientPort) ? { clientPort: hmrClientPort } : {})
    }
  : undefined;

export default defineConfig(({ command }) => ({
  base: command === 'build' ? pagesBase : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    ...(hmrConfig ? { hmr: hmrConfig } : {})
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
