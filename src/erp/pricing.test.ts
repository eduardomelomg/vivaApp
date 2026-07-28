import { describe, expect, it } from 'vitest'
import {
  baixarInsumos,
  calcularBonus,
  calcularPedido,
  custoUnitario,
  faltaParaBonus,
  margem,
  precoSugerido,
  precoUnitario,
  receita,
} from './pricing'
import type { DadosERP, FaixaBonificacao, PrecoPorPdv } from './types'

const precos: PrecoPorPdv[] = [
  { tabelaPrecoId: 't1', produtoId: 'p1', precoUnitarioBase: 5 },
  { tabelaPrecoId: 't1', produtoId: 'p2', precoUnitarioBase: 8 },
  { tabelaPrecoId: 't2', produtoId: 'p1', precoUnitarioBase: 4 },
]

const faixas: FaixaBonificacao[] = [
  { produtoId: 'p1', quantidadeMin: 40, unidadesBonus: 2 },
]

describe('precoUnitario', () => {
  it('busca preço pela tabela vinculada ao PDV', () => {
    expect(precoUnitario(precos, 't1', 'p1')).toBe(5)
    expect(precoUnitario(precos, 't2', 'p1')).toBe(4)
  })
  it('retorna 0 se não houver preço cadastrado', () => {
    expect(precoUnitario(precos, 't2', 'p2')).toBe(0)
  })
})

describe('calcularBonus', () => {
  it('não bonifica abaixo do mínimo', () => {
    expect(calcularBonus(faixas, 'p1', 39)).toBe(0)
  })
  it('bonifica ao atingir o mínimo', () => {
    expect(calcularBonus(faixas, 'p1', 40)).toBe(2)
    expect(calcularBonus(faixas, 'p1', 100)).toBe(2)
  })
  it('usa padrão 40/+2 quando não há faixa cadastrada', () => {
    expect(calcularBonus([], 'pX', 40)).toBe(2)
    expect(calcularBonus([], 'pX', 39)).toBe(0)
  })
})

describe('faltaParaBonus', () => {
  it('informa quantas unidades faltam', () => {
    expect(faltaParaBonus(faixas, 'p1', 35)).toEqual({ falta: 5, bonus: 2 })
  })
  it('retorna null quando já atingiu', () => {
    expect(faltaParaBonus(faixas, 'p1', 40)).toBeNull()
  })
})

describe('calcularPedido', () => {
  it('preserva o valor unitário mesmo com bonificação', () => {
    const { linhas, total } = calcularPedido(
      [{ produtoId: 'p1', quantidade: 40 }],
      't1',
      precos,
      faixas,
    )
    expect(linhas[0].precoUnitario).toBe(5)
    expect(linhas[0].bonus).toBe(2)
    // cobra 40 unidades (bônus é grátis), não 42
    expect(linhas[0].subtotal).toBe(200)
    expect(total).toBe(200)
  })
  it('soma múltiplos itens', () => {
    const { total } = calcularPedido(
      [
        { produtoId: 'p1', quantidade: 10 },
        { produtoId: 'p2', quantidade: 5 },
      ],
      't1',
      precos,
      faixas,
    )
    expect(total).toBe(10 * 5 + 5 * 8)
  })
})

describe('custos e margem', () => {
  const insumos = [
    { id: 'i1', nome: 'Chocolate', unidade: 'kg', precoUnitario: 40, estoqueAtual: 10 },
    { id: 'i2', nome: 'Embalagem', unidade: 'un', precoUnitario: 0.5, estoqueAtual: 500 },
  ]
  const fichas = [
    { produtoId: 'p1', insumoId: 'i1', quantidadeUsada: 0.05 }, // 50g
    { produtoId: 'p1', insumoId: 'i2', quantidadeUsada: 1 },
  ]
  it('soma custo dos insumos por unidade', () => {
    expect(custoUnitario('p1', fichas, insumos)).toBeCloseTo(40 * 0.05 + 0.5)
  })
  it('calcula margem', () => {
    expect(margem(5, 2.5)).toBeCloseTo(0.5)
    expect(margem(0, 2)).toBe(0)
  })
  it('sugere preço para a margem desejada', () => {
    expect(precoSugerido(2.5, 0.5)).toBeCloseTo(5)
  })
})

describe('receita e estoque', () => {
  const insumos = [
    { id: 'i1', nome: 'Choc', unidade: 'kg', precoUnitario: 40, estoqueAtual: 10 },
  ]
  const fichas = [{ produtoId: 'p1', insumoId: 'i1', quantidadeUsada: 0.05 }]
  it('ignora pedidos cancelados na receita', () => {
    const r = receita(
      [
        {
          id: '1', pdvId: 'x', status: 'entregue', enderecoEntrega: '', observacoes: '',
          criadoEm: '', valorTotal: 200,
          itens: [{ produtoId: 'p1', quantidade: 40, precoUnitario: 5, bonus: 2 }],
        },
        {
          id: '2', pdvId: 'x', status: 'cancelado', enderecoEntrega: '', observacoes: '',
          criadoEm: '', valorTotal: 999, itens: [],
        },
      ] as any,
      fichas,
      insumos,
    )
    expect(r.bruta).toBe(200)
    expect(r.pedidos).toBe(1)
    // custo inclui as 42 unidades (40 + 2 bônus)
    expect(r.custoTotal).toBeCloseTo(40 * 0.05 * 42)
    expect(r.liquida).toBeCloseTo(200 - 40 * 0.05 * 42)
  })
  it('baixa insumos incluindo bônus', () => {
    const dados = { insumos, fichasTecnicas: fichas } as DadosERP
    const out = baixarInsumos(dados, [{ produtoId: 'p1', quantidade: 40, bonus: 2 }])
    expect(out[0].estoqueAtual).toBeCloseTo(10 - 0.05 * 42)
  })
})
