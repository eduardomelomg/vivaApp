# Backend do Viva

1. Crie um projeto no Supabase.
2. Execute, em ordem, os arquivos `migrations/001_viva_backend.sql`, `migrations/002_avatar_storage.sql`, `migrations/003_private_user_backups.sql` e `migrations/004_lock_profile_score_columns.sql` no SQL Editor.
3. Gere um par de chaves VAPID.
4. Configure os segredos das Edge Functions: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` e `CRON_SECRET`.
5. Publique `register-push`, `send-water-reminders` e `delete-account`.
6. Agende `send-water-reminders` para executar a cada minuto, enviando `CRON_SECRET` no cabeçalho Authorization.
7. Copie `.env.example` para `.env` e preencha as três variáveis públicas.

Peso, altura, IMC, água, calorias e treinos continuam sendo calculados diretamente no app e ficam disponíveis offline. Quando a pessoa está conectada, esses registros também entram em um backup privado protegido por RLS: somente o próprio usuário autenticado pode ler ou alterar seus dados. No ranking público aparecem apenas nome exibido, avatar, nível e pontuação — e somente quando a participação estiver ativada.
