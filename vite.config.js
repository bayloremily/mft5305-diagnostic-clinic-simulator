import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => ({
  base:
    command === 'serve'
      ? '/'
      : mode === 'scorm'
        ? './'
        : '/mft5305-diagnostic-clinic-simulator/',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
  },
}))
