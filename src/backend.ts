import type { PointsEvent, ReminderPreferences } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export const backendConfigured = Boolean(url && anonKey)
const sessionKey = 'viva-auth-session'
const pendingPointsKey = 'viva-pending-point-events'

export interface VivaAccount { id: string; email: string; accessToken: string; refreshToken?: string; expiresAt?: number }

export interface AccountSnapshot {
  displayName: string
  avatarUrl?: string
  points: number
  level: string
  pointEvents: PointsEvent[]
  achievementIds: string[]
}

export interface PrivateBackupPayload { version: number; entries: Record<string, string> }
export interface PrivateBackup { payload: PrivateBackupPayload; updatedAt: string }

export function getStoredAccount(): VivaAccount | null {
  try { return JSON.parse(localStorage.getItem(sessionKey) || 'null') } catch { return null }
}

export interface LeaderboardEntry {
  rank: number
  display_name: string
  points: number
  level: string
  avatar_url?: string
}

function headers() {
  const token = getStoredAccount()?.accessToken || anonKey || ''
  return { apikey: anonKey || '', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

function accountFromAuth(data: any): VivaAccount {
  return {
    id: data.user.id,
    email: data.user.email,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  }
}

export async function refreshSession() {
  const current = getStoredAccount()
  if (!current || !backendConfigured) return current
  if (!current.refreshToken || (current.expiresAt && current.expiresAt > Date.now() + 60_000)) return current
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: anonKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: current.refreshToken }),
  })
  if (!response.ok) {
    signOut()
    return null
  }
  const account = accountFromAuth(await response.json())
  localStorage.setItem(sessionKey, JSON.stringify(account))
  return account
}

export async function createAccount(email: string, password: string, displayName: string) {
  if (!backendConfigured) throw new Error('Backend ainda não configurado')
  const response = await fetch(`${url}/auth/v1/signup`, { method: 'POST', headers: { apikey: anonKey!, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, data: { display_name: displayName.trim().slice(0, 30) } }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.msg || data.message || 'Não foi possível criar a conta')
  if (!data.access_token) return { verificationRequired: true as const, account: null }
  const account = accountFromAuth(data)
  localStorage.setItem(sessionKey, JSON.stringify(account))
  return { verificationRequired: false as const, account }
}

export async function signIn(email: string, password: string) {
  if (!backendConfigured) throw new Error('Backend ainda não configurado')
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: anonKey!, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error_description || data.msg || 'E-mail ou senha inválidos')
  const account = accountFromAuth(data)
  localStorage.setItem(sessionKey, JSON.stringify(account))
  return account
}

export async function requestPasswordReset(email: string) {
  if (!backendConfigured) throw new Error('Backend ainda não configurado')
  const redirectTo = `${window.location.origin}/`
  const response = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    headers: { apikey: anonKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  if (!response.ok) throw new Error('Não foi possível enviar o e-mail de recuperação')
}

export async function consumeRecoverySession() {
  if (!backendConfigured || !location.hash) return null
  const params = new URLSearchParams(location.hash.slice(1))
  if (params.get('type') !== 'recovery' || !params.get('access_token')) return null
  const accessToken = params.get('access_token')!
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey!, Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) throw new Error('O link de recuperação expirou')
  const user = await response.json()
  const account: VivaAccount = {
    id: user.id,
    email: user.email,
    accessToken,
    refreshToken: params.get('refresh_token') || undefined,
    expiresAt: Date.now() + Number(params.get('expires_in') || 3600) * 1000,
  }
  localStorage.setItem(sessionKey, JSON.stringify(account))
  history.replaceState({}, '', `${location.pathname}${location.search}`)
  return account
}

export function signOut() { localStorage.removeItem(sessionKey) }

export async function updatePassword(password: string) {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conecte sua conta antes de alterar a senha')
  const response = await fetch(`${url}/auth/v1/user`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ password }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.msg || data.message || 'Não foi possível alterar a senha')
}

export async function updateEmail(email: string) {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conecte sua conta antes de alterar o e-mail')
  const response = await fetch(`${url}/auth/v1/user`, { method: 'PUT', headers: headers(), body: JSON.stringify({ email }) })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.msg || data.message || 'Não foi possível alterar o e-mail')
}

export async function deleteAccount() {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conta não conectada')
  const response = await fetch(`${url}/functions/v1/delete-account`, { method: 'POST', headers: headers(), body: '{}' })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Não foi possível excluir a conta')
  signOut()
}

export async function fetchAccountSnapshot(): Promise<AccountSnapshot> {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conecte sua conta para sincronizar o perfil')
  const [profileResponse, eventsResponse, achievementsResponse] = await Promise.all([
    fetch(`${url}/rest/v1/profiles?id=eq.${account.id}&select=display_name,avatar_url,points,level`, { headers: headers() }),
    fetch(`${url}/rest/v1/point_events?user_id=eq.${account.id}&select=id,action_key,label,points,is_bonus,action_date&order=created_at.asc`, { headers: headers() }),
    fetch(`${url}/rest/v1/user_achievements?user_id=eq.${account.id}&select=achievement_id`, { headers: headers() }),
  ])
  if (!profileResponse.ok || !eventsResponse.ok || !achievementsResponse.ok) throw new Error('Não foi possível sincronizar os dados da conta')
  const profiles = await profileResponse.json()
  const profile = profiles[0]
  if (!profile) throw new Error('Perfil online não encontrado')
  const events = await eventsResponse.json()
  const unlocked = await achievementsResponse.json()
  return {
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url || undefined,
    points: profile.points,
    level: profile.level,
    pointEvents: events.map((event: any) => ({
      id: event.id,
      date: event.action_date,
      type: event.action_key,
      label: event.label,
      points: event.points,
      bonus: event.is_bonus,
    } satisfies PointsEvent)),
    achievementIds: unlocked.map((item: { achievement_id: string }) => item.achievement_id),
  }
}

export async function fetchPrivateBackup(): Promise<PrivateBackup | null> {
  const account = await refreshSession()
  if (!backendConfigured || !account) return null
  const response = await fetch(`${url}/rest/v1/user_backups?user_id=eq.${account.id}&select=payload,updated_at`, { headers: headers() })
  if (!response.ok) throw new Error('Não foi possível carregar o backup privado')
  const rows = await response.json()
  if (!rows[0]) return null
  return { payload: rows[0].payload, updatedAt: rows[0].updated_at }
}

export async function savePrivateBackup(payload: PrivateBackupPayload) {
  const account = await refreshSession()
  if (!backendConfigured || !account) return
  const response = await fetch(`${url}/rest/v1/user_backups?on_conflict=user_id`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ user_id: account.id, payload }),
  })
  if (!response.ok) throw new Error('Não foi possível salvar o backup privado')
  const rows = await response.json()
  return rows[0]?.updated_at as string | undefined
}

export async function updatePublicProfile(displayName: string, avatarUrl?: string | null) {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conecte sua conta para alterar o perfil')
  const body: { display_name: string; avatar_url?: string | null } = { display_name: displayName }
  if (avatarUrl !== undefined) body.avatar_url = avatarUrl
  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${account.id}`, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('Não foi possível atualizar o perfil online')
}

export async function uploadAvatar(file: File) {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conecte sua conta para alterar a foto')
  const objectPath = `${account.id}/avatar`
  const response = await fetch(`${url}/storage/v1/object/avatars/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: anonKey!,
      Authorization: `Bearer ${account.accessToken}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: file,
  })
  if (!response.ok) throw new Error('Não foi possível enviar a foto. Verifique se a migração de avatares foi aplicada.')
  const publicUrl = `${url}/storage/v1/object/public/avatars/${objectPath}?v=${Date.now()}`
  const snapshot = await fetchAccountSnapshot()
  await updatePublicProfile(snapshot.displayName, publicUrl)
  return publicUrl
}

export async function removeAvatar() {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conecte sua conta para remover a foto')
  const snapshot = await fetchAccountSnapshot()
  await updatePublicProfile(snapshot.displayName, null)
  const response = await fetch(`${url}/storage/v1/object/avatars/${account.id}/avatar`, {
    method: 'DELETE',
    headers: { apikey: anonKey!, Authorization: `Bearer ${account.accessToken}` },
  })
  if (!response.ok && response.status !== 404) throw new Error('Foto removida do perfil, mas o arquivo antigo não pôde ser excluído')
}

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (!backendConfigured) return []
  const response = await fetch(`${url}/rest/v1/leaderboard?select=display_name,points,level,avatar_url&order=points.desc&limit=100`, { headers: headers() })
  if (!response.ok) throw new Error('Não foi possível carregar o ranking')
  const rows = await response.json()
  return rows.map((row: Omit<LeaderboardEntry, 'rank'>, index: number) => ({ ...row, rank: index + 1 }))
}

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0))
}

export async function enableWebPush(preferences: ReminderPreferences) {
  const account = await refreshSession()
  if (!backendConfigured || !vapidPublicKey || !account) return { online: false as const }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Este navegador não oferece suporte a notificações push')
  if (typeof navigator.serviceWorker.getRegistration === 'function' && !await navigator.serviceWorker.getRegistration()) {
    await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
  }
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('O serviço de notificações não iniciou. Atualize a página e tente novamente.')), 8000)),
  ])
  const existing = await registration.pushManager.getSubscription()
  const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) })
  const response = await fetch(`${url}/functions/v1/register-push`, { method: 'POST', headers: headers(), body: JSON.stringify({ subscription: subscription.toJSON(), preferences, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) })
  if (!response.ok) throw new Error('Não foi possível salvar o lembrete push')
  return { online: true as const }
}

export async function disableWebPush() {
  const account = await refreshSession()
  if (!backendConfigured || !account) return { online: false as const }
  const response = await fetch(`${url}/rest/v1/reminder_preferences?user_id=eq.${account.id}`, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ enabled: false, updated_at: new Date().toISOString() }),
  })
  if (!response.ok) throw new Error('Não foi possível pausar o lembrete online')
  return { online: true as const }
}

export async function sendTestWaterReminder() {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conecte sua conta para testar o push')
  const response = await fetch(`${url}/functions/v1/send-water-reminders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ test: true }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Não foi possível enviar a notificação de teste')
  if (!data.sent) throw new Error('Nenhum dispositivo está inscrito. Pause e ative os lembretes novamente.')
  return data.sent as number
}

export async function syncPointEvents(events: PointsEvent[]) {
  const storedAccount = getStoredAccount()
  const queueKey = storedAccount ? `viva-user-${storedAccount.id}:${pendingPointsKey}` : pendingPointsKey
  let queued: PointsEvent[] = []
  try { queued = JSON.parse(localStorage.getItem(queueKey) || '[]') } catch { /* fila vazia */ }
  const unique = new Map([...queued, ...events].map(event => [event.id, event]))
  const minimumDate = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  const pending = [...unique.values()].filter(item => !item.bonus && item.type !== 'cadastro' && item.type !== 'conquista' && item.date >= minimumDate)
  localStorage.setItem(queueKey, JSON.stringify(pending))

  if (!backendConfigured || !await refreshSession() || !navigator.onLine) return
  const remaining: PointsEvent[] = []
  for (const event of pending) {
    try {
      const response = await fetch(`${url}/functions/v1/award-points`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ eventId: event.id, actionKey: event.type, actionDate: event.date }),
      })
      if (!response.ok) remaining.push(event)
    } catch { remaining.push(event) }
  }
  localStorage.setItem(queueKey, JSON.stringify(remaining))
}

export async function fetchRankingVisibility(): Promise<boolean> {
  const account = await refreshSession()
  if (!backendConfigured || !account) return true
  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${account.id}&select=appear_in_ranking`, { headers: headers() })
  if (!response.ok) return true
  const rows = await response.json()
  return rows[0]?.appear_in_ranking ?? true
}

export async function setRankingVisibility(visible: boolean) {
  const account = await refreshSession()
  if (!backendConfigured || !account) throw new Error('Conecte sua conta para alterar o ranking')
  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${account.id}`, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ appear_in_ranking: visible }),
  })
  if (!response.ok) throw new Error('Não foi possível atualizar a preferência de ranking')
}

export async function markHydrationGoalComplete(date: string) {
  const account = await refreshSession()
  if (!backendConfigured || !account) return
  await fetch(`${url}/rest/v1/reminder_preferences?user_id=eq.${account.id}`, { method: 'PATCH', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify({ hydration_completed_on: date }) })
}
