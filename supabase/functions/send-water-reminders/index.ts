import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const keyFromSet = (name: string) => {
  try { return JSON.parse(Deno.env.get(name) || '{}').default as string | undefined } catch { return undefined }
}
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || keyFromSet('SUPABASE_SECRET_KEYS')!
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || keyFromSet('SUPABASE_PUBLISHABLE_KEYS')!
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const authorization = request.headers.get('Authorization') || ''
  const isCron = authorization === `Bearer ${Deno.env.get('CRON_SECRET')}`

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@example.com'
  if (!vapidPublicKey || !vapidPrivateKey) return Response.json({ error: 'Secrets VAPID ausentes' }, { status: 500, headers: cors })
  try { webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey) }
  catch { return Response.json({ error: 'Configuração VAPID inválida' }, { status: 500, headers: cors }) }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey)
  const sendToUser = async (userId: string, test = false) => {
    const { data: subscriptions, error } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId)
    if (error) throw error
    let sent = 0
    for (const subscription of subscriptions || []) {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({
          title: test ? 'Push do Viva funcionando! ✅' : 'Hora de beber água 💧',
          body: test ? 'Tudo certo: seus lembretes podem chegar mesmo com a PWA fechada.' : 'Registre um copo e mantenha sua meta no caminho.',
          url: '/?page=agua',
        }))
        sent++
      } catch (pushError) {
        const status = (pushError as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id)
      }
    }
    return sent
  }

  if (!isCron) {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user } } = await userClient.auth.getUser()
    const body = await request.json().catch(() => ({}))
    if (!user || body.test !== true) return new Response('Não autorizado', { status: 401, headers: cors })
    try {
      const sent = await sendToUser(user.id, true)
      return Response.json({ sent }, { headers: cors })
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : 'Erro ao testar o push' }, { status: 500, headers: cors })
    }
  }

  const now = new Date()
  const { data: due, error } = await admin.from('reminder_preferences').select('user_id,interval_minutes,start_time,end_time,timezone,stop_at_goal,hydration_completed_on').eq('enabled', true).lte('next_send_at', now.toISOString()).limit(500)
  if (error) return Response.json({ error: error.message }, { status: 500, headers: cors })

  let sent = 0
  for (const preference of due || []) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: preference.timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now)
    const part = (type: string) => parts.find(item => item.type === type)?.value || ''
    const localDate = `${part('year')}-${part('month')}-${part('day')}`
    const localTime = `${part('hour')}:${part('minute')}`
    const inWindow = localTime >= preference.start_time.slice(0, 5) && localTime <= preference.end_time.slice(0, 5)
    const goalCompleted = preference.stop_at_goal && preference.hydration_completed_on === localDate
    if (inWindow && !goalCompleted) sent += await sendToUser(preference.user_id)
    await admin.from('reminder_preferences').update({ next_send_at: new Date(Date.now() + preference.interval_minutes * 60_000).toISOString() }).eq('user_id', preference.user_id)
  }
  return Response.json({ sent }, { headers: cors })
})
