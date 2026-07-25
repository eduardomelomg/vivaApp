// Modelo de domínio do ERP Brownie do Dudu (B2B).
// "cliente" = ponto de venda (PDV).

export type Papel = 'admin' | 'motoboy' | 'pdv'

export interface Usuario {
  id: string
  nome: string
  email: string
  papel: Papel
  // Para papel 'motoboy' aponta o motoboy vinculado; para 'pdv' aponta o PDV.
  vinculoId?: string
}

export interface TabelaPreco {
  id: string
  nome: string
}

export interface Produto {
  id: string
  nome: string
  descricao: string
  unidadeVenda: string // ex.: "caixa c/12"
  ativo: boolean
}

export interface Insumo {
  id: string
  nome: string
  unidade: string // ex.: "kg", "un"
  precoUnitario: number // custo de compra por unidade
  estoqueAtual: number
}

// Ficha técnica: quanto de cada insumo entra em 1 unidade de produto.
export interface FichaTecnicaItem {
  produtoId: string
  insumoId: string
  quantidadeUsada: number
}

export interface PrecoPorPdv {
  tabelaPrecoId: string
  produtoId: string
  precoUnitarioBase: number
}

export interface FaixaBonificacao {
  produtoId: string
  quantidadeMin: number // padrão 40
  unidadesBonus: number // padrão 2
}

export interface PontoVenda {
  id: string
  razaoSocial: string
  cnpj: string
  nomeContato: string
  telefoneWhatsapp: string
  email: string
  endereco: string
  tabelaPrecoId: string
  criadoEm: string
}

export interface Motoboy {
  id: string
  nome: string
  telefone: string
  ativo: boolean
}

export type StatusPedido =
  | 'recebido'
  | 'em_producao'
  | 'pronto'
  | 'em_rota'
  | 'entregue'
  | 'cancelado'

export interface ItemPedido {
  produtoId: string
  quantidade: number
  precoUnitario: number // calculado no backend
  bonus: number // unidades de bonificação concedidas
}

export interface Pedido {
  id: string
  pdvId: string
  status: StatusPedido
  enderecoEntrega: string
  itens: ItemPedido[]
  valorTotal: number
  observacoes: string
  criadoEm: string
}

export type StatusEntrega = 'pendente' | 'em_rota' | 'cheguei' | 'entregue'

export interface Entrega {
  id: string
  pedidoId: string
  motoboyId: string
  status: StatusEntrega
  ordemRota: number
  horaSaida?: string
  horaEntrega?: string
}

export type TipoCobranca = 'boleto' | 'pix' | 'recibo'
export type StatusCobranca = 'pendente' | 'pago' | 'vencido' | 'cancelado'

export interface Cobranca {
  id: string
  pedidoId: string
  tipo: TipoCobranca
  valor: number
  status: StatusCobranca
  urlDocumento?: string // link do boleto/recibo (gerado pelo gateway)
  linhaDigitavel?: string // boleto
  pixCopiaCola?: string // PIX
  vencimento: string
  criadoEm: string
  pagoEm?: string
}

export interface Notificacao {
  id: string
  pedidoId: string
  canal: 'evolution_whatsapp'
  tipo: 'resumo' | 'boleto' | 'pix' | 'status'
  destinatario: string
  statusEnvio: 'pendente' | 'enviado' | 'falha'
  enviadoEm?: string
  mensagem: string
}

export interface DadosERP {
  usuarios: Usuario[]
  tabelasPreco: TabelaPreco[]
  produtos: Produto[]
  insumos: Insumo[]
  fichasTecnicas: FichaTecnicaItem[]
  precosPorPdv: PrecoPorPdv[]
  faixasBonificacao: FaixaBonificacao[]
  pontosVenda: PontoVenda[]
  motoboys: Motoboy[]
  pedidos: Pedido[]
  entregas: Entrega[]
  cobrancas: Cobranca[]
  notificacoes: Notificacao[]
}
