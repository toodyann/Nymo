import { defineConfig } from 'vite';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'Orion';
const pagesBase = `/${repositoryName}/`;

export default defineConfig(({ command }) => ({
  base: command === 'build' ? pagesBase : '/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        auth: 'auth/index.html'
      }
    }
  }
}));
