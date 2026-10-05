import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// The console talks to the Global Dream Village backend. Set VITE_BACKEND_TARGET
// (see .env.example) to the backend origin; /api is proxied to it.
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const rawTarget = env.VITE_BACKEND_TARGET || 'http://localhost:5000'
  // Normalize target: strip any trailing /api or slashes so proxy /api doesn't duplicate
  const target = rawTarget.replace(/\/api\/?$/, '').replace(/\/+$/, '')
  const proxy = { '/api': { target, changeOrigin: true, secure: true } }

  return {
    plugins: [react()],
    server: { host: '0.0.0.0', port: 3100, proxy },
    preview: {
      allowedHosts: true,
      host: '0.0.0.0',
      port: env.PORT ? parseInt(env.PORT) : 3100,
      proxy,
    },
  }
})
