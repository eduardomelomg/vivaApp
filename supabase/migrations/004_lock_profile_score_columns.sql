-- O cliente pode editar apenas dados públicos de apresentação. Pontos e nível
-- são mantidos exclusivamente pelas Edge Functions usando a service role.
revoke update on table public.profiles from authenticated;
grant update (display_name, avatar_url, appear_in_ranking) on table public.profiles to authenticated;

-- As demais tabelas de pontuação permanecem somente leitura para o cliente.
revoke insert, update, delete on table public.point_events from authenticated;
revoke insert, update, delete on table public.workout_sessions from authenticated;
revoke insert, update, delete on table public.user_achievements from authenticated;
