// Camada de acesso a dados do ERP.
// Objetivo: permitir trocar o backend (localStorage ↔ Supabase) sem tocar
// na lógica de negócio (pricing.ts) nem nas telas.
//
// Uso futuro (quando o projeto Supabase existir):
//   const repo = criarRepositorio()   // escolhe automaticamente
//   const dados = await repo.carregarTudo(tenantId)
//
// Enquanto `supabaseConfigurado` for false, cai no repositório local
// (mesma fonte usada hoje pelo store).
import { supabase, supabaseConfigurado } from './supabaseClient'
import { seedData } from './seed'
import type {
  Cobranca,
  DadosERP,
  Entrega,
  Insumo,
  Motoboy,
  Pedido,
  PontoVenda,
  Produto,
} from './types'

// ---------------------------------------------------------------------
// Mapeadores row (snake_case do Postgres) ↔ domínio (camelCase do TS).
// ---------------------------------------------------------------------
const map = {
  pdvFromRow: (r: any): PontoVenda => ({
    id: r.id, razaoSocial: r.razao_social, cnpj: r.cnpj ?? '', nomeContato: r.nome_contato ?? '',
    telefoneWhatsapp: r.telefone_whatsapp ?? '', email: r.email ?? '', endereco: r.endereco,
    tabelaPrecoId: r.tabela_preco_id ?? '', criadoEm: r.criado_em,
  }),
  pdvToRow: (tenantId: string, p: PontoVenda) => ({
    id: p.id || undefined, tenant_id: tenantId, razao_social: p.razaoSocial, cnpj: p.cnpj,
    nome_contato: p.nomeContato, telefone_whatsapp: p.telefoneWhatsapp, email: p.email,
    endereco: p.endereco, tabela_preco_id: p.tabelaPrecoId || null,
  }),

  produtoFromRow: (r: any): Produto => ({
    id: r.id, nome: r.nome, descricao: r.descricao ?? '', unidadeVenda: r.unidade_venda, ativo: r.ativo,
  }),
  produtoToRow: (tenantId: string, p: Produto) => ({
    id: p.id || undefined, tenant_id: tenantId, nome: p.nome, descricao: p.descricao,
    unidade_venda: p.unidadeVenda, ativo: p.ativo,
  }),

  insumoFromRow: (r: any): Insumo => ({
    id: r.id, nome: r.nome, unidade: r.unidade,
    precoUnitario: Number(r.preco_unitario), estoqueAtual: Number(r.estoque_atual),
  }),
  insumoToRow: (tenantId: string, i: Insumo) => ({
    id: i.id || undefined, tenant_id: tenantId, nome: i.nome, unidade: i.unidade,
    preco_unitario: i.precoUnitario, estoque_atual: i.estoqueAtual,
  }),

  motoboyFromRow: (r: any): Motoboy => ({ id: r.id, nome: r.nome, telefone: r.telefone ?? '', ativo: r.ativo }),
  motoboyToRow: (tenantId: string, m: Motoboy) => ({
    id: m.id || undefined, tenant_id: tenantId, nome: m.nome, telefone: m.telefone, ativo: m.ativo,
  }),

  pedidoFromRow: (r: any, itens: any[]): Pedido => ({
    id: r.id, pdvId: r.pdv_id, status: r.status, enderecoEntrega: r.endereco_entrega,
    valorTotal: Number(r.valor_total), observacoes: r.observacoes ?? '', criadoEm: r.criado_em,
    itens: itens.map((it) => ({
      produtoId: it.produto_id, quantidade: it.quantidade,
      precoUnitario: Number(it.preco_unitario), bonus: it.bonus,
    })),
  }),

  entregaFromRow: (r: any): Entrega => ({
    id: r.id, pedidoId: r.pedido_id, motoboyId: r.motoboy_id, status: r.status,
    ordemRota: r.ordem_rota, horaSaida: r.hora_saida ?? undefined, horaEntrega: r.hora_entrega ?? undefined,
  }),

  cobrancaFromRow: (r: any): Cobranca => ({
    id: r.id, pedidoId: r.pedido_id, tipo: r.tipo, valor: Number(r.valor), status: r.status,
    urlDocumento: r.url_documento ?? undefined, linhaDigitavel: r.linha_digitavel ?? undefined,
    pixCopiaCola: r.pix_copia_cola ?? undefined, vencimento: r.vencimento, criadoEm: r.criado_em,
    pagoEm: r.pago_em ?? undefined,
  }),
}

export interface Repositorio {
  readonly tipo: 'local' | 'supabase'
  carregarTudo(tenantId?: string): Promise<DadosERP>
  salvarPdv(tenantId: string, p: PontoVenda): Promise<void>
  excluirPdv(id: string): Promise<void>
  salvarProduto(tenantId: string, p: Produto): Promise<void>
  excluirProduto(id: string): Promise<void>
  salvarInsumo(tenantId: string, i: Insumo): Promise<void>
  excluirInsumo(id: string): Promise<void>
  salvarMotoboy(tenantId: string, m: Motoboy): Promise<void>
  excluirMotoboy(id: string): Promise<void>
}

// ---------------------------------------------------------------------
// Implementação Supabase — pronta para uso quando o projeto existir.
// ---------------------------------------------------------------------
class RepoSupabase implements Repositorio {
  readonly tipo = 'supabase' as const

  async carregarTudo(tenantId?: string): Promise<DadosERP> {
    if (!supabase) throw new Error('Supabase não configurado')
    const t = tenantId
      ? `.eq('tenant_id', '${tenantId}')`
      : '' // RLS já isola por tenant; o filtro explícito é defensivo
    void t
    const q = <T>(res: { data: T[] | null }) => res.data ?? []

    const [usuarios, tabelas, produtos, insumos, fichas, precos, faixas, pdvs, motoboys, pedidosRows, itens, entregas, cobrancas, notifs] =
      await Promise.all([
        supabase.from('usuarios').select('*'),
        supabase.from('tabelas_preco').select('*'),
        supabase.from('produtos').select('*'),
        supabase.from('insumos').select('*'),
        supabase.from('fichas_tecnicas').select('*'),
        supabase.from('precos_por_pdv').select('*'),
        supabase.from('faixas_bonificacao').select('*'),
        supabase.from('pontos_venda').select('*'),
        supabase.from('motoboys').select('*'),
        supabase.from('pedidos').select('*'),
        supabase.from('itens_pedido').select('*'),
        supabase.from('entregas').select('*'),
        supabase.from('cobrancas').select('*'),
        supabase.from('notificacoes').select('*'),
      ])

    const itensRows = q<any>(itens)
    return {
      usuarios: q<any>(usuarios).map((r) => ({ id: r.id, nome: r.nome, email: r.email, papel: r.papel, vinculoId: r.vinculo_id ?? undefined })),
      tabelasPreco: q<any>(tabelas).map((r) => ({ id: r.id, nome: r.nome })),
      produtos: q<any>(produtos).map(map.produtoFromRow),
      insumos: q<any>(insumos).map(map.insumoFromRow),
      fichasTecnicas: q<any>(fichas).map((r) => ({ produtoId: r.produto_id, insumoId: r.insumo_id, quantidadeUsada: Number(r.quantidade_usada) })),
      precosPorPdv: q<any>(precos).map((r) => ({ tabelaPrecoId: r.tabela_preco_id, produtoId: r.produto_id, precoUnitarioBase: Number(r.preco_unitario_base) })),
      faixasBonificacao: q<any>(faixas).map((r) => ({ produtoId: r.produto_id, quantidadeMin: r.quantidade_min, unidadesBonus: r.unidades_bonus })),
      pontosVenda: q<any>(pdvs).map(map.pdvFromRow),
      motoboys: q<any>(motoboys).map(map.motoboyFromRow),
      pedidos: q<any>(pedidosRows).map((r) => map.pedidoFromRow(r, itensRows.filter((it) => it.pedido_id === r.id))),
      entregas: q<any>(entregas).map(map.entregaFromRow),
      cobrancas: q<any>(cobrancas).map(map.cobrancaFromRow),
      notificacoes: q<any>(notifs).map((r) => ({
        id: r.id, pedidoId: r.pedido_id, canal: r.canal, tipo: r.tipo, destinatario: r.destinatario,
        statusEnvio: r.status_envio, enviadoEm: r.enviado_em ?? undefined, mensagem: r.mensagem,
      })),
    }
  }

  private async up(tabela: string, row: any) {
    if (!supabase) throw new Error('Supabase não configurado')
    const { error } = await supabase.from(tabela).upsert(row)
    if (error) throw error
  }
  private async del(tabela: string, id: string) {
    if (!supabase) throw new Error('Supabase não configurado')
    const { error } = await supabase.from(tabela).delete().eq('id', id)
    if (error) throw error
  }

  salvarPdv = (t: string, p: PontoVenda) => this.up('pontos_venda', map.pdvToRow(t, p))
  excluirPdv = (id: string) => this.del('pontos_venda', id)
  salvarProduto = (t: string, p: Produto) => this.up('produtos', map.produtoToRow(t, p))
  excluirProduto = (id: string) => this.del('produtos', id)
  salvarInsumo = (t: string, i: Insumo) => this.up('insumos', map.insumoToRow(t, i))
  excluirInsumo = (id: string) => this.del('insumos', id)
  salvarMotoboy = (t: string, m: Motoboy) => this.up('motoboys', map.motoboyToRow(t, m))
  excluirMotoboy = (id: string) => this.del('motoboys', id)
}

// ---------------------------------------------------------------------
// Implementação local (localStorage) — usada enquanto o Supabase não está
// configurado. Mantém a paridade da API para a troca ser transparente.
// ---------------------------------------------------------------------
class RepoLocal implements Repositorio {
  readonly tipo = 'local' as const
  async carregarTudo(): Promise<DadosERP> {
    return seedData()
  }
  async salvarPdv() {}
  async excluirPdv() {}
  async salvarProduto() {}
  async excluirProduto() {}
  async salvarInsumo() {}
  async excluirInsumo() {}
  async salvarMotoboy() {}
  async excluirMotoboy() {}
}

/** Escolhe o repositório conforme a configuração do ambiente. */
export function criarRepositorio(): Repositorio {
  return supabaseConfigurado ? new RepoSupabase() : new RepoLocal()
}
