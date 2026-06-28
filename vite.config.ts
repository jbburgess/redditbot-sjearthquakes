import { defineConfig } from 'vite';
import { devvit } from '@devvit/start/vite';

// Use the official Devvit build plugin (single CommonJS file at dist/server/index.cjs)
// See devvit.json "server".
export default defineConfig({
  plugins: [devvit()],
});
