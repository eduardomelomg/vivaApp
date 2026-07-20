import { describe, expect, it } from 'vitest'
import { foodBaseGrams, macroGoals, mealNutrients, sumMeals } from './nutrition'
import type { MealItem } from './types'

const rice: MealItem = { id: 'rice', entryId: '1', name: 'Arroz', portion: '100 g', kcal: 128, protein: 2.5, carbs: 28, fat: .2, quantity: 1, grams: 150 }

describe('nutrition', () => {
  it('calcula nutrientes pela quantidade em gramas', () => {
    expect(foodBaseGrams(rice)).toBe(100)
    expect(mealNutrients(rice).kcal).toBe(192)
  })

  it('mantém compatibilidade com registros antigos por porção', () => {
    const old = { ...rice, grams: undefined, quantity: 2 }
    expect(sumMeals([old]).carbs).toBe(56)
  })

  it('gera metas de macros coerentes com as calorias', () => {
    expect(macroGoals(2000)).toEqual({ protein: 150, carbs: 200, fat: 2000 * .3 / 9 })
  })
})
