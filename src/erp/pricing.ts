// Lógica de precificação e custos — pura e testável.
// Regra fixa: preço do pedido é SEMPRE calculado aqui (nunca digitado no frontend).
import type {
  DadosERP,
  FaixaBonificacao,
  FichaTecnicaItem,
  Insumo,
  Pedido,
  PrecoPorPdv,
} from './types'

export const BONIF_QTD_MIN_PADRAO = 40
export const BONIF_BONUS_PADRAO = 2

/** Preço unitário base do produto para o PDV, via tabela de preço vinculada. */
export function precoUnitario(
  precos: PrecoPorPdv[],
  tabelaPrecoId: string,
  produtoId: string,
): number {
  const p = precos.find(
    (x) => x.tabelaPrecoId === tabelaPrecoId && x.produtoId === produtoId,
  )
  return p ? p.precoUnitarioBase : 0
}

/**
 * Bonificação por volume (NÃO é desconto): a partir de quantidadeMin,
 * concede unidadesBonus grátis. Preserva o valor unitário.
 */
export function calcularBonus(
  faixas: FaixaBonificacao[],
  produtoId: string,
  quantidade: number,
): number {
  const faixa = faixas.find((f) => f.produtoId === produtoId) ?? {
    produtoId,
    quantidadeMin: BONIF_QTD_MIN_PADRAO,
    unidadesBonus: BONIF_BONUS_PADRAO,
  }
  return quantidade >= faixa.quantidadeMin ? faixa.unidadesBonus : 0
}

/** Quanto falta para atingir a próxima faixa de bonificação (para exibir dica). */
export function faltaParaBonus(
  faixas: FaixaBonificacao[],
  produtoId: string,
  quantidade: number,
): { falta: number; bonus: number } | null {
  const faixa = faixas.find((f) => f.produtoId === produtoId) ?? {
    produtoId,
    quantidadeMin: BONIF_QTD_MIN_PADRAO,
    unidadesBonus: BONIF_BONUS_PADRAO,
  }
  if (quantidade >= faixa.quantidadeMin) return null
  return { falta: faixa.quantidadeMin - quantidade, bonus: faixa.unidadesBonus }
}

export interface LinhaCalculada {
  produtoId: string
  quantidade: number
  precoUnitario: number
  bonus: number
  subtotal: number
}

/** Calcula todas as linhas + total de um pedido a partir dos dados do PDV. */
export function calcularPedido(
  itens: { produtoId: string; quantidade: number }[],
  tabelaPrecoId: string,
  precos: PrecoPorPdv[],
  faixas: FaixaBonificacao[],
): { linhas: LinhaCalculada[]; total: number } {
  const linhas = itens.map((item) => {
    const pu = precoUnitario(precos, tabelaPrecoId, item.produtoId)
    const bonus = calcularBonus(faixas, item.produtoId, item.quantidade)
    const subtotal = pu * item.quantidade
    return {
      produtoId: item.produtoId,
      quantidade: item.quantidade,
      precoUnitario: pu,
      bonus,
      subtotal,
    }
  })
  const total = linhas.reduce((acc, l) => acc + l.subtotal, 0)
  return { linhas, total }
}

/** Custo de produção de 1 unidade do produto (ficha técnica × preço de insumo). */
export function custoUnitario(
  produtoId: string,
  fichas: FichaTecnicaItem[],
  insumos: Insumo[],
): number {
  return fichas
    .filter((f) => f.produtoId === produtoId)
    .reduce((acc, f) => {
      const insumo = insumos.find((i) => i.id === f.insumoId)
      return acc + (insumo ? insumo.precoUnitario * f.quantidadeUsada : 0)
    }, 0)
}

/** Margem sobre o preço de venda: (preço - custo) / preço. */
export function margem(preco: number, custo: number): number {
  if (preco <= 0) return 0
  return (preco - custo) / preco
}

/** Preço sugerido para atingir a margem desejada (0..1). */
export function precoSugerido(custo: number, margemDesejada: number): number {
  const m = Math.min(Math.max(margemDesejada, 0), 0.95)
  return custo / (1 - m)
}

export interface ReceitaPeriodo {
  bruta: number
  custoTotal: number
  liquida: number
  pedidos: number
}

/** Receita de um conjunto de pedidos (ignora cancelados). */
export function receita(
  pedidos: Pedido[],
  fichas: FichaTecnicaItem[],
  insumos: Insumo[],
): ReceitaPeriodo {
  const validos = pedidos.filter((p) => p.status !== 'cancelado')
  const bruta = validos.reduce((a, p) => a + p.valorTotal, 0)
  const custoTotal = validos.reduce((a, p) => {
    return (
      a +
      p.itens.reduce((ac, it) => {
        const cu = custoUnitario(it.produtoId, fichas, insumos)
        // custo inclui unidades bonificadas (saem do estoque também)
        return ac + cu * (it.quantidade + it.bonus)
      }, 0)
    )
  }, 0)
  return {
    bruta,
    custoTotal,
    liquida: bruta - custoTotal,
    pedidos: validos.length,
  }
}

/** Baixa de insumos no estoque ao confirmar um pedido (retorna cópia mutada). */
export function baixarInsumos(
  dados: DadosERP,
  itens: { produtoId: string; quantidade: number; bonus: number }[],
): Insumo[] {
  const insumos = dados.insumos.map((i) => ({ ...i }))
  for (const item of itens) {
    const total = item.quantidade + item.bonus
    for (const f of dados.fichasTecnicas.filter((f) => f.produtoId === item.produtoId)) {
      const insumo = insumos.find((i) => i.id === f.insumoId)
      if (insumo) insumo.estoqueAtual -= f.quantidadeUsada * total
    }
  }
  return insumos
}
