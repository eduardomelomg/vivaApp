import type { Profile } from './types'

export function getMetrics(profile: Profile) {
  const heightM = profile.height / 100
  const bmi = profile.weight / (heightM * heightM)
  const base = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + (profile.sex === 'masculino' ? 5 : -161)
  const maintenance = Math.round(base * profile.activity)
  const calories = maintenance + (profile.goal === 'perder' ? -400 : profile.goal === 'ganhar' ? 300 : 0)
  const water = Math.round(profile.weight * profile.waterMultiplier / 50) * 50
  return { bmi, maintenance, calories, water }
}

// Estimativa de gasto calórico por METs: kcal = MET × peso(kg) × horas.
export function activityKcal(met: number, weightKg: number, minutes: number) {
  return Math.round(met * weightKg * (minutes / 60))
}

export function bmiLabel(bmi: number) {
  if (bmi < 18.5) return 'Abaixo do peso'
  if (bmi < 25) return 'Faixa adequada'
  if (bmi < 30) return 'Sobrepeso'
  return 'Obesidade'
}

export const todayKey = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`

const accountStorageKeys = new Set([
  'viva-profile',
  'viva-onboarding-complete',
  'viva-reminder',
  'viva-points',
  'viva-achievements',
  'viva-workout-sessions',
  'viva-weight-history',
  'viva-custom-foods',
  'viva-favorite-foods',
  'viva-meal-templates',
  'viva-pending-point-events',
])
const accountStoragePrefixes = ['viva-water-', 'viva-meals-', 'viva-activities-', 'viva-workout-logs-', 'viva-workout-timers-', 'viva-recurring-applied-']

export function scopedStorageKey(accountId: string | undefined, key: string) {
  return accountId ? `viva-user-${accountId}:${key}` : key
}

// A primeira conta conectada herda os dados locais já existentes. As próximas
// recebem um espaço vazio, impedindo que pessoas no mesmo aparelho vejam dados
// umas das outras.
export function claimLegacyStorage(accountId: string) {
  const claimKey = 'viva-storage-claimed-by'
  const claimedBy = localStorage.getItem(claimKey)
  if (claimedBy) return
  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean) as string[]
  for (const key of keys) {
    const belongsToAccount = accountStorageKeys.has(key) || accountStoragePrefixes.some(prefix => key.startsWith(prefix))
    if (!belongsToAccount) continue
    const destination = scopedStorageKey(accountId, key)
    if (localStorage.getItem(destination) === null) localStorage.setItem(destination, localStorage.getItem(key)!)
  }
  localStorage.setItem(claimKey, accountId)
}

// Mantém os dados diários usados pelos relatórios e remove os mais antigos para
// impedir crescimento ilimitado do armazenamento local.
export function cleanupOldDailyKeys(keepDays = 30) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - keepDays)
  const cutoffKey = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`
  const prefixes = ['viva-water-', 'viva-meals-', 'viva-activities-', 'viva-workout-logs-', 'viva-workout-timers-']
  for (let index = localStorage.length - 1; index >= 0; index--) {
    const key = localStorage.key(index)
    if (!key) continue
    const unscopedKey = key.replace(/^viva-user-[^:]+:/, '')
    const prefix = prefixes.find(item => unscopedKey.startsWith(item))
    if (!prefix) continue
    const date = unscopedKey.slice(prefix.length)
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date < cutoffKey) localStorage.removeItem(key)
  }
}
