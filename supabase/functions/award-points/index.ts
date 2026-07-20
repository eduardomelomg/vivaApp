import { createClient } from 'jsr:@supabase/supabase-js@2'

const keyFromSet = (name: string) => {
  try { return JSON.parse(Deno.env.get(name) || '{}').default as string | undefined } catch { return undefined }
}
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || keyFromSet('SUPABASE_PUBLISHABLE_KEYS')!
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || keyFromSet('SUPABASE_SECRET_KEYS')!

const rules: Record<string, { points: number; max: number; label: string }> = {
  agua: { points: 5, max: 3, label: 'Registro de água' },
  meta_agua: { points: 15, max: 1, label: 'Meta de água concluída' },
  refeicao: { points: 5, max: 4, label: 'Alimento registrado' },
  treino: { points: 50, max: 1, label: 'Treino concluído' },
}
const bonuses = [
  { id: 'first-workout', days: 9999, count: 1, points: 0, label: 'Primeiro passo' },
  { id: 'active-week', days: 7, count: 3, points: 100, label: 'Semana ativa' },
  { id: 'strong-month', days: 30, count: 12, points: 500, label: 'Mês consistente' },
  { id: 'strong-quarter', days: 90, count: 36, points: 1500, label: 'Trimestre imparável' },
]
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type' }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const authorization = request.headers.get('Authorization') || ''
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey, { global: { headers: { Authorization: authorization } } })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey)
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return new Response('Não autorizado', { status: 401, headers: cors })
  const { eventId, actionKey, actionDate } = await request.json()
  const rule = rules[actionKey]
  if (!rule || !/^[0-9a-f-]{36}$/i.test(eventId)) return new Response('Evento inválido', { status: 400, headers: cors })

  const today = new Date().toISOString().slice(0, 10)
  const minimumDate = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(actionDate || '') ? actionDate : today
  if (date < minimumDate || date > today) return new Response('Data do evento inválida', { status: 400, headers: cors })
  const { data: duplicate } = await admin.from('point_events').select('id').eq('id', eventId).maybeSingle()
  if (duplicate) return Response.json({ awarded: 0, duplicate: true }, { headers: cors })
  const { data: todaysEvents } = await admin.from('point_events').select('action_key,points').eq('user_id', user.id).eq('action_date', date).eq('is_bonus', false)
  const sameType = (todaysEvents || []).filter(event => event.action_key === actionKey).length
  const dailyTotal = (todaysEvents || []).reduce((sum, event) => sum + event.points, 0)
  const awarded = sameType >= rule.max ? 0 : Math.max(0, Math.min(rule.points, 100 - dailyTotal))
  if (!awarded) return Response.json({ awarded: 0, limitReached: true }, { headers: cors })

  await admin.from('point_events').insert({ id: eventId, user_id: user.id, action_key: actionKey, label: rule.label, points: awarded, action_date: date })
  if (actionKey === 'treino') await admin.from('workout_sessions').upsert({ id: eventId, user_id: user.id, session_date: date }, { onConflict: 'user_id,session_date', ignoreDuplicates: true })

  let bonusTotal = 0
  if (actionKey === 'treino') {
    for (const bonus of bonuses) {
      const since = new Date(Date.now() - bonus.days * 86_400_000).toISOString().slice(0, 10)
      const { count } = await admin.from('workout_sessions').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('session_date', since)
      if ((count || 0) < bonus.count) continue
      const { error } = await admin.from('user_achievements').insert({ user_id: user.id, achievement_id: bonus.id })
      if (!error && bonus.points) {
        bonusTotal += bonus.points
        await admin.from('point_events').insert({ user_id: user.id, action_key: 'conquista', label: bonus.label, points: bonus.points, is_bonus: true, action_date: date })
      }
    }
  }
  const { data: profile } = await admin.from('profiles').select('points').eq('id', user.id).single()
  const points = (profile?.points || 0) + awarded + bonusTotal
  const level = points >= 7000 ? 'Imparável' : points >= 3500 ? 'Determinado' : points >= 1500 ? 'Consistente' : points >= 500 ? 'Em movimento' : 'Iniciante'
  await admin.from('profiles').update({ points, level }).eq('id', user.id)
  return Response.json({ awarded, bonus: bonusTotal, points, level }, { headers: cors })
})
