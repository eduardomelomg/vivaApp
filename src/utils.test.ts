import { describe, expect, it } from 'vitest'
import { activityKcal, bmiLabel, getMetrics, scopedStorageKey } from './utils'
import type { Profile } from './types'

const baseProfile: Profile = {
  name: 'Teste',
  weight: 80,
  height: 180,
  age: 30,
  sex: 'masculino',
  activity: 1.55,
  goal: 'manter',
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

describe('getMetrics', () => {
  it('calcula IMC a partir de peso e altura', () => {
    const { bmi } = getMetrics(baseProfile)
    // 80 / (1.8^2) = 24.69
    expect(bmi).toBeCloseTo(24.69, 2)
  })

  it('usa a fórmula de Mifflin-St Jeor com ajuste masculino', () => {
    // base = 10*80 + 6.25*180 - 5*30 + 5 = 1780; manutenção = 1780 * 1.55
    const { maintenance } = getMetrics(baseProfile)
    expect(maintenance).toBe(Math.round(1780 * 1.55))
  })

  it('aplica ajuste feminino na taxa metabólica basal', () => {
    const feminino = getMetrics({ ...baseProfile, sex: 'feminino' })
    // base feminina = 1780 - 5 - 161 = 1614
    expect(feminino.maintenance).toBe(Math.round(1614 * 1.55))
  })

  it('aplica déficit calórico ao perder peso', () => {
    const manter = getMetrics(baseProfile)
    const perder = getMetrics({ ...baseProfile, goal: 'perder' })
    expect(perder.calories).toBe(manter.maintenance - 400)
  })

  it('aplica superávit calórico ao ganhar massa', () => {
    const manter = getMetrics(baseProfile)
    const ganhar = getMetrics({ ...baseProfile, goal: 'ganhar' })
    expect(ganhar.calories).toBe(manter.maintenance + 300)
  })

  it('arredonda a meta de água para múltiplos de 50 ml', () => {
    const { water } = getMetrics(baseProfile)
    // 80 * 35 = 2800 -> já múltiplo de 50
    expect(water).toBe(2800)
    expect(water % 50).toBe(0)
    // 75 * 33 = 2475 -> arredonda para 2500
    expect(getMetrics({ ...baseProfile, weight: 75, waterMultiplier: 33 }).water % 50).toBe(0)
  })
})

describe('activityKcal', () => {
  it('estima gasto por METs: MET × peso × horas', () => {
    // corrida (9.8 MET), 80 kg, 30 min → 9.8 * 80 * 0.5 = 392
    expect(activityKcal(9.8, 80, 30)).toBe(392)
    // caminhada (3.5 MET), 70 kg, 60 min → 245
    expect(activityKcal(3.5, 70, 60)).toBe(245)
  })

  it('retorna 0 para duração zero', () => {
    expect(activityKcal(8, 80, 0)).toBe(0)
  })
})

describe('bmiLabel', () => {
  it.each([
    [17, 'Abaixo do peso'],
    [22, 'Faixa adequada'],
    [27, 'Sobrepeso'],
    [32, 'Obesidade'],
  ])('classifica IMC %d como "%s"', (bmi, label) => {
    expect(bmiLabel(bmi)).toBe(label)
  })

  it('respeita os limites das faixas', () => {
    expect(bmiLabel(18.5)).toBe('Faixa adequada')
    expect(bmiLabel(25)).toBe('Sobrepeso')
    expect(bmiLabel(30)).toBe('Obesidade')
  })
})

describe('scopedStorageKey', () => {
  it('separa dados de contas e mantém o modo local compatível', () => {
    expect(scopedStorageKey('usuario-1', 'viva-profile')).toBe('viva-user-usuario-1:viva-profile')
    expect(scopedStorageKey(undefined, 'viva-profile')).toBe('viva-profile')
  })
})
