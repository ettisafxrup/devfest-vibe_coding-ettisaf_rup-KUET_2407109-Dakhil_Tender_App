import { defineConfig } from "vitest/config";
import react from '@vitejs/plugin-react';

// Absolute base: pages live at clean paths (/sample, /tender), so assets must
// resolve from the site root whatever the current path is.
export default defineConfig({
  base: '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
