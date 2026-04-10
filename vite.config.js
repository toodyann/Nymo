import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Orion';
const pagesBase = `/${repositoryName}/`;

export default defineConfig(({ command }) => ({
  base: command === 'build' ? pagesBase : '/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
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
