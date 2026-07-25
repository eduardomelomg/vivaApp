// Stub de integração com o gateway de pagamento (Banco Inter ou Cora).
//
// IMPORTANTE (Seção 6 e 10 do doc):
// - Autenticação (certificado do Inter / client_id+secret da Cora) fica SÓ no
//   backend, nunca no frontend.
// - Confirmação de pagamento vem por WEBHOOK ASSINADO do gateway — nunca
//   confiar no retorno do navegador do cliente.
//
// Este módulo define o CONTRATO usado pelo backend; o front só dispara a
// intenção "gerar cobrança" e reflete o status que o webhook atualizar.

export type Provedor = 'inter' | 'cora'

export interface SolicitacaoCobranca {
  pedidoId: string
  valor: number
  tipo: 'boleto' | 'pix'
  vencimento: string // ISO
  pagador: { nome: string; cnpj: string }
}

export interface CobrancaGerada {
  idGateway: string
  urlDocumento?: string // boleto PDF
  linhaDigitavel?: string
  pixCopiaCola?: string
}

/**
 * Contrato de emissão. Implementação real (backend):
 *  - Inter:  POST /cobranca/v3/cobrancas (mTLS + OAuth)
 *  - Cora:   POST /invoices (Bearer token)
 * Aqui é apenas o formato esperado — o front chama o backend, não o gateway.
 */
export async function emitirCobranca(
  _provedor: Provedor,
  _req: SolicitacaoCobranca,
): Promise<CobrancaGerada> {
  throw new Error('emitirCobranca deve ser implementado no backend (segredos fora do frontend).')
}

// -------- Webhook (processado no backend) --------
export interface WebhookPagamento {
  idGateway: string
  status: 'pago' | 'vencido' | 'cancelado'
  pagoEm?: string
  assinatura: string // HMAC/assinatura do provedor
}

/**
 * Verificação da assinatura do webhook. Implementação real no backend usa o
 * segredo do provedor. Nunca marcar como pago sem validar a assinatura.
 */
export function verificarAssinaturaWebhook(_payload: WebhookPagamento, _segredo: string): boolean {
  throw new Error('verificarAssinaturaWebhook deve rodar no backend com o segredo do provedor.')
}
