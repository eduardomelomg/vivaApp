import { createClient } from 'jsr:@supabase/supabase-js@2'

const keyFromSet = (name: string) => {
  try { return JSON.parse(Deno.env.get(name) || '{}').default as string | undefined } catch { return undefined }
}
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || keyFromSet('SUPABASE_PUBLISHABLE_KEYS')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authorization = request.headers.get('Authorization') || ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey, { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return new Response('Não autorizado', { status: 401, headers: corsHeaders })

    const { subscription, preferences, timezone } = await request.json()
    const keys = subscription?.keys
    if (!subscription?.endpoint || !keys?.p256dh || !keys?.auth) return new Response('Inscrição inválida', { status: 400, headers: corsHeaders })

    const { error: subscriptionError } = await supabase.from('push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: request.headers.get('user-agent'),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })
    if (subscriptionError) throw subscriptionError

    const { error: preferencesError } = await supabase.from('reminder_preferences').upsert({
      user_id: user.id,
      enabled: true,
      interval_minutes: preferences.minutes,
      start_time: preferences.startHour,
      end_time: preferences.endHour,
      stop_at_goal: preferences.stopAtGoal,
      timezone,
      next_send_at: new Date(Date.now() + preferences.minutes * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (preferencesError) throw preferencesError
    return Response.json({ ok: true }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Erro inesperado' }, { status: 500, headers: corsHeaders })
  }
})
