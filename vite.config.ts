import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  test: {
    environment: 'node',
    globals: true,
    include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],
  },
});
