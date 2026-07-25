# Camada de dados — trocar localStorage por Supabase

O ERP roda hoje sobre **localStorage** (demonstração). A troca para Supabase
foi preparada e **não exige mudar a lógica de negócio** (`pricing.ts`) nem as
telas — só a fonte de dados.

## Como está estruturado

| Arquivo | Papel |
|---|---|
| `supabaseClient.ts` | Cria o client a partir de `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Expõe `supabaseConfigurado`. |
| `repository.ts` | Interface `Repositorio` + duas implementações (`RepoLocal`, `RepoSupabase`) + mapeadores row↔domínio (snake_case ↔ camelCase). `criarRepositorio()` escolhe automaticamente. |
| `store.tsx` | Estado da aplicação. Hoje lê/escreve no localStorage; para migrar, passa a chamar o `Repositorio`. |
| `../../supabase/migrations/100_erp_brownie.sql` | Schema + RLS (multi-tenant, anti-IDOR). |

O badge no topo (`Local (demo)` / `Supabase`) mostra qual fonte está ativa.

## Passos para ativar o Supabase

1. Criar o projeto no Supabase e aplicar a migration:
   ```bash
   supabase db push   # ou rodar 100_erp_brownie.sql no SQL Editor
   ```
2. Criar o primeiro `tenant` e um `usuario` admin vinculado a um `auth.users`.
3. Definir as variáveis (`.env`):
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=chave-anon
   ```
4. No `store.tsx`, trocar o `load()` local por:
   ```ts
   const repo = criarRepositorio()
   const dados = await repo.carregarTudo(tenantId)
   ```
   e nas ações de CRUD chamar `repo.salvarPdv(tenantId, ...)` etc.
   (Assinaturas já espelham as ações atuais do store — a troca é 1:1.)

> Enquanto as variáveis não estiverem preenchidas, `supabaseConfigurado` é
> `false` e o app continua funcionando em modo local, sem quebrar.

## Segurança ao migrar

- O **preço continua sendo calculado no servidor** (RPC/Edge Function ou o
  próprio `pricing.ts` no backend) — nunca aceitar valor de item do frontend.
- As policies RLS já restringem: motoboy só vê a própria entrega, PDV só vê o
  próprio pedido/cobrança. Testar cada papel após aplicar a migration.
- Segredos de gateway (Inter/Cora) e da Evolution API ficam em variáveis do
  **backend/Edge Functions**, nunca no `VITE_*` (que vai para o bundle).
