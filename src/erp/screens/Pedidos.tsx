import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { brl, Badge, Modal, statusLabels } from '../ui'
import { calcularPedido, faltaParaBonus, precoUnitario } from '../pricing'
import type { StatusPedido } from '../types'

const PROXIMO: Record<StatusPedido, StatusPedido | null> = {
  recebido: 'em_producao',
  em_producao: 'pronto',
  pronto: 'em_rota',
  em_rota: 'entregue',
  entregue: null,
  cancelado: null,
}

export function PedidosScreen() {
  const { dados, usuario, mudarStatusPedido } = useStore()
  const [novo, setNovo] = useState(false)

  const ehPdv = usuario?.papel === 'pdv'
  // RLS/IDOR: o portal do PDV só enxerga os próprios pedidos.
  const pedidos = ehPdv
    ? dados.pedidos.filter((p) => p.pdvId === usuario?.vinculoId)
    : dados.pedidos

  return (
    <div>
      <div className="section-title">
        <h1>Pedidos</h1>
        <button className="btn" onClick={() => setNovo(true)}>+ Novo pedido</button>
      </div>
      <div className="card">
        <table className="erp">
          <thead>
            <tr><th>Pedido</th><th>PDV</th><th>Itens</th><th>Total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {pedidos.map((p) => {
              const pdv = dados.pontosVenda.find((x) => x.id === p.pdvId)
              const prox = ehPdv ? null : PROXIMO[p.status]
              return (
                <tr key={p.id}>
                  <td className="muted">{p.id}</td>
                  <td>{pdv?.razaoSocial ?? p.pdvId}</td>
                  <td>{p.itens.map((it) => {
                    const prod = dados.produtos.find((x) => x.id === it.produtoId)
                    return `${it.quantidade}${it.bonus ? `+${it.bonus}` : ''}× ${prod?.nome ?? ''}`
                  }).join(', ')}</td>
                  <td>{brl(p.valorTotal)}</td>
                  <td><Badge status={p.status} /></td>
                  <td className="row">
                    {prox && (
                      <button className="btn sm" onClick={() => mudarStatusPedido(p.id, prox)}>
                        → {statusLabels[prox]}
                      </button>
                    )}
                    {p.status !== 'entregue' && p.status !== 'cancelado' && (
                      <button className="btn danger sm" onClick={() => confirm('Cancelar pedido?') && mudarStatusPedido(p.id, 'cancelado')}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {novo && <NovoPedido onFechar={() => setNovo(false)} />}
    </div>
  )
}

function NovoPedido({ onFechar }: { onFechar: () => void }) {
  const { dados, usuario, criarPedido } = useStore()
  const ehPdv = usuario?.papel === 'pdv'
  const [pdvId, setPdvId] = useState(
    ehPdv ? (usuario?.vinculoId ?? '') : (dados.pontosVenda[0]?.id ?? ''),
  )
  const [qtds, setQtds] = useState<Record<string, number>>({})
  const [obs, setObs] = useState('')

  const pdv = dados.pontosVenda.find((x) => x.id === pdvId)
  const itens = useMemo(
    () => Object.entries(qtds).map(([produtoId, quantidade]) => ({ produtoId, quantidade })).filter((i) => i.quantidade > 0),
    [qtds],
  )
  const calc = useMemo(
    () => pdv ? calcularPedido(itens, pdv.tabelaPrecoId, dados.precosPorPdv, dados.faixasBonificacao) : { linhas: [], total: 0 },
    [itens, pdv, dados],
  )

  return (
    <Modal titulo="Novo pedido" onFechar={onFechar}>
      <label className="field">Ponto de venda (PDV)
        <select value={pdvId} disabled={ehPdv} onChange={(e) => setPdvId(e.target.value)}>
          {dados.pontosVenda.map((p) => <option key={p.id} value={p.id}>{p.razaoSocial}</option>)}
        </select>
      </label>
      <p className="muted">Preço calculado automaticamente pela tabela do PDV
        ({dados.tabelasPreco.find((t) => t.id === pdv?.tabelaPrecoId)?.nome}).</p>

      <table className="erp">
        <thead><tr><th>Produto</th><th>Preço/un</th><th>Qtd</th><th>Subtotal</th></tr></thead>
        <tbody>
          {dados.produtos.filter((p) => p.ativo).map((p) => {
            const pu = pdv ? precoUnitario(dados.precosPorPdv, pdv.tabelaPrecoId, p.id) : 0
            const q = qtds[p.id] ?? 0
            const dica = faltaParaBonus(dados.faixasBonificacao, p.id, q)
            const bonus = calc.linhas.find((l) => l.produtoId === p.id)?.bonus ?? 0
            return (
              <tr key={p.id}>
                <td>{p.nome}
                  {q > 0 && dica && <div className="dica" style={{ marginTop: 4 }}>Peça mais {dica.falta} e ganhe {dica.bonus} grátis</div>}
                  {bonus > 0 && <div className="dica" style={{ marginTop: 4 }}>+{bonus} unidades de bônus 🎁</div>}
                </td>
                <td>{brl(pu)}</td>
                <td><input type="number" min={0} style={{ width: 70 }} value={q}
                  onChange={(e) => setQtds({ ...qtds, [p.id]: Math.max(0, Number(e.target.value)) })} /></td>
                <td>{brl(pu * q)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <label className="field mt">Observações (opcional)
        <textarea rows={2} value={obs} maxLength={500} onChange={(e) => setObs(e.target.value)} />
      </label>

      <div className="row mt">
        <strong style={{ fontSize: 18 }}>Total: {brl(calc.total)}</strong>
        <button className="btn right" disabled={itens.length === 0}
          onClick={() => { criarPedido({ pdvId, itens, observacoes: obs }); onFechar() }}>
          Confirmar pedido
        </button>
      </div>
    </Modal>
  )
}
