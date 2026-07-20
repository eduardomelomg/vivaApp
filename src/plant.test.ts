import { describe, expect, it } from 'vitest'
import { getPlantState } from './plant'
import { todayKey } from './utils'
import type { PointsEvent } from './types'

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function habit(date: string): PointsEvent {
  return { id: crypto.randomUUID(), date, type: 'agua', label: 'x', points: 5, bonus: false }
}

describe('getPlantState — estágio por pontos', () => {
  it.each([
    [0, 'semente'],
    [100, 'broto'],
    [500, 'muda'],
    [1500, 'adulta'],
    [3500, 'florida'],
    [7000, 'arvore'],
  ] as const)('%d pontos → estágio %s', (points, stage) => {
    expect(getPlantState([habit(todayKey())], points).stage).toBe(stage)
  })
})

describe('getPlantState — saúde por inatividade', () => {
  it('sem hábitos, aguarda o primeiro cuidado', () => {
    const state = getPlantState([], 0)
    expect(state.health).toBe('saudavel')
    expect(state.daysInactive).toBe(0)
  })

  it('mantém saudável com hábito hoje', () => {
    expect(getPlantState([habit(todayKey())], 100).health).toBe('saudavel')
  })

  it.each([
    [3, 'murchando'],
    [7, 'amarelada'],
    [14, 'seca'],
    [30, 'sem_vida'],
  ] as const)('%d dias sem hábito → %s', (days, health) => {
    const state = getPlantState([habit(daysAgo(days))], 500)
    expect(state.health).toBe(health)
    expect(state.daysInactive).toBe(days)
  })

  it('pausa curta (2 dias) ainda é saudável', () => {
    expect(getPlantState([habit(daysAgo(2))], 500).health).toBe('saudavel')
  })
})

describe('getPlantState — recuperação', () => {
  it('entra em recuperação após voltar de uma ausência longa', () => {
    // hábito antigo, lacuna de 10 dias, e hábito hoje
    const state = getPlantState([habit(daysAgo(10)), habit(todayKey())], 500)
    expect(state.health).toBe('recuperando')
    expect(state.recoveryDays).toBeGreaterThanOrEqual(1)
    expect(state.recoveryDays).toBeLessThan(7)
  })

  it('volta a saudável e crescendo com constância', () => {
    const sequencia = [0, 1, 2, 3, 4, 5, 6, 7].map(n => habit(daysAgo(n)))
    expect(getPlantState(sequencia, 500).health).toBe('saudavel')
  })
})
