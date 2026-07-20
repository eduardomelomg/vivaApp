import { describe, expect, it } from 'vitest'
import {
  achievements,
  awardDaily,
  createAchievementEvent,
  DAILY_POINTS_LIMIT,
  dailyPoints,
  evaluateAchievements,
  getLevel,
  totalPoints,
} from './rewards'
import { todayKey } from './utils'
import type { PointsEvent, WorkoutSession } from './types'

const today = todayKey()

function event(partial: Partial<PointsEvent>): PointsEvent {
  return { id: crypto.randomUUID(), date: today, type: 'agua', label: 'x', points: 5, bonus: false, ...partial }
}

describe('dailyPoints / totalPoints', () => {
  it('soma apenas eventos não-bônus do dia informado', () => {
    const events = [
      event({ points: 5 }),
      event({ points: 15, type: 'meta_agua' }),
      event({ points: 100, bonus: true, type: 'conquista' }),
      event({ points: 50, date: '2000-01-01', type: 'treino' }),
    ]
    expect(dailyPoints(events, today)).toBe(20)
  })

  it('totalPoints soma tudo, inclusive bônus', () => {
    const events = [event({ points: 5 }), event({ points: 100, bonus: true, type: 'cadastro' })]
    expect(totalPoints(events)).toBe(105)
  })
})

describe('awardDaily', () => {
  it('concede pontos quando abaixo do limite por tipo', () => {
    const result = awardDaily([], 'agua', 'Água')
    expect(result.awarded).toBe(5)
    expect(result.events).toHaveLength(1)
  })

  it('respeita o máximo de ocorrências por tipo', () => {
    let events: PointsEvent[] = []
    for (let i = 0; i < 3; i++) events = awardDaily(events, 'agua', 'Água').events
    const fourth = awardDaily(events, 'agua', 'Água') // max 3 para água
    expect(fourth.awarded).toBe(0)
    expect(fourth.events).toBe(events) // retorna a mesma referência sem alterações
  })

  it('respeita o teto diário de 100 pontos e corta o último prêmio', () => {
    // 90 pontos já registrados no dia
    const events = [event({ points: 90, type: 'treino' })]
    const result = awardDaily(events, 'meta_agua', 'Meta') // valeria 15, mas só há 10 disponíveis
    expect(result.awarded).toBe(10)
    expect(dailyPoints(result.events, today)).toBe(DAILY_POINTS_LIMIT)
  })

  it('não concede nada quando o teto diário já foi atingido', () => {
    const events = [event({ points: 100, type: 'treino' })]
    const result = awardDaily(events, 'agua', 'Água')
    expect(result.awarded).toBe(0)
  })
})

describe('evaluateAchievements', () => {
  function session(date: string): WorkoutSession {
    return { id: crypto.randomUUID(), date, workoutId: 'day-0', title: 't' }
  }
  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().slice(0, 10)
  }

  it('desbloqueia "first-workout" na primeira sessão', () => {
    expect(evaluateAchievements([session(today)], [])).toContain('first-workout')
  })

  it('desbloqueia "active-week" com 3 dias distintos em 7 dias', () => {
    const sessions = [session(daysAgo(0)), session(daysAgo(2)), session(daysAgo(5))]
    expect(evaluateAchievements(sessions, [])).toContain('active-week')
  })

  it('não conta o mesmo dia mais de uma vez', () => {
    const sessions = [session(today), session(today), session(today)]
    expect(evaluateAchievements(sessions, [])).not.toContain('active-week')
  })

  it('não retorna conquistas já desbloqueadas', () => {
    const result = evaluateAchievements([session(today)], ['first-workout'])
    expect(result).not.toContain('first-workout')
  })
})

describe('createAchievementEvent', () => {
  it('retorna null quando a conquista não tem bônus', () => {
    const semBonus = achievements.find(a => a.bonus === 0)!
    expect(createAchievementEvent(semBonus)).toBeNull()
  })

  it('cria evento de bônus marcado como bonus/conquista', () => {
    const comBonus = achievements.find(a => a.bonus > 0)!
    const ev = createAchievementEvent(comBonus)
    expect(ev).toMatchObject({ type: 'conquista', bonus: true, points: comBonus.bonus })
  })
})

describe('getLevel', () => {
  it.each([
    [0, 'Iniciante'],
    [499, 'Iniciante'],
    [500, 'Em movimento'],
    [1500, 'Consistente'],
    [3500, 'Determinado'],
    [7000, 'Imparável'],
    [50000, 'Imparável'],
  ])('mapeia %d pontos para nível "%s"', (points, name) => {
    expect(getLevel(points).name).toBe(name)
  })
})
