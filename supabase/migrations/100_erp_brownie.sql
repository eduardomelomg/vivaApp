-- =====================================================================
-- ERP Brownie do Dudu — schema inicial (multi-tenant, RLS desde o dia 1)
-- Modelo B2B: "cliente" = ponto de venda (PDV).
-- Corresponde às seções 5 e 6 do documento de execução.
-- =====================================================================

-- Extensão para uuid_generate_v4 (Supabase já habilita pgcrypto/uuid-ossp).
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tenants e usuários
-- ---------------------------------------------------------------------
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

-- Papéis do RBAC. admin/atendente/financeiro hoje são o mesmo login,
-- mas os papéis existem no schema (não hardcoded por usuário).
create type papel_usuario as enum ('admin', 'atendente', 'financeiro', 'motoboy', 'pdv');

create table if not exists usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  email text not null,
  papel papel_usuario not null default 'admin',
  -- vínculo com motoboy ou PDV, quando aplicável
  vinculo_id uuid,
  criado_em timestamptz not null default now()
);

-- Função utilitária: tenant do usuário logado (usada nas policies).
create or replace function current_tenant_id()
returns uuid
language sql stable security definer
as $$
  select tenant_id from usuarios where id = auth.uid()
$$;

create or replace function current_papel()
returns papel_usuario
language sql stable security definer
as $$
  select papel from usuarios where id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Cadastros base
-- ---------------------------------------------------------------------
create table if not exists tabelas_preco (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null
);

create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  descricao text default '',
  unidade_venda text not null default 'caixa c/12',
  ativo boolean not null default true
);

create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  unidade text not null,
  preco_unitario numeric(12,2) not null default 0,
  estoque_atual numeric(12,3) not null default 0
);

create table if not exists fichas_tecnicas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete cascade,
  insumo_id uuid not null references insumos (id) on delete cascade,
  quantidade_usada numeric(12,4) not null
);

create table if not exists precos_por_pdv (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  tabela_preco_id uuid not null references tabelas_preco (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete cascade,
  preco_unitario_base numeric(12,2) not null,
  unique (tabela_preco_id, produto_id)
);

create table if not exists faixas_bonificacao (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete cascade,
  quantidade_min integer not null default 40,
  unidades_bonus integer not null default 2
);

create table if not exists motoboys (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  telefone text,
  ativo boolean not null default true
);

create table if not exists pontos_venda (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  razao_social text not null,
  cnpj text,
  nome_contato text,
  telefone_whatsapp text,
  email text,
  endereco text not null,
  tabela_preco_id uuid references tabelas_preco (id),
  criado_em timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
create type status_pedido as enum
  ('recebido', 'em_producao', 'pronto', 'em_rota', 'entregue', 'cancelado');

create table if not exists pedidos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  pdv_id uuid not null references pontos_venda (id),
  status status_pedido not null default 'recebido',
  endereco_entrega text not null,
  -- valor SEMPRE calculado no backend, nunca vindo do frontend
  valor_total numeric(12,2) not null default 0,
  observacoes text default '',
  criado_em timestamptz not null default now()
);

create table if not exists itens_pedido (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  pedido_id uuid not null references pedidos (id) on delete cascade,
  produto_id uuid not null references produtos (id),
  quantidade integer not null,
  preco_unitario numeric(12,2) not null,
  bonus integer not null default 0
);

-- ---------------------------------------------------------------------
-- Entregas
-- ---------------------------------------------------------------------
create type status_entrega as enum ('pendente', 'em_rota', 'cheguei', 'entregue');

create table if not exists entregas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  pedido_id uuid not null references pedidos (id) on delete cascade,
  motoboy_id uuid references motoboys (id),
  status status_entrega not null default 'pendente',
  ordem_rota integer not null default 1,
  hora_saida timestamptz,
  hora_entrega timestamptz
);

-- ---------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------
create type tipo_cobranca as enum ('boleto', 'pix', 'recibo');
create type status_cobranca as enum ('pendente', 'pago', 'vencido', 'cancelado');

create table if not exists cobrancas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  pedido_id uuid not null references pedidos (id) on delete cascade,
  tipo tipo_cobranca not null,
  valor numeric(12,2) not null,
  status status_cobranca not null default 'pendente',
  url_documento text,
  linha_digitavel text,
  pix_copia_cola text,
  vencimento timestamptz,
  criado_em timestamptz not null default now(),
  pago_em timestamptz
);

-- ---------------------------------------------------------------------
-- Notificações (Evolution API)
-- ---------------------------------------------------------------------
create type status_envio as enum ('pendente', 'enviado', 'falha');

create table if not exists notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  pedido_id uuid references pedidos (id) on delete set null,
  canal text not null default 'evolution_whatsapp',
  tipo text not null,
  destinatario text not null,
  mensagem text not null,
  status_envio status_envio not null default 'pendente',
  enviado_em timestamptz,
  criado_em timestamptz not null default now()
);

-- =====================================================================
-- Row Level Security — habilitado em todas as tabelas com dado sensível.
-- Regra base: isolar por tenant. Regras extras: motoboy só vê a própria
-- entrega; PDV só vê os próprios pedidos/cobranças (evita IDOR entre PDVs).
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'tenants','usuarios','tabelas_preco','produtos','insumos','fichas_tecnicas',
    'precos_por_pdv','faixas_bonificacao','motoboys','pontos_venda','pedidos',
    'itens_pedido','entregas','cobrancas','notificacoes'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- Policy genérica por tenant para tabelas administrativas.
-- (Aplicada individualmente para permitir refinamento por tabela.)
create policy tenant_isolation_produtos on produtos
  using (tenant_id = current_tenant_id());
create policy tenant_isolation_insumos on insumos
  using (tenant_id = current_tenant_id());
create policy tenant_isolation_fichas on fichas_tecnicas
  using (tenant_id = current_tenant_id());
create policy tenant_isolation_tabelas on tabelas_preco
  using (tenant_id = current_tenant_id());
create policy tenant_isolation_precos on precos_por_pdv
  using (tenant_id = current_tenant_id());
create policy tenant_isolation_faixas on faixas_bonificacao
  using (tenant_id = current_tenant_id());
create policy tenant_isolation_motoboys on motoboys
  using (tenant_id = current_tenant_id());
create policy tenant_isolation_pdv on pontos_venda
  using (tenant_id = current_tenant_id());

-- usuarios: cada um vê o próprio registro + admin vê os do tenant.
create policy usuarios_self_or_admin on usuarios
  using (id = auth.uid() or (tenant_id = current_tenant_id() and current_papel() = 'admin'));

-- pedidos: admin/atendente/financeiro veem tudo do tenant;
-- PDV vê apenas os próprios (vinculo_id = pdv_id).
create policy pedidos_acesso on pedidos
  using (
    tenant_id = current_tenant_id()
    and (
      current_papel() in ('admin','atendente','financeiro')
      or (current_papel() = 'pdv' and pdv_id = (select vinculo_id from usuarios where id = auth.uid()))
      or (current_papel() = 'motoboy' and exists (
            select 1 from entregas e
            where e.pedido_id = pedidos.id
              and e.motoboy_id = (select vinculo_id from usuarios where id = auth.uid())))
    )
  );

create policy itens_pedido_acesso on itens_pedido
  using (
    tenant_id = current_tenant_id()
    and exists (select 1 from pedidos p where p.id = itens_pedido.pedido_id)
  );

-- entregas: motoboy só vê as próprias (evita IDOR trocando ID na URL).
create policy entregas_acesso on entregas
  using (
    tenant_id = current_tenant_id()
    and (
      current_papel() in ('admin','atendente','financeiro')
      or (current_papel() = 'motoboy'
          and motoboy_id = (select vinculo_id from usuarios where id = auth.uid()))
    )
  );

-- cobranças: admin/financeiro e o PDV dono do pedido.
create policy cobrancas_acesso on cobrancas
  using (
    tenant_id = current_tenant_id()
    and (
      current_papel() in ('admin','financeiro','atendente')
      or (current_papel() = 'pdv' and exists (
            select 1 from pedidos p
            where p.id = cobrancas.pedido_id
              and p.pdv_id = (select vinculo_id from usuarios where id = auth.uid())))
    )
  );

create policy notificacoes_acesso on notificacoes
  using (tenant_id = current_tenant_id()
         and current_papel() in ('admin','atendente','financeiro'));

create policy tenants_self on tenants
  using (id = current_tenant_id());

-- Índices úteis para as queries do dia a dia.
create index if not exists idx_pedidos_tenant_status on pedidos (tenant_id, status);
create index if not exists idx_entregas_motoboy on entregas (motoboy_id, status);
create index if not exists idx_cobrancas_pedido on cobrancas (pedido_id, status);
create index if not exists idx_itens_pedido on itens_pedido (pedido_id);
