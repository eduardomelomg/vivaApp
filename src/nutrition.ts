import type { Food, MealItem } from './types'

export const foodBaseGrams = (food: Food) => food.baseGrams || Number(food.portion.match(/(\d+(?:[.,]\d+)?)\s*g/i)?.[1]?.replace(',', '.')) || 100

export const mealFactor = (item: MealItem) => item.grams ? item.grams / foodBaseGrams(item) : item.quantity

export const mealNutrients = (item: MealItem) => {
  const factor = mealFactor(item)
  return { kcal: item.kcal * factor, protein: item.protein * factor, carbs: item.carbs * factor, fat: item.fat * factor }
}

export const sumMeals = (items: MealItem[]) => items.reduce((total, item) => {
  const value = mealNutrients(item)
  return { kcal: total.kcal + value.kcal, protein: total.protein + value.protein, carbs: total.carbs + value.carbs, fat: total.fat + value.fat }
}, { kcal: 0, protein: 0, carbs: 0, fat: 0 })

export const macroGoals = (calories: number) => ({ protein: calories * .3 / 4, carbs: calories * .4 / 4, fat: calories * .3 / 9 })
