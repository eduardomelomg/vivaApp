import { useStore } from '../store'
import { Badge } from '../ui'

// Log de notificações (Evolution API). Fila + auditoria; falha não trava o pedido.
export function NotificacoesScreen() {
  const { dados } = useStore()
  return (
    <div>
      <div className="section-title"><h1>Notificações (WhatsApp / Evolution API)</h1></div>
      <div className="dica">
        Toda mensagem parte do backend (nunca do navegador do PDV). Aqui fica o log de auditoria
        de cada envio: pedido, tipo, destinatário e status.
      </div>
      <div className="card mt">
        <table className="erp">
          <thead>
            <tr><th>Quando</th><th>Pedido</th><th>Tipo</th><th>Destinatário</th><th>Mensagem</th><th>Status</th></tr>
          </thead>
          <tbody>
            {dados.notificacoes.map((n) => (
              <tr key={n.id}>
                <td className="muted">{n.enviadoEm ? new Date(n.enviadoEm).toLocaleString('pt-BR') : '—'}</td>
                <td className="muted">{n.pedidoId}</td>
                <td>{n.tipo}</td>
                <td>{n.destinatario}</td>
                <td className="muted">{n.mensagem}</td>
                <td><Badge status={n.statusEnvio === 'enviado' ? 'entregue' : n.statusEnvio === 'falha' ? 'cancelado' : 'recebido'} /></td>
              </tr>
            ))}
            {dados.notificacoes.length === 0 && <tr><td colSpan={6} className="muted">Nenhuma notificação ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
