import { useState } from 'react'
import { useStore } from '../store'
import { Badge, brl, Modal } from '../ui'
import type { Cobranca } from '../types'

export function FinanceiroScreen() {
  const { dados, gerarCobranca, confirmarPagamento, mudarStatusCobranca } = useStore()
  const [recibo, setRecibo] = useState<Cobranca | null>(null)

  // Pedidos faturáveis: sem cobrança ativa e não cancelados.
  const semCobranca = dados.pedidos.filter(
    (p) => p.status !== 'cancelado' && !dados.cobrancas.some((c) => c.pedidoId === p.id && c.status !== 'cancelado'),
  )

  const totalPago = dados.cobrancas.filter((c) => c.status === 'pago').reduce((a, c) => a + c.valor, 0)
  const totalPendente = dados.cobrancas.filter((c) => c.status === 'pendente').reduce((a, c) => a + c.valor, 0)

  return (
    <div>
      <div className="section-title"><h1>Financeiro</h1></div>

      <div className="grid grid-cards">
        <div className="card kpi"><span className="valor">{brl(totalPago)}</span><span className="rotulo">Recebido</span></div>
        <div className="card kpi"><span className="valor">{brl(totalPendente)}</span><span className="rotulo">A receber</span></div>
      </div>

      {semCobranca.length > 0 && (
        <div className="card mt">
          <h3 className="section-title">Pedidos sem cobrança</h3>
          <table className="erp">
            <thead><tr><th>Pedido</th><th>PDV</th><th>Valor</th><th>Gerar cobrança</th></tr></thead>
            <tbody>
              {semCobranca.map((p) => {
                const pdv = dados.pontosVenda.find((x) => x.id === p.pdvId)
                return (
                  <tr key={p.id}>
                    <td className="muted">{p.id}</td>
                    <td>{pdv?.razaoSocial}</td>
                    <td>{brl(p.valorTotal)}</td>
                    <td className="row">
                      <button className="btn sm" onClick={() => gerarCobranca(p.id, 'boleto')}>Gerar boleto</button>
                      <button className="btn sec sm" onClick={() => gerarCobranca(p.id, 'pix')}>Gerar PIX</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="card mt">
        <h3 className="section-title">Cobranças</h3>
        <table className="erp">
          <thead><tr><th>Pedido</th><th>Tipo</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
          <tbody>
            {dados.cobrancas.map((c) => (
              <tr key={c.id}>
                <td className="muted">{c.pedidoId}</td>
                <td>{c.tipo.toUpperCase()}</td>
                <td>{brl(c.valor)}</td>
                <td>{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
                <td><Badge status={c.status === 'pago' ? 'entregue' : c.status === 'vencido' ? 'cancelado' : c.status === 'cancelado' ? 'cancelado' : 'recebido'} />
                  <span className="muted"> {c.status}</span></td>
                <td className="row">
                  {c.urlDocumento && <a className="btn ghost sm" href={c.urlDocumento} target="_blank" rel="noreferrer">Ver boleto</a>}
                  {c.pixCopiaCola && <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(c.pixCopiaCola!)}>Copiar PIX</button>}
                  {c.status === 'pendente' && (
                    <>
                      <button className="btn sm" onClick={() => confirmarPagamento(c.id)} title="Simula webhook do gateway">Confirmar pagto</button>
                      <button className="btn ghost sm" onClick={() => mudarStatusCobranca(c.id, 'vencido')}>Marcar vencido</button>
                    </>
                  )}
                  {c.status === 'pago' && <button className="btn sec sm" onClick={() => setRecibo(c)}>Recibo</button>}
                </td>
              </tr>
            ))}
            {dados.cobrancas.length === 0 && <tr><td colSpan={6} className="muted">Nenhuma cobrança gerada.</td></tr>}
          </tbody>
        </table>
        <p className="muted mt">
          O botão "Confirmar pagto" simula o <strong>webhook assinado do gateway</strong> (Inter/Cora) —
          em produção o status nunca é confiado ao retorno do navegador.
        </p>
      </div>

      {recibo && <ReciboModal cobranca={recibo} onFechar={() => setRecibo(null)} />}
    </div>
  )
}

function ReciboModal({ cobranca, onFechar }: { cobranca: Cobranca; onFechar: () => void }) {
  const { dados } = useStore()
  const pedido = dados.pedidos.find((p) => p.id === cobranca.pedidoId)
  const pdv = pedido && dados.pontosVenda.find((x) => x.id === pedido.pdvId)
  return (
    <Modal titulo="Recibo" onFechar={onFechar}>
      <div id="recibo-print" style={{ fontFamily: 'var(--corpo)' }}>
        <h2 style={{ color: 'var(--bordo)' }}>Recibo — Brownie do Dudu</h2>
        <p className="muted">Recibo nº {cobranca.id}</p>
        <hr />
        <p><strong>Pagador:</strong> {pdv?.razaoSocial} — {pdv?.cnpj}</p>
        <p><strong>Referente ao pedido:</strong> {cobranca.pedidoId}</p>
        <p><strong>Forma:</strong> {cobranca.tipo.toUpperCase()}</p>
        <p><strong>Pago em:</strong> {cobranca.pagoEm ? new Date(cobranca.pagoEm).toLocaleString('pt-BR') : '—'}</p>
        <h3 style={{ marginTop: 12 }}>Valor: {brl(cobranca.valor)}</h3>
        <p className="muted">Recebemos a quantia acima referente ao pedido informado.</p>
      </div>
      <button className="btn mt" onClick={() => window.print()}>Imprimir / Salvar PDF</button>
    </Modal>
  )
}
