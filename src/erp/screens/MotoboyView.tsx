import { useStore } from '../store'
import { Badge } from '../ui'

// Tela mobile-first do motoboy: só as entregas atribuídas a ele (evita IDOR).
export function MotoboyView() {
  const { dados, usuario, mudarStatusEntrega } = useStore()
  const motoboyId = usuario?.vinculoId
  const minhas = dados.entregas
    .filter((e) => e.motoboyId === motoboyId && e.status !== 'entregue')
    .sort((a, b) => a.ordemRota - b.ordemRota)
  const entregues = dados.entregas.filter((e) => e.motoboyId === motoboyId && e.status === 'entregue')

  const mapsLink = (endereco: string) =>
    `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(endereco)}&travelmode=driving`

  return (
    <div className="motoboy-view">
      <h1 className="section-title">Minhas entregas</h1>
      {minhas.length === 0 && <p className="muted">Nenhuma entrega pendente. 🎉</p>}
      {minhas.map((e) => {
        const pedido = dados.pedidos.find((p) => p.id === e.pedidoId)
        const pdv = pedido && dados.pontosVenda.find((x) => x.id === pedido.pdvId)
        return (
          <div className="parada" key={e.id}>
            <div className="row">
              <strong>#{e.ordemRota} · {pdv?.razaoSocial}</strong>
              <span className="right"><Badge status={e.status} /></span>
            </div>
            <p className="muted">{pedido?.enderecoEntrega}</p>
            {pedido?.observacoes && <p className="dica">Obs.: {pedido.observacoes}</p>}
            <div className="row mt">
              <a className="btn sec sm" href={mapsLink(pedido?.enderecoEntrega ?? '')} target="_blank" rel="noreferrer">
                🧭 Navegar (Google Maps)
              </a>
              {e.status === 'pendente' && (
                <button className="btn sm" onClick={() => mudarStatusEntrega(e.id, 'em_rota')}>Iniciar rota</button>
              )}
              {e.status === 'em_rota' && (
                <button className="btn sm" onClick={() => mudarStatusEntrega(e.id, 'cheguei')}>Cheguei</button>
              )}
              {e.status === 'cheguei' && (
                <button className="btn sm" onClick={() => mudarStatusEntrega(e.id, 'entregue')}>Entregue ✓</button>
              )}
            </div>
          </div>
        )
      })}
      {entregues.length > 0 && (
        <>
          <h3 className="section-title mt">Entregues hoje ({entregues.length})</h3>
          {entregues.map((e) => {
            const pedido = dados.pedidos.find((p) => p.id === e.pedidoId)
            const pdv = pedido && dados.pontosVenda.find((x) => x.id === pedido.pdvId)
            return <div className="parada" key={e.id} style={{ opacity: 0.6 }}>{pdv?.razaoSocial} — entregue ✓</div>
          })}
        </>
      )}
    </div>
  )
}
