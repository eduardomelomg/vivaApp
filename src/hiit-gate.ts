import type { Profile } from './types'

// Triagem de prontidão para esforço vigoroso (HIIT), no estilo PAR-Q+.
// Qualquer resposta positiva bloqueia o HIIT e leva à alternativa de baixo
// impacto. A avaliação é derivada do perfil, então é reavaliada sempre que o
// perfil muda (idade, condição, respostas).

export type ParqKey = 'dorPeito' | 'tontura' | 'cardiaco' | 'pressao' | 'gravidez' | 'articular' | 'medico'

export const PARQ_QUESTIONS: { key: ParqKey; label: string }[] = [
  { key: 'dorPeito', label: 'Você sente dor no peito em repouso ou durante esforço físico?' },
  { key: 'tontura', label: 'Você já teve tontura, desmaio ou perda de consciência ao se exercitar?' },
  { key: 'cardiaco', label: 'Você tem algum problema cardíaco diagnosticado por um médico?' },
  { key: 'pressao', label: 'Você tem pressão arterial alta e não controlada?' },
  { key: 'gravidez', label: 'Você está grávida?' },
  { key: 'articular', label: 'Você tem lesão óssea ou articular ativa que piora com exercício?' },
  { key: 'medico', label: 'Algum médico já recomendou que você evite exercícios intensos?' },
]

export interface HiitReadiness {
  answeredAll: boolean
  anyRisk: boolean
  confirmations: boolean
  ready: boolean
}

export function evaluateHiit(profile: Profile): HiitReadiness {
  const parq = profile.parq || {}
  const answers = PARQ_QUESTIONS.map(question => parq[question.key])
  const answeredAll = answers.every(answer => answer === true || answer === false)
  const anyRisk = answers.some(answer => answer === true) || Boolean(profile.limitations?.trim())
  const confirmations = Boolean(profile.parqWarmup && profile.parqStop)
  return { answeredAll, anyRisk, confirmations, ready: answeredAll && !anyRisk && confirmations }
}
