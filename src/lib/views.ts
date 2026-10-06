import type { SortKey } from './queue'

export type SavedView = { id: string; label: string; filterId: string; search: string; sort: SortKey }

const KEY = 'gdv_support_views'

export function loadViews(): SavedView[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export function saveViews(views: SavedView[]) {
  localStorage.setItem(KEY, JSON.stringify(views))
}
