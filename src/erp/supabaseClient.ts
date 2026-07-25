import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Cliente Supabase configurável por variáveis de ambiente (Vite).
// Enquanto não houver projeto configurado, o app continua no localStorage.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Só considera configurado quando as duas variáveis existem e não são o placeholder.
export const supabaseConfigurado = Boolean(
  url && anonKey && !url.includes('seu-projeto') && !anonKey.includes('sua-chave'),
)

export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, anonKey!, { auth: { persistSession: true } })
  : null
