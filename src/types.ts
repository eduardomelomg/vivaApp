export type Goal = 'perder' | 'manter' | 'ganhar'
export type Sex = 'feminino' | 'masculino'
export type FitnessLevel = 'iniciante' | 'intermediario' | 'avancado'
export type Equipment = 'casa' | 'halteres' | 'academia_basica' | 'academia'
export type TrainingPlace = 'casa' | 'academia'
export type GymType = 'rede' | 'bairro'
export type HomeSetup = 'nenhum' | 'halteres'

export interface Profile {
  name: string
  avatar?: string
  weight: number
  height: number
  age: number
  sex: Sex
  activity: number
  goal: Goal
  waterMultiplier: number
  fitnessLevel: FitnessLevel
  trainingDays: number
  sessionMinutes: number
  equipment: Equipment
  trainingPlace: TrainingPlace
  gymType: GymType
  homeSetup: HomeSetup
  hiitReady: boolean
  limitations: string
}

export interface Food {
  id: string
  name: string
  portion: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  baseGrams?: number
}

export interface MealItem extends Food { entryId: string; quantity: number; grams?: number }
export interface MealTemplate { id: string; name: string; items: MealItem[]; weekdays: number[] }
export interface WaterEntry { id: string; amount: number; time: string }

export interface ActivityType { id: string; name: string; icon: string; met: number }
export interface ActivityEntry { id: string; type: string; name: string; icon: string; minutes: number; kcal: number; time: string }
export interface WeightEntry { id: string; weight: number; date: string; createdAt: string }

export interface PointsEvent {
  id: string
  date: string
  type: 'agua' | 'meta_agua' | 'refeicao' | 'treino' | 'cadastro' | 'conquista'
  label: string
  points: number
  bonus: boolean
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  rarity: 'comum' | 'raro' | 'epico' | 'lendario'
  bonus: number
  unlockedAt?: string
}

export interface WorkoutSetLog {
  set: number
  value: number
  unit: 'reps' | 'seg' | 'min'
  weight?: number
  completed: boolean
}

export interface WorkoutExerciseLog {
  exerciseId: string
  exerciseName: string
  sets: WorkoutSetLog[]
}

export interface WorkoutSession {
  id: string
  date: string
  workoutId: string
  title: string
  durationSeconds?: number
  exerciseLogs?: WorkoutExerciseLog[]
  effortRating?: 'facil' | 'ideal' | 'dificil'
  feedbackNote?: string
}

export interface ReminderPreferences {
  enabled: boolean
  minutes: number
  startHour: string
  endHour: string
  stopAtGoal: boolean
}
