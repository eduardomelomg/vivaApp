# Viva — Saúde & rotina

PWA em React para acompanhar hidratação, alimentação, indicadores pessoais e treinos.

## Rodar localmente

```bash
npm install
npm run dev
```

Para testar a versão de produção:

```bash
npm run build
npm run preview
```

## Desenvolvimento

```bash
npm test           # roda a suíte Vitest (lógica de métricas, pontos, planta e treino)
npm run test:watch # modo interativo
npm run format     # formata src/ com Prettier
```

As dependências têm versões fixadas para builds reprodutíveis. O ESLint está
temporariamente adiado: o `typescript-eslint` ainda não suporta o TypeScript 7
([issue #10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)).
Assim que houver suporte, basta adicionar o `eslint.config.js` sem type-checking.

## O que já funciona

- Contas multiusuário com dados privados separados por usuário.
- IMC, meta de água, metabolismo basal, gasto diário e meta calórica.
- Registro diário de água com atalhos e histórico.
- Diário alimentar com ajuste de porção (quantidade) por item.
- Lembretes Web Push em segundo plano, inclusive com a PWA fechada.
- Diário alimentar com base inicial de alimentos e cálculo de macros.
- Planos de treino para perda de peso, manutenção e ganho de massa.
- Geração automática do treino por meta, experiência, dias disponíveis, duração e equipamento.
- Escolha entre casa, academia de rede e academia de bairro: em casa o plano combina HIIT e isometrias; academias básicas recebem alternativas com pesos livres.
- HIIT doméstico em três níveis: 20, 25 e 30 minutos, com intensidade-alvo, intervalos, aquecimento e desaceleração definidos pelo app.
- Progressão de carga, descanso e instruções por exercício; o usuário não monta o próprio plano.
- Pontuação com teto diário de 100 pontos, níveis, troféus, selos e bônus de consistência.
- Planta-companheira que cresce com os pontos, perde vitalidade após 3/7/14/30 dias sem hábitos e se recupera em 7 dias quando o usuário volta.
- Histórico local de peso.
- Cadastro, backup privado e ranking global integrados ao Supabase, sem publicar dados físicos.
- Controle de participação no ranking (entrar ou sair do placar público).
- Web Push preparado com janela de horário, intervalo, fuso e silêncio ao atingir a meta.
- Dados persistidos no navegador e interface responsiva.
- Tema claro, escuro e automático conforme a preferência do sistema.
- Instalação como PWA no Android, desktop e iOS, com orientação específica para o Safari.
- Manifesto, ícones próprios, atalhos e service worker com precache da interface para uso offline.

## Observação

Os resultados são estimativas gerais. O app não substitui avaliação de nutricionista, médico ou profissional de educação física. Em celulares, notificações em segundo plano dependem das limitações do navegador e do sistema operacional.

## Recursos online

O app funciona localmente sem backend. Para ativar conta, ranking global e Web Push, siga [supabase/README.md](supabase/README.md) e configure as variáveis de `.env.example`.

## Deploy na Vercel

O repositório inclui `vercel.json` com build do Vite, fallback da SPA, headers de segurança e regras de cache específicas para a PWA.

1. Importe o repositório na Vercel.
2. Em **Settings → Environment Variables**, configure para Production e Preview:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
3. Publique. O comando usado será `npm run build` e a saída será `dist`.
4. No Supabase, abra **Authentication → URL Configuration** e defina:
   - **Site URL:** a URL definitiva da Vercel ou o domínio próprio.
   - **Redirect URLs:** a URL definitiva e as URLs de Preview que serão usadas para validar recuperação de senha e confirmação de e-mail.
5. Confirme em HTTPS: instalação da PWA, login, recuperação de senha, upload de foto e uma notificação de teste.

O build interrompe automaticamente se alguma variável pública obrigatória estiver ausente, incompleta ou ainda contiver valores de exemplo. As chaves privadas VAPID, `CRON_SECRET` e a service role continuam somente nos Secrets das Edge Functions do Supabase; nunca devem ser cadastradas com prefixo `VITE_`.
