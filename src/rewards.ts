import type { Achievement, PointsEvent, WorkoutSession } from './types'
import { todayKey, uid } from './utils'

export const DAILY_POINTS_LIMIT = 100

export const achievements: Achievement[] = [
  { id: 'first-workout', title: 'Primeiro passo', description: 'Concluiu o primeiro treino', icon: '🌱', rarity: 'comum', bonus: 0 },
  { id: 'active-week', title: 'Semana ativa', description: 'Fez 3 treinos em 7 dias', icon: '🔥', rarity: 'raro', bonus: 100 },
  { id: 'strong-month', title: 'Mês consistente', description: 'Fez 12 treinos em 30 dias', icon: '🏅', rarity: 'epico', bonus: 500 },
  { id: 'strong-quarter', title: 'Trimestre imparável', description: 'Fez 36 treinos em 90 dias', icon: '🏆', rarity: 'lendario', bonus: 1500 },
]

type DailyPointType = 'agua' | 'meta_agua' | 'refeicao' | 'treino'

const dailyRules: Record<DailyPointType, { points: number; max: number }> = {
  agua: { points: 5, max: 3 },
  meta_agua: { points: 15, max: 1 },
  refeicao: { points: 5, max: 4 },
  treino: { points: 50, max: 1 },
}

export function dailyPoints(events: PointsEvent[], date = todayKey()) {
  return events.filter(event => event.date === date && !event.bonus).reduce((sum, event) => sum + event.points, 0)
}

export function totalPoints(events: PointsEvent[]) {
  return events.reduce((sum, event) => sum + event.points, 0)
}

export function awardDaily(events: PointsEvent[], type: DailyPointType, label: string): { events: PointsEvent[]; awarded: number } {
  const date = todayKey()
  const rule = dailyRules[type]
  const sameType = events.filter(event => event.date === date && event.type === type && !event.bonus).length
  const available = DAILY_POINTS_LIMIT - dailyPoints(events, date)
  if (sameType >= rule.max || available <= 0) return { events, awarded: 0 }
  const points = Math.min(rule.points, available)
  return { events: [...events, { id: uid(), date, type, label, points, bonus: false }], awarded: points }
}

export function evaluateAchievements(sessions: WorkoutSession[], unlockedIds: string[]) {
  const now = Date.now()
  const distinctWithin = (days: number) => new Set(sessions.filter(session => now - new Date(`${session.date}T12:00:00`).getTime() <= days * 86_400_000).map(session => session.date)).size
  const eligible = [
    sessions.length >= 1 && 'first-workout',
    distinctWithin(7) >= 3 && 'active-week',
    distinctWithin(30) >= 12 && 'strong-month',
    distinctWithin(90) >= 36 && 'strong-quarter',
  ].filter(Boolean) as string[]
  return eligible.filter(id => !unlockedIds.includes(id))
}

export function createAchievementEvent(achievement: Achievement): PointsEvent | null {
  if (!achievement.bonus) return null
  return { id: uid(), date: todayKey(), type: 'conquista', label: achievement.title, points: achievement.bonus, bonus: true }
}

export function getLevel(points: number) {
  const levels = [
    { name: 'Iniciante', min: 0, next: 500, trophy: '🌱' },
    { name: 'Em movimento', min: 500, next: 1500, trophy: '🥉' },
    { name: 'Consistente', min: 1500, next: 3500, trophy: '🥈' },
    { name: 'Determinado', min: 3500, next: 7000, trophy: '🥇' },
    { name: 'Imparável', min: 7000, next: 10000, trophy: '🏆' },
  ]
  return [...levels].reverse().find(level => points >= level.min) || levels[0]
}
