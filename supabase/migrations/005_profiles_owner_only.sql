-- Privacidade do perfil: a tabela `profiles` passa a ser legível apenas pelo
-- próprio dono. Antes, a policy de SELECT liberava a linha inteira para
-- qualquer pessoa quando `appear_in_ranking` era verdadeiro — o que permitia
-- ler o perfil de outros usuários com o token anônimo.
--
-- O ranking público continua funcionando exclusivamente pela view
-- `leaderboard` (apenas display_name, avatar_url, points, level). Para que a
-- view enxergue todos os participantes sem depender de leitura direta da
-- tabela, ela passa a rodar com os privilégios do owner (security definer):
-- assim o cliente lê o ranking somente pela view, nunca pela tabela.

drop policy if exists "profile owner reads full profile" on public.profiles;
create policy "profile owner reads full profile" on public.profiles
  for select using (auth.uid() = id);

create or replace view public.leaderboard
with (security_invoker = false) as
select display_name, avatar_url, points, level
from public.profiles
where appear_in_ranking = true
order by points desc;

grant select on public.leaderboard to anon, authenticated;
