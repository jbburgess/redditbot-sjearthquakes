import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

// Builds the Devvit server bundle as a single CommonJS file.
// The Devvit Web runtime loads dist/server/index.cjs (see devvit.json "server").
export default defineConfig({
  ssr: {
    noExternal: true,
  },
  build: {
    emptyOutDir: false,
    ssr: 'src/server/index.ts',
    outDir: 'dist/server',
    target: 'node22',
    sourcemap: true,
    rollupOptions: {
      external: [...builtinModules],
      output: {
        format: 'cjs',
        entryFileNames: 'index.cjs',
        inlineDynamicImports: true,
      },
    },
  },
});
