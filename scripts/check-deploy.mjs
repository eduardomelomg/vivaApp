import { existsSync, readFileSync } from 'node:fs'

const values = {}

for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (!existsSync(file)) continue
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

Object.assign(values, process.env)

const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_VAPID_PUBLIC_KEY']
const missing = required.filter(name => !values[name]?.trim())
if (missing.length) {
  console.error(`Deploy bloqueado: configure ${missing.join(', ')} na Vercel.`)
  process.exit(1)
}

const placeholders = /seu-projeto|sua-chave|example|placeholder/i
const invalid = required.filter(name => placeholders.test(values[name]))
if (invalid.length) {
  console.error(`Deploy bloqueado: substitua os valores de exemplo em ${invalid.join(', ')}.`)
  process.exit(1)
}

try {
  const backendUrl = new URL(values.VITE_SUPABASE_URL)
  if (backendUrl.protocol !== 'https:' || !backendUrl.hostname.endsWith('.supabase.co')) throw new Error()
} catch {
  console.error('Deploy bloqueado: VITE_SUPABASE_URL precisa ser uma URL HTTPS válida do Supabase.')
  process.exit(1)
}

if (values.VITE_SUPABASE_ANON_KEY.length < 20 || values.VITE_VAPID_PUBLIC_KEY.length < 40) {
  console.error('Deploy bloqueado: uma chave pública parece incompleta.')
  process.exit(1)
}

console.log('Deploy: variáveis públicas validadas sem exibir seus valores.')
