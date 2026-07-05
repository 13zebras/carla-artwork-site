import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value;
  }

  return {
    resolve: { tsconfigPaths: true },
    test: {
      setupFiles: ['./src/test/setup.ts'],
    },
    plugins: [
      devtools({
        enhancedLogs: { enabled: false },
        consolePiping: { enabled: false },
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
      nitro(),
    ],
  };
});
