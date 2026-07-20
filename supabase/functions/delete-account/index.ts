import { createClient } from 'jsr:@supabase/supabase-js@2'

const keyFromSet = (name: string) => {
  try { return JSON.parse(Deno.env.get(name) || '{}').default as string | undefined } catch { return undefined }
}
const publishableKey = Deno.env.get('SUPABASE_ANON_KEY') || keyFromSet('SUPABASE_PUBLISHABLE_KEYS')!
const secretKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || keyFromSet('SUPABASE_SECRET_KEYS')!
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type', 'Content-Type': 'application/json' }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const authorization = request.headers.get('Authorization') || ''
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, publishableKey, { global: { headers: { Authorization: authorization } } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return Response.json({ error: 'Não autorizado' }, { status: 401, headers: cors })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey)
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return Response.json({ error: error.message }, { status: 500, headers: cors })
  return Response.json({ deleted: true }, { headers: cors })
})
