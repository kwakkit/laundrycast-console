/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages: https://kwakkit.github.io/laundrycast-console/
export default defineConfig({
  base: '/laundrycast-console/',
  plugins: [react()],
  test: { environment: 'node' },
});
