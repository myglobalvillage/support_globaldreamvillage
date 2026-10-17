/**
 * Villa/property API client for the Onboarding tab.
 * Ported from GlobalVillage/src/services/api.ts (villaAPI) and talks to the same
 * Global Dream Village backend (/api/villas...), authenticating with the support
 * console's session token.
 */
import config from '../config'
import { getToken } from '../api'

export const API_BASE_URL = config.apiUrl

const ENDPOINTS = {
  LIST: '/villas',
  AMENITIES: '/villas/amenities',
  BY_ID: (id: string) => `/villas/${id}`,
  UPLOAD_IMAGE: '/villas/upload-image',
}

async function apiRequest(endpoint: string, method = 'GET', body?: unknown): Promise<any> {
  const token = getToken()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000)

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text()
      throw new Error(`Server error (HTTP ${response.status}): ${text.slice(0, 150)}`)
    }
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`)
    return data
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') throw new Error('Server took too long to respond. Please try again.')
    const msg = error.message || ''
    if (msg === 'Load failed' || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.')
    }
    console.error(`API Error [${method} ${endpoint}]:`, error)
    throw error
  }
}

export const villaAPI = {
  listVillas: (skip = 0, limit = 10, filters?: any) => {
    const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined && filters[key] !== null) {
          params.append(key, String(filters[key]))
        }
      })
    }
    return apiRequest(`${ENDPOINTS.LIST}?${params.toString()}`, 'GET')
  },
  getVillaById: (villaId: string) => apiRequest(ENDPOINTS.BY_ID(villaId), 'GET'),
  getAmenities: () => apiRequest(ENDPOINTS.AMENITIES, 'GET'),
  createVilla: (data: any) => apiRequest(ENDPOINTS.LIST, 'POST', data),
  updateVilla: (villaId: string, data: any) => apiRequest(ENDPOINTS.BY_ID(villaId), 'PUT', data),
  deleteVilla: (villaId: string) => apiRequest(ENDPOINTS.BY_ID(villaId), 'DELETE'),
  uploadImage: (image: string) => apiRequest(ENDPOINTS.UPLOAD_IMAGE, 'POST', { image }),
}
