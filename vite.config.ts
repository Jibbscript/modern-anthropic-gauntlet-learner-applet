import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `--mode artifact` produces one self-contained HTML file (all JS/CSS inlined)
// that scripts/make-artifact.ts turns into a publishable page.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'artifact' ? [viteSingleFile()] : [])],
  define: {
    __ARTIFACT__: JSON.stringify(mode === 'artifact'),
  },
  build: {
    outDir: mode === 'artifact' ? 'dist-artifact' : 'dist',
    chunkSizeWarningLimit: 4000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
  },
}))
