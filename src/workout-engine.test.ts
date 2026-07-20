import { describe, expect, it } from 'vitest'
import { generateWorkoutPlan } from './workout-engine'
import type { Profile } from './types'

const base: Profile = {
  name: 'Teste',
  weight: 80,
  height: 180,
  age: 30,
  sex: 'masculino',
  activity: 1.55,
  goal: 'perder',
  waterMultiplier: 35,
  fitnessLevel: 'iniciante',
  trainingDays: 3,
  sessionMinutes: 45,
  equipment: 'academia',
  trainingPlace: 'academia',
  gymType: 'rede',
  homeSetup: 'nenhum',
  hiitReady: false,
  limitations: '',
}

describe('generateWorkoutPlan — estrutura', () => {
  it('gera um treino por dia disponível', () => {
    expect(generateWorkoutPlan({ ...base, trainingDays: 4 }).workouts).toHaveLength(4)
  })

  it('limita a quantidade de dias entre 2 e 7', () => {
    expect(generateWorkoutPlan({ ...base, trainingDays: 1 }).workouts).toHaveLength(2)
    expect(generateWorkoutPlan({ ...base, trainingDays: 9 }).workouts).toHaveLength(7)
  })

  it('cada exercício tem nome, prescrição, descanso e instrução', () => {
    const plan = generateWorkoutPlan(base)
    for (const workout of plan.workouts) {
      expect(workout.exercises.length).toBeGreaterThan(0)
      for (const exercise of workout.exercises) {
        expect(exercise.name).toBeTruthy()
        expect(exercise.prescription).toBeTruthy()
        expect(exercise.rest).toBeTruthy()
        expect(exercise.instruction).toBeTruthy()
      }
    }
  })
})

describe('generateWorkoutPlan — treino em casa (HIIT)', () => {
  const casa: Profile = { ...base, trainingPlace: 'casa', homeSetup: 'nenhum' }

  it('define duração pelo nível: 20/25/30 min', () => {
    expect(generateWorkoutPlan({ ...casa, fitnessLevel: 'iniciante' }).workouts[0].duration).toBe(20)
    expect(generateWorkoutPlan({ ...casa, fitnessLevel: 'intermediario' }).workouts[0].duration).toBe(25)
    expect(generateWorkoutPlan({ ...casa, fitnessLevel: 'avancado' }).workouts[0].duration).toBe(30)
  })

  it('inclui finisher HIIT e estrutura de sessão', () => {
    const plan = generateWorkoutPlan(casa)
    expect(plan.sessionStructure).toBeTruthy()
    const temHiit = plan.workouts[0].exercises.some(e => /finisher|hiit|corrida/i.test(e.name))
    expect(temHiit).toBe(true)
  })
})

describe('generateWorkoutPlan — academia', () => {
  it('usa a duração escolhida (sessionMinutes) na academia', () => {
    const plan = generateWorkoutPlan({ ...base, sessionMinutes: 60 })
    expect(plan.workouts[0].duration).toBe(60)
    expect(plan.sessionStructure).toBeUndefined()
  })

  it('academia de bairro usa nomes de estrutura básica (com barra/halteres)', () => {
    const rede = generateWorkoutPlan({ ...base, goal: 'ganhar', gymType: 'rede' })
    const bairro = generateWorkoutPlan({ ...base, goal: 'ganhar', gymType: 'bairro' })
    // planos diferentes de equipamento produzem ao menos um nome distinto
    const nomesRede = rede.workouts.flatMap(w => w.exercises.map(e => e.name))
    const nomesBairro = bairro.workouts.flatMap(w => w.exercises.map(e => e.name))
    expect(nomesRede).not.toEqual(nomesBairro)
  })

  it('divide três dias em empurrar, puxar e pernas', () => {
    const focuses = generateWorkoutPlan({ ...base, trainingDays: 3 }).workouts.map(workout => workout.focus)
    expect(focuses).toEqual(['Peito, ombros e tríceps', 'Costas e bíceps', 'Pernas e glúteos'])
  })

  it('não usa mais rótulos A/B nem corpo inteiro', () => {
    const plan = generateWorkoutPlan({ ...base, trainingDays: 4 })
    expect(plan.workouts.every(workout => /^Dia \d+$/.test(workout.name))).toBe(true)
    expect(plan.workouts.some(workout => /corpo inteiro|treino [a-z]/i.test(`${workout.name} ${workout.focus}`))).toBe(false)
  })

  it('oferece substituições equivalentes para os exercícios', () => {
    const plan = generateWorkoutPlan({ ...base, trainingDays: 4 })
    expect(plan.workouts.flatMap(workout => workout.exercises).every(exercise => (exercise.alternatives?.length || 0) > 0)).toBe(true)
  })
})

describe('generateWorkoutPlan — rótulos por nível', () => {
  it('reflete o nível no levelLabel e no effort', () => {
    expect(generateWorkoutPlan({ ...base, fitnessLevel: 'avancado' }).levelLabel).toMatch(/Nível 3/)
    expect(generateWorkoutPlan({ ...base, fitnessLevel: 'iniciante' }).effort).toMatch(/RPE/)
  })
})
