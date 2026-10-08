/**
 * Application & Backend Configuration
 * Single source of truth for backend URLs, API endpoints, and asset resolution.
 */

export const DEFAULT_BACKEND_URL = 'https://backend-production-18db.up.railway.app';

// 1. Resolve origin: prioritize VITE_BACKEND_TARGET / VITE_BACKEND_URL, otherwise fallback to Railway production
const rawOrigin: string =
  (import.meta as any).env?.VITE_BACKEND_TARGET ||
  (import.meta as any).env?.VITE_BACKEND_URL ||
  DEFAULT_BACKEND_URL;

// 2. Normalization: strip trailing slashes and any trailing '/api'
export const BACKEND_URL = rawOrigin.replace(/\/+$/, '').replace(/\/api$/, '');

// 3. API Base endpoint: defaults to relative '/api' (forwarded to backend by Vite proxy or Vercel rewrite)
// If VITE_API_URL is explicitly set, use it directly.
export const API_BASE_URL: string = (import.meta as any).env?.VITE_API_URL || '/api';

export const config = {
  backendUrl: BACKEND_URL,
  apiUrl: API_BASE_URL,
  defaultBackendUrl: DEFAULT_BACKEND_URL,
  isProduction: (import.meta as any).env?.PROD ?? true,

  /** Builds a full API endpoint URL: config.getApiUrl('/support/tickets') */
  getApiUrl: (path: string): string => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
  },

  /** Resolves media/uploaded image URLs */
  getAssetUrl: (path?: string | null): string => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BACKEND_URL}${cleanPath}`;
  },
};

export default config;
