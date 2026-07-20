import type { PrivateBackupPayload } from './backend'

export const PRIVATE_DATA_CHANGED_EVENT = 'viva:private-data-changed'
const metaKey = (accountId: string) => `viva-user-${accountId}:viva-local-updated-at`
const prefixFor = (accountId: string) => `viva-user-${accountId}:`
const enabledAccounts = new Set<string>()

export function enablePrivateSync(accountId: string) { enabledAccounts.add(accountId) }
export function disablePrivateSync(accountId: string) { enabledAccounts.delete(accountId) }

export function notifyPrivateDataChanged(storageKey: string) {
  const match = storageKey.match(/^viva-user-([^:]+):/)
  if (!match || !enabledAccounts.has(match[1]) || storageKey.endsWith(':viva-local-updated-at')) return
  localStorage.setItem(metaKey(match[1]), new Date().toISOString())
  window.dispatchEvent(new CustomEvent(PRIVATE_DATA_CHANGED_EVENT, { detail: { accountId: match[1] } }))
}

export function localBackupUpdatedAt(accountId: string) {
  return localStorage.getItem(metaKey(accountId)) || ''
}

export function markPrivateBackupSynced(accountId: string, updatedAt?: string) {
  localStorage.setItem(metaKey(accountId), updatedAt || new Date().toISOString())
}

export function collectPrivateBackup(accountId: string): PrivateBackupPayload {
  const prefix = prefixFor(accountId)
  const entries: Record<string, string> = {}
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (!key?.startsWith(prefix) || key === metaKey(accountId) || key.endsWith(':viva-pending-point-events')) continue
    const value = localStorage.getItem(key)
    if (value !== null) entries[key.slice(prefix.length)] = value
  }
  return { version: 1, entries }
}

export function restorePrivateBackup(accountId: string, payload: PrivateBackupPayload, updatedAt: string) {
  const prefix = prefixFor(accountId)
  const removable: string[] = []
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index)
    if (key?.startsWith(prefix) && key !== metaKey(accountId) && !key.endsWith(':viva-pending-point-events')) removable.push(key)
  }
  removable.forEach(key => localStorage.removeItem(key))
  Object.entries(payload.entries || {}).forEach(([key, value]) => localStorage.setItem(`${prefix}${key}`, value))
  localStorage.setItem(metaKey(accountId), updatedAt)
}
