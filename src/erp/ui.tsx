import React from 'react'

export const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const statusLabels: Record<string, string> = {
  recebido: 'Recebido',
  em_producao: 'Em produção',
  pronto: 'Pronto',
  em_rota: 'Em rota',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  pendente: 'Pendente',
  cheguei: 'Cheguei',
}

export function Badge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{statusLabels[status] ?? status}</span>
}

export function Modal({
  titulo,
  children,
  onFechar,
}: {
  titulo: string
  children: React.ReactNode
  onFechar: () => void
}) {
  return (
    <div className="modal-overlay" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-title">
          <h3>{titulo}</h3>
          <button className="btn ghost sm" onClick={onFechar} aria-label="Fechar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// Validação simples de telefone E.164 (WhatsApp exige esse formato).
export function telefoneValido(tel: string): boolean {
  return /^\+\d{12,15}$/.test(tel.replace(/[\s()-]/g, ''))
}
