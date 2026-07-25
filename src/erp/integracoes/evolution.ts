// Stub de integração com a Evolution API (WhatsApp self-hosted no Coolify).
//
// IMPORTANTE: em produção esta chamada NUNCA parte do navegador.
// A URL da instância e o `apikey` ficam só no backend (FastAPI/Edge Function).
// Este módulo define o CONTRATO; o front apenas enfileira a intenção de envio
// e o backend consome a fila (tabela `notificacoes`) e chama a Evolution.

export interface EnvioWhatsApp {
  destinatario: string // E.164, ex.: +5511988887777
  mensagem: string
  // anexos opcionais (boleto/recibo em PDF, por URL)
  anexoUrl?: string
}

export interface ResultadoEnvio {
  ok: boolean
  idMensagem?: string
  erro?: string
}

/**
 * Contrato do envio. A implementação real (backend) faria:
 *   POST {EVOLUTION_URL}/message/sendText/{instancia}
 *   headers: { apikey: EVOLUTION_APIKEY }
 *   body: { number, textMessage: { text } }
 *
 * No frontend isso permanece um stub que apenas registra a intenção.
 */
export async function enviarWhatsApp(_envio: EnvioWhatsApp): Promise<ResultadoEnvio> {
  // Placeholder: o envio real acontece no worker do backend que lê a fila.
  return { ok: true, idMensagem: 'stub-frontend' }
}

/** Valida E.164 antes de enfileirar (WhatsApp exige esse formato). */
export function validarE164(numero: string): boolean {
  return /^\+\d{12,15}$/.test(numero.replace(/[\s()-]/g, ''))
}
