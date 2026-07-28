import { useStore } from '../store'
import { receita } from '../pricing'
import { brl, Badge } from '../ui'

export function Dashboard({ irPara }: { irPara: (r: string) => void }) {
  const { dados } = useStore()
  const hoje = new Date().toDateString()
  const pedidosHoje = dados.pedidos.filter(
    (p) => new Date(p.criadoEm).toDateString() === hoje,
  )
  const pendentes = dados.pedidos.filter((p) =>
    ['recebido', 'em_producao', 'pronto'].includes(p.status),
  )
  const emRota = dados.entregas.filter((e) => e.status === 'em_rota' || e.status === 'cheguei')
  const r = receita(dados.pedidos, dados.fichasTecnicas, dados.insumos)
  const estoqueBaixo = dados.insumos.filter((i) => i.estoqueAtual < 3)

  return (
    <div>
      <h1 className="section-title">Dashboard</h1>
      <div className="grid grid-cards">
        <button className="card kpi" onClick={() => irPara('pedidos')} style={{ cursor: 'pointer', textAlign: 'left' }}>
          <span className="valor">{pendentes.length}</span>
          <span className="rotulo">Pedidos pendentes</span>
        </button>
        <button className="card kpi" onClick={() => irPara('entregas')} style={{ cursor: 'pointer', textAlign: 'left' }}>
          <span className="valor">{emRota.length}</span>
          <span className="rotulo">Entregas em rota</span>
        </button>
        <div className="card kpi">
          <span className="valor">{brl(r.bruta)}</span>
          <span className="rotulo">Receita bruta (total)</span>
        </div>
        <div className="card kpi">
          <span className="valor">{brl(r.liquida)}</span>
          <span className="rotulo">Receita líquida estimada</span>
        </div>
      </div>

      <div className="grid mt" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="card">
          <h3 className="section-title">Alertas</h3>
          {estoqueBaixo.length === 0 && pendentes.length === 0 && (
            <p className="muted">Nenhum alerta no momento. 🎉</p>
          )}
          {estoqueBaixo.map((i) => (
            <div className="alerta" key={i.id}>
              Estoque baixo: <strong>{i.nome}</strong> ({i.estoqueAtual} {i.unidade})
            </div>
          ))}
          {pendentes.length > 0 && (
            <div className="dica mt">
              {pendentes.length} pedido(s) aguardando produção/rota.
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Pedidos de hoje</h3>
          {pedidosHoje.length === 0 && <p className="muted">Nenhum pedido registrado hoje.</p>}
          <table className="erp">
            <tbody>
              {pedidosHoje.map((p) => {
                const pdv = dados.pontosVenda.find((x) => x.id === p.pdvId)
                return (
                  <tr key={p.id}>
                    <td>{pdv?.razaoSocial ?? p.pdvId}</td>
                    <td>{brl(p.valorTotal)}</td>
                    <td><Badge status={p.status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
