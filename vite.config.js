import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Nymo';
const pagesBase = `/${repositoryName}/`;

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
