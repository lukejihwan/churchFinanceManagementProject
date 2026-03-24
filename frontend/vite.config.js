import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiProxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  /** `npm run preview` 시에도 /api 가 백엔드로 전달되도록 */
  preview: {
    port: 4173,
    proxy: apiProxy,
  },
});
