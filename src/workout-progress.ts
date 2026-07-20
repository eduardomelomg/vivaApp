import type { GeneratedExercise } from './workout-engine'
import type { WorkoutExerciseLog, WorkoutSession, WorkoutSetLog } from './types'

export interface ExerciseHistory {
  date: string
  log: WorkoutExerciseLog
  lastWeight?: number
  suggestedWeight?: number
  effortRating?: WorkoutSession['effortRating']
}

function prescriptionDetails(prescription: string) {
  const count = Math.max(1, Number(prescription.match(/^(\d+)\s*(?:×|x|voltas)/i)?.[1] || 1))
  const unit: WorkoutSetLog['unit'] = /min/i.test(prescription) ? 'min' : /\d+s|seg/i.test(prescription) ? 'seg' : 'reps'
  const suggested = Number(prescription.match(/(?:×|x)\s*(\d+)/i)?.[1] || prescription.match(/^(\d+)(?=[–-])/i)?.[1] || (unit === 'min' ? 10 : unit === 'seg' ? 30 : 10))
  const range = prescription.match(/(?:×|x)\s*(\d+)\s*[–-]\s*(\d+)/i)
  return { count, unit, suggested, targetMax: Number(range?.[2] || suggested) }
}

export function findExerciseHistory(sessions: WorkoutSession[], exerciseName: string): ExerciseHistory | undefined {
  const ordered = [...sessions].reverse().sort((a, b) => b.date.localeCompare(a.date))
  for (const session of ordered) {
    const log = session.exerciseLogs?.find(item => item.exerciseName === exerciseName)
    if (!log) continue
    const weights = log.sets.map(set => set.weight).filter((weight): weight is number => typeof weight === 'number' && weight > 0)
    const lastWeight = weights.length ? Math.max(...weights) : undefined
    const { targetMax } = prescriptionDetails(`${log.sets.length}× ${Math.max(0, ...log.sets.map(set => set.value))}`)
    const reachedTarget = log.sets.length > 0 && log.sets.every(set => set.completed && set.unit === 'reps' && set.value >= targetMax)
    const factor = session.effortRating === 'facil' ? 1.05 : session.effortRating === 'dificil' ? .95 : 1.025
    const shouldAdjust = session.effortRating === 'dificil' || reachedTarget
    const suggestedWeight = lastWeight && shouldAdjust ? Math.max(.5, Math.round(lastWeight * factor * 2) / 2) : lastWeight
    return { date: session.date, log, lastWeight, suggestedWeight, effortRating: session.effortRating }
  }
  return undefined
}

export function createExerciseLog(exercise: GeneratedExercise, history?: ExerciseHistory): WorkoutExerciseLog {
  const { count, unit, suggested, targetMax } = prescriptionDetails(exercise.prescription)
  const previous = history?.log.sets || []
  const reachedTarget = previous.length > 0 && previous.every(set => set.completed && set.unit === 'reps' && set.value >= targetMax)
  return {
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    sets: Array.from({ length: count }, (_, index) => {
      const old = previous[Math.min(index, Math.max(0, previous.length - 1))]
      const oldWeight = old?.weight
      const factor = history?.effortRating === 'facil' ? 1.05 : history?.effortRating === 'dificil' ? .95 : 1.025
      const shouldAdjust = history?.effortRating === 'dificil' || reachedTarget
      const weight = oldWeight && shouldAdjust ? Math.max(.5, Math.round(oldWeight * factor * 2) / 2) : oldWeight
      return { set: index + 1, value: old?.unit === unit ? old.value : suggested, unit, weight, completed: false }
    }),
  }
}

export function sessionVolume(session: WorkoutSession) {
  return Math.round((session.exerciseLogs || []).reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + (set.completed ? set.value * (set.weight || 0) : 0), 0), 0))
}

export function completedSessionSets(session: WorkoutSession) {
  return (session.exerciseLogs || []).reduce((total, exercise) => total + exercise.sets.filter(set => set.completed).length, 0)
}

export function workoutRecords(sessions: WorkoutSession[]) {
  const weights = sessions.flatMap(session => session.exerciseLogs || []).flatMap(exercise => exercise.sets).map(set => set.weight || 0)
  const volumes = sessions.map(sessionVolume)
  const durations = sessions.map(session => session.durationSeconds || 0)
  return {
    maxWeight: Math.max(0, ...weights),
    maxVolume: Math.max(0, ...volumes),
    longestDuration: Math.max(0, ...durations),
  }
}
