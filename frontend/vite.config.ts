import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  optimizeDeps: {
    include: ['jspdf', 'jspdf-autotable'],
  },
  build: {
    commonjsOptions: {
      include: [/jspdf/, /jspdf-autotable/, /node_modules/],
    },
  },
});
