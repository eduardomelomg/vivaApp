import { useStore } from '../store'
import { Badge, brl } from '../ui'

// Painel do admin: programação da rota do dia e atribuição de motoboys.
export function EntregasScreen() {
  const { dados, atribuirEntrega } = useStore()
  // Pedidos prontos/em rota são candidatos a entrega.
  const candidatos = dados.pedidos.filter((p) =>
    ['pronto', 'em_rota', 'entregue'].includes(p.status),
  )

  return (
    <div>
      <div className="section-title"><h1>Entregas / Rotas</h1></div>
      <div className="card">
        <p className="muted">A ordem das paradas é definida por proximidade quando a rota do dia é montada.</p>
        <table className="erp">
          <thead>
            <tr><th>Pedido</th><th>PDV / Endereço</th><th>Valor</th><th>Motoboy</th><th>Status entrega</th><th>Ordem</th></tr>
          </thead>
          <tbody>
            {candidatos.map((p) => {
              const pdv = dados.pontosVenda.find((x) => x.id === p.pdvId)
              const entrega = dados.entregas.find((e) => e.pedidoId === p.id)
              return (
                <tr key={p.id}>
                  <td className="muted">{p.id}</td>
                  <td>{pdv?.razaoSocial}<br /><span className="muted">{p.enderecoEntrega}</span></td>
                  <td>{brl(p.valorTotal)}</td>
                  <td>
                    <select value={entrega?.motoboyId ?? ''} onChange={(e) => atribuirEntrega(p.id, e.target.value)}>
                      <option value="">— atribuir —</option>
                      {dados.motoboys.filter((m) => m.ativo).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </td>
                  <td>{entrega ? <Badge status={entrega.status} /> : <span className="muted">sem entrega</span>}</td>
                  <td>{entrega?.ordemRota ?? '—'}</td>
                </tr>
              )
            })}
            {candidatos.length === 0 && <tr><td colSpan={6} className="muted">Nenhum pedido pronto para rota.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
