import type { PointsEvent } from './types'
import { todayKey } from './utils'

export type PlantStage = 'semente' | 'broto' | 'muda' | 'adulta' | 'florida' | 'arvore'
export type PlantHealth = 'saudavel' | 'murchando' | 'amarelada' | 'seca' | 'sem_vida' | 'recuperando'

export interface PlantState {
  stage: PlantStage
  health: PlantHealth
  label: string
  message: string
  daysInactive: number
  recoveryDays: number
}

const habitTypes = new Set(['agua', 'meta_agua', 'refeicao', 'treino'])

function dayNumber(value: string) {
  return Math.floor(new Date(`${value}T12:00:00`).getTime() / 86_400_000)
}

function stageForPoints(points: number): PlantStage {
  if (points >= 7000) return 'arvore'
  if (points >= 3500) return 'florida'
  if (points >= 1500) return 'adulta'
  if (points >= 500) return 'muda'
  if (points >= 100) return 'broto'
  return 'semente'
}

export function getPlantState(events: PointsEvent[], points: number): PlantState {
  const today = todayKey()
  const dates = [...new Set(events.filter(event => habitTypes.has(event.type)).map(event => event.date))].sort()
  const stage = stageForPoints(points)
  if (!dates.length) return { stage, health: 'saudavel', label: 'Esperando seu primeiro cuidado', message: 'Complete um hábito para cuidar do seu broto.', daysInactive: 0, recoveryDays: 0 }

  const last = dates[dates.length - 1]
  const daysInactive = Math.max(0, dayNumber(today) - dayNumber(last))
  if (daysInactive > 0) {
    if (daysInactive >= 30) return { stage, health: 'sem_vida', label: 'Adormecida', message: 'Sua planta está te esperando com carinho. Um cuidado hoje faz um novo broto despontar.', daysInactive, recoveryDays: 0 }
    if (daysInactive >= 14) return { stage, health: 'seca', label: 'Com sede', message: 'Ela sente sua falta. Um único hábito hoje já a deixa firme de novo.', daysInactive, recoveryDays: 0 }
    if (daysInactive >= 7) return { stage, health: 'amarelada', label: 'Pedindo água', message: 'Um hábito hoje já começa a reanimar as folhas.', daysInactive, recoveryDays: 0 }
    if (daysInactive >= 3) return { stage, health: 'murchando', label: 'Sentindo sua falta', message: 'Que tal cuidar dela com uma atividade rápida? Ela volta fácil.', daysInactive, recoveryDays: 0 }
    return { stage, health: 'saudavel', label: 'Tranquila', message: 'Ela aguenta bem uma pausa curta. Volte quando puder, sem pressa.', daysInactive, recoveryDays: 0 }
  }

  let streak = 1
  for (let index = dates.length - 1; index > 0; index--) {
    if (dayNumber(dates[index]) - dayNumber(dates[index - 1]) !== 1) break
    streak++
  }
  const streakStartIndex = dates.length - streak
  const previousDate = dates[streakStartIndex - 1]
  const previousGap = previousDate ? dayNumber(dates[streakStartIndex]) - dayNumber(previousDate) - 1 : 0
  if (previousGap >= 3 && streak < 7) {
    return { stage, health: 'recuperando', label: streak === 1 ? 'Um novo broto nasceu' : 'Recuperando as folhas', message: `${7 - streak} dia${7 - streak === 1 ? '' : 's'} de cuidado para recuperar toda a forma.`, daysInactive: 0, recoveryDays: streak }
  }
  return { stage, health: 'saudavel', label: 'Saudável e crescendo', message: 'Seus hábitos estão mantendo a planta forte.', daysInactive: 0, recoveryDays: 7 }
}
