import { describe, expect, it } from 'vitest'
import { completedSessionSets, createExerciseLog, findExerciseHistory, sessionVolume } from './workout-progress'
import type { WorkoutSession } from './types'

const session: WorkoutSession = {
  id: 's1',
  date: '2026-07-19',
  workoutId: 'peito',
  title: 'Peito',
  durationSeconds: 1800,
  exerciseLogs: [{
    exerciseId: 'supino',
    exerciseName: 'Supino reto',
    sets: [
      { set: 1, value: 12, unit: 'reps', weight: 40, completed: true },
      { set: 2, value: 12, unit: 'reps', weight: 40, completed: true },
      { set: 3, value: 12, unit: 'reps', weight: 40, completed: true },
    ],
  }],
}

describe('progressão de treino', () => {
  it('localiza a execução mais recente do exercício', () => {
    expect(findExerciseHistory([session], 'Supino reto')?.lastWeight).toBe(40)
  })

  it('sugere aumento após atingir o topo da faixa', () => {
    const history = findExerciseHistory([session], 'Supino reto')
    const log = createExerciseLog({ id: 'novo', name: 'Supino reto', prescription: '3× 8–12', rest: '90s', instruction: '' }, history)
    expect(log.sets).toHaveLength(3)
    expect(log.sets[0].weight).toBe(41)
    expect(log.sets.every(set => !set.completed)).toBe(true)
  })

  it('calcula séries concluídas e volume', () => {
    expect(completedSessionSets(session)).toBe(3)
    expect(sessionVolume(session)).toBe(1440)
  })
})
