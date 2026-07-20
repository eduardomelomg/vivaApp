import type { ActivityType, Food, Goal } from './types'

// Atividades físicas fora do treino guiado (academia/casa), com METs médios
// (Compendium of Physical Activities) para estimar o gasto calórico.
export const activities: ActivityType[] = [
  { id: 'caminhada', name: 'Caminhada', icon: '🚶', met: 3.5 },
  { id: 'corrida', name: 'Corrida', icon: '🏃', met: 9.8 },
  { id: 'ciclismo', name: 'Ciclismo', icon: '🚴', met: 7.5 },
  { id: 'natacao', name: 'Natação', icon: '🏊', met: 8.0 },
  { id: 'futebol', name: 'Futebol', icon: '⚽', met: 7.0 },
  { id: 'basquete', name: 'Basquete', icon: '🏀', met: 6.5 },
  { id: 'volei', name: 'Vôlei', icon: '🏐', met: 4.0 },
  { id: 'tenis', name: 'Tênis', icon: '🎾', met: 7.3 },
  { id: 'danca', name: 'Dança', icon: '💃', met: 5.0 },
  { id: 'pular-corda', name: 'Pular corda', icon: '🪢', met: 11.0 },
  { id: 'trilha', name: 'Trilha', icon: '🥾', met: 6.0 },
  { id: 'luta', name: 'Lutas / boxe', icon: '🥊', met: 7.8 },
  { id: 'skate', name: 'Skate / patins', icon: '🛹', met: 5.0 },
  { id: 'surf', name: 'Surfe', icon: '🏄', met: 5.5 },
  { id: 'outra', name: 'Outra atividade', icon: '✨', met: 4.5 },
]

export const foods: Food[] = [
  { id: 'rice', name: 'Arroz branco cozido', portion: '100 g', kcal: 128, protein: 2.5, carbs: 28.1, fat: 0.2 },
  { id: 'beans', name: 'Feijão carioca cozido', portion: '100 g', kcal: 76, protein: 4.8, carbs: 13.6, fat: 0.5 },
  { id: 'chicken', name: 'Peito de frango grelhado', portion: '100 g', kcal: 159, protein: 32, carbs: 0, fat: 2.5 },
  { id: 'egg', name: 'Ovo de galinha cozido', portion: '1 un (50 g)', kcal: 73, protein: 6.3, carbs: 0.6, fat: 4.8 },
  { id: 'banana', name: 'Banana prata', portion: '1 un (80 g)', kcal: 78, protein: 1, carbs: 20.3, fat: 0.1 },
  { id: 'oats', name: 'Aveia em flocos', portion: '30 g', kcal: 118, protein: 4.2, carbs: 19.8, fat: 2.6 },
  { id: 'bread', name: 'Pão francês', portion: '1 un (50 g)', kcal: 150, protein: 4, carbs: 29.3, fat: 1.5 },
  { id: 'milk', name: 'Leite integral', portion: '200 ml', kcal: 122, protein: 6.4, carbs: 9.4, fat: 6.6 },
  { id: 'sweet-potato', name: 'Batata-doce cozida', portion: '100 g', kcal: 77, protein: 0.6, carbs: 18.4, fat: 0.1 },
  { id: 'beef', name: 'Patinho grelhado', portion: '100 g', kcal: 219, protein: 35.9, carbs: 0, fat: 7.3 },
  { id: 'apple', name: 'Maçã com casca', portion: '1 un (130 g)', kcal: 82, protein: 0.4, carbs: 21.7, fat: 0.3 },
  { id: 'yogurt', name: 'Iogurte natural', portion: '170 g', kcal: 87, protein: 6.8, carbs: 9.8, fat: 2.6 },
]

export const workouts: Record<Goal, { title: string; subtitle: string; days: { name: string; focus: string; exercises: string[] }[] }> = {
  perder: { title: 'Condicionamento total', subtitle: '3× por semana · 35–45 min', days: [
    { name: 'Treino A', focus: 'Corpo inteiro', exercises: ['Agachamento — 3×12', 'Flexão inclinada — 3×10', 'Remada unilateral — 3×12', 'Prancha — 3×30s', 'Caminhada rápida — 15 min'] },
    { name: 'Treino B', focus: 'Cardio & core', exercises: ['Avanço alternado — 3×10', 'Desenvolvimento — 3×12', 'Elevação pélvica — 3×15', 'Dead bug — 3×10', 'Bike intervalada — 15 min'] },
    { name: 'Treino C', focus: 'Corpo inteiro', exercises: ['Levantamento romeno — 3×12', 'Puxada frontal — 3×12', 'Step-up — 3×10', 'Prancha lateral — 3×25s', 'Caminhada inclinada — 15 min'] },
  ]},
  manter: { title: 'Equilíbrio & mobilidade', subtitle: '3× por semana · 40–50 min', days: [
    { name: 'Treino A', focus: 'Superiores', exercises: ['Supino com halteres — 3×10', 'Remada sentada — 3×10', 'Desenvolvimento — 3×12', 'Rosca direta — 2×12', 'Tríceps corda — 2×12'] },
    { name: 'Treino B', focus: 'Inferiores', exercises: ['Agachamento — 3×10', 'Levantamento romeno — 3×10', 'Avanço — 3×10', 'Panturrilha — 3×15', 'Prancha — 3×40s'] },
    { name: 'Treino C', focus: 'Corpo inteiro', exercises: ['Leg press — 3×12', 'Flexão — 3×máx.', 'Puxada frontal — 3×12', 'Elevação pélvica — 3×15', 'Cardio leve — 15 min'] },
  ]},
  ganhar: { title: 'Hipertrofia essencial', subtitle: '4× por semana · 50–60 min', days: [
    { name: 'Treino A', focus: 'Peito & tríceps', exercises: ['Supino reto — 4×8–10', 'Supino inclinado — 3×10', 'Crucifixo — 3×12', 'Tríceps corda — 3×12'] },
    { name: 'Treino B', focus: 'Costas & bíceps', exercises: ['Puxada frontal — 4×8–10', 'Remada curvada — 3×10', 'Remada baixa — 3×12', 'Rosca direta — 3×12'] },
    { name: 'Treino C', focus: 'Pernas', exercises: ['Agachamento — 4×8–10', 'Leg press — 3×10', 'Levantamento romeno — 3×10', 'Panturrilha — 4×15'] },
    { name: 'Treino D', focus: 'Ombros & core', exercises: ['Desenvolvimento — 4×10', 'Elevação lateral — 3×12', 'Face pull — 3×15', 'Prancha — 3×45s'] },
  ]},
}
