import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type {
  Cobranca,
  DadosERP,
  Entrega,
  Insumo,
  Motoboy,
  Notificacao,
  Pedido,
  PontoVenda,
  Produto,
  StatusPedido,
  Usuario,
} from './types'
import { calcularPedido, baixarInsumos } from './pricing'
import { seedData } from './seed'

const STORAGE_KEY = 'brownie-erp-v1'

function load(): DadosERP {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DadosERP
  } catch {
    /* ignora corrupção e recria o seed */
  }
  return seedData()
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

interface StoreCtx {
  dados: DadosERP
  usuario: Usuario | null
  login: (papel: Usuario['papel']) => void
  logout: () => void
  resetar: () => void
  // PDV
  salvarPdv: (p: PontoVenda) => void
  excluirPdv: (id: string) => void
  // Produtos
  salvarProduto: (p: Produto) => void
  excluirProduto: (id: string) => void
  // Insumos
  salvarInsumo: (i: Insumo) => void
  excluirInsumo: (id: string) => void
  // Motoboys
  salvarMotoboy: (m: Motoboy) => void
  excluirMotoboy: (id: string) => void
  // Pedidos
  criarPedido: (input: {
    pdvId: string
    itens: { produtoId: string; quantidade: number }[]
    observacoes: string
  }) => Pedido | null
  mudarStatusPedido: (id: string, status: StatusPedido) => void
  // Entregas
  atribuirEntrega: (pedidoId: string, motoboyId: string) => void
  mudarStatusEntrega: (id: string, status: Entrega['status']) => void
  // Financeiro
  gerarCobranca: (pedidoId: string, tipo: 'boleto' | 'pix') => void
  confirmarPagamento: (cobrancaId: string) => void
  mudarStatusCobranca: (cobrancaId: string, status: Cobranca['status']) => void
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [dados, setDados] = useState<DadosERP>(load)
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dados))
  }, [dados])

  const upd = useCallback((fn: (d: DadosERP) => DadosERP) => setDados((d) => fn(d)), [])

  const enfileirarNotificacao = useCallback(
    (n: Omit<Notificacao, 'id' | 'statusEnvio' | 'enviadoEm'>): Notificacao => {
      // Simula a fila da Evolution API: enfileira e "envia" (nunca trava o fluxo).
      return {
        ...n,
        id: uid('n'),
        statusEnvio: 'enviado',
        enviadoEm: new Date().toISOString(),
      }
    },
    [],
  )

  const value = useMemo<StoreCtx>(
    () => ({
      dados,
      usuario,
      login: (papel) => {
        const u = dados.usuarios.find((x) => x.papel === papel) ?? null
        setUsuario(u)
      },
      logout: () => setUsuario(null),
      resetar: () => setDados(seedData()),

      salvarPdv: (p) =>
        upd((d) => {
          const existe = d.pontosVenda.some((x) => x.id === p.id)
          return {
            ...d,
            pontosVenda: existe
              ? d.pontosVenda.map((x) => (x.id === p.id ? p : x))
              : [...d.pontosVenda, { ...p, id: p.id || uid('pdv') }],
          }
        }),
      excluirPdv: (id) => upd((d) => ({ ...d, pontosVenda: d.pontosVenda.filter((x) => x.id !== id) })),

      salvarProduto: (p) =>
        upd((d) => {
          const existe = d.produtos.some((x) => x.id === p.id)
          return {
            ...d,
            produtos: existe
              ? d.produtos.map((x) => (x.id === p.id ? p : x))
              : [...d.produtos, { ...p, id: p.id || uid('p') }],
          }
        }),
      excluirProduto: (id) => upd((d) => ({ ...d, produtos: d.produtos.filter((x) => x.id !== id) })),

      salvarInsumo: (i) =>
        upd((d) => {
          const existe = d.insumos.some((x) => x.id === i.id)
          return {
            ...d,
            insumos: existe
              ? d.insumos.map((x) => (x.id === i.id ? i : x))
              : [...d.insumos, { ...i, id: i.id || uid('i') }],
          }
        }),
      excluirInsumo: (id) => upd((d) => ({ ...d, insumos: d.insumos.filter((x) => x.id !== id) })),

      salvarMotoboy: (m) =>
        upd((d) => {
          const existe = d.motoboys.some((x) => x.id === m.id)
          return {
            ...d,
            motoboys: existe
              ? d.motoboys.map((x) => (x.id === m.id ? m : x))
              : [...d.motoboys, { ...m, id: m.id || uid('m') }],
          }
        }),
      excluirMotoboy: (id) => upd((d) => ({ ...d, motoboys: d.motoboys.filter((x) => x.id !== id) })),

      criarPedido: (input) => {
        const pdv = dados.pontosVenda.find((x) => x.id === input.pdvId)
        if (!pdv) return null
        const validos = input.itens.filter((i) => i.quantidade > 0)
        if (validos.length === 0) return null
        // Preço SEMPRE calculado no backend (aqui), nunca vindo do formulário.
        const { linhas, total } = calcularPedido(
          validos,
          pdv.tabelaPrecoId,
          dados.precosPorPdv,
          dados.faixasBonificacao,
        )
        const pedido: Pedido = {
          id: uid('ped'),
          pdvId: pdv.id,
          status: 'recebido',
          enderecoEntrega: pdv.endereco,
          observacoes: input.observacoes.slice(0, 500),
          criadoEm: new Date().toISOString(),
          valorTotal: total,
          itens: linhas.map((l) => ({
            produtoId: l.produtoId,
            quantidade: l.quantidade,
            precoUnitario: l.precoUnitario,
            bonus: l.bonus,
          })),
        }
        upd((d) => ({
          ...d,
          pedidos: [pedido, ...d.pedidos],
          // Baixa automática de insumo no estoque ao confirmar o pedido.
          insumos: baixarInsumos(d, pedido.itens),
          notificacoes: [
            enfileirarNotificacao({
              pedidoId: pedido.id,
              canal: 'evolution_whatsapp',
              tipo: 'resumo',
              destinatario: pdv.telefoneWhatsapp,
              mensagem: `Pedido ${pedido.id} recebido. Total R$ ${total.toFixed(2)}.`,
            }),
            ...d.notificacoes,
          ],
        }))
        return pedido
      },

      mudarStatusPedido: (id, status) =>
        upd((d) => {
          const pedido = d.pedidos.find((p) => p.id === id)
          const pdv = pedido && d.pontosVenda.find((x) => x.id === pedido.pdvId)
          const novasNotif =
            pedido && pdv && (status === 'em_rota' || status === 'entregue')
              ? [
                  enfileirarNotificacao({
                    pedidoId: id,
                    canal: 'evolution_whatsapp',
                    tipo: 'status',
                    destinatario: pdv.telefoneWhatsapp,
                    mensagem: `Pedido ${id}: status atualizado para "${status}".`,
                  }),
                  ...d.notificacoes,
                ]
              : d.notificacoes
          return {
            ...d,
            pedidos: d.pedidos.map((p) => (p.id === id ? { ...p, status } : p)),
            notificacoes: novasNotif,
          }
        }),

      atribuirEntrega: (pedidoId, motoboyId) =>
        upd((d) => {
          const existe = d.entregas.find((e) => e.pedidoId === pedidoId)
          const ordem = d.entregas.filter((e) => e.motoboyId === motoboyId).length + 1
          if (existe) {
            return {
              ...d,
              entregas: d.entregas.map((e) =>
                e.pedidoId === pedidoId ? { ...e, motoboyId } : e,
              ),
            }
          }
          const nova: Entrega = {
            id: uid('e'),
            pedidoId,
            motoboyId,
            status: 'pendente',
            ordemRota: ordem,
          }
          return { ...d, entregas: [...d.entregas, nova] }
        }),

      mudarStatusEntrega: (id, status) =>
        upd((d) => {
          const entrega = d.entregas.find((e) => e.id === id)
          let pedidos = d.pedidos
          let notificacoes = d.notificacoes
          if (entrega) {
            if (status === 'em_rota') {
              pedidos = pedidos.map((p) => (p.id === entrega.pedidoId ? { ...p, status: 'em_rota' } : p))
            }
            if (status === 'entregue') {
              pedidos = pedidos.map((p) => (p.id === entrega.pedidoId ? { ...p, status: 'entregue' } : p))
              const ped = d.pedidos.find((p) => p.id === entrega.pedidoId)
              const pdv = ped && d.pontosVenda.find((x) => x.id === ped.pdvId)
              if (pdv) {
                notificacoes = [
                  enfileirarNotificacao({
                    pedidoId: entrega.pedidoId,
                    canal: 'evolution_whatsapp',
                    tipo: 'status',
                    destinatario: pdv.telefoneWhatsapp,
                    mensagem: `Pedido ${entrega.pedidoId} entregue. Obrigado!`,
                  }),
                  ...notificacoes,
                ]
              }
            }
          }
          return {
            ...d,
            entregas: d.entregas.map((e) =>
              e.id === id
                ? {
                    ...e,
                    status,
                    horaSaida: status === 'em_rota' ? new Date().toISOString() : e.horaSaida,
                    horaEntrega: status === 'entregue' ? new Date().toISOString() : e.horaEntrega,
                  }
                : e,
            ),
            pedidos,
            notificacoes,
          }
        }),

      gerarCobranca: (pedidoId, tipo) =>
        upd((d) => {
          const pedido = d.pedidos.find((p) => p.id === pedidoId)
          if (!pedido) return d
          const pdv = d.pontosVenda.find((x) => x.id === pedido.pdvId)
          // Em produção: chamada ao gateway (Inter/Cora) parte do backend, nunca do frontend.
          const cobranca: Cobranca = {
            id: uid('cob'),
            pedidoId,
            tipo,
            valor: pedido.valorTotal,
            status: 'pendente',
            vencimento: new Date(Date.now() + 3 * 864e5).toISOString(),
            criadoEm: new Date().toISOString(),
            urlDocumento: tipo === 'boleto' ? `https://sandbox.exemplo/boleto/${pedidoId}.pdf` : undefined,
            linhaDigitavel:
              tipo === 'boleto'
                ? '34191.79001 01043.510047 91020.150008 1 ' +
                  String(Math.round(pedido.valorTotal * 100)).padStart(14, '0')
                : undefined,
            pixCopiaCola:
              tipo === 'pix'
                ? `00020126BR.GOV.BCB.PIX${pedidoId}5204000053039865802BR${Math.round(pedido.valorTotal * 100)}`
                : undefined,
          }
          return {
            ...d,
            cobrancas: [cobranca, ...d.cobrancas],
            notificacoes: pdv
              ? [
                  enfileirarNotificacao({
                    pedidoId,
                    canal: 'evolution_whatsapp',
                    tipo: tipo === 'boleto' ? 'boleto' : 'pix',
                    destinatario: pdv.telefoneWhatsapp,
                    mensagem:
                      tipo === 'boleto'
                        ? `Boleto do pedido ${pedidoId}: ${cobranca.urlDocumento}`
                        : `PIX copia-e-cola do pedido ${pedidoId}: ${cobranca.pixCopiaCola}`,
                  }),
                  ...d.notificacoes,
                ]
              : d.notificacoes,
          }
        }),

      // Simula o webhook assinado do gateway confirmando o pagamento.
      confirmarPagamento: (cobrancaId) =>
        upd((d) => ({
          ...d,
          cobrancas: d.cobrancas.map((c) =>
            c.id === cobrancaId
              ? { ...c, status: 'pago', pagoEm: new Date().toISOString() }
              : c,
          ),
        })),

      mudarStatusCobranca: (cobrancaId, status) =>
        upd((d) => ({
          ...d,
          cobrancas: d.cobrancas.map((c) => (c.id === cobrancaId ? { ...c, status } : c)),
        })),
    }),
    [dados, usuario, upd, enfileirarNotificacao],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore fora do StoreProvider')
  return ctx
}
