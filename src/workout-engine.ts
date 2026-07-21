import type { Equipment, FitnessLevel, Goal, Profile } from './types'

export interface GeneratedExercise {
  id: string
  name: string
  alternatives?: string[]
  prescription: string
  rest: string
  instruction: string
}

export interface GeneratedWorkout {
  id: string
  name: string
  focus: string
  duration: number
  exercises: GeneratedExercise[]
}

export interface GeneratedPlan {
  title: string
  summary: string
  progression: string
  levelLabel: string
  effort: string
  sessionStructure?: string
  workouts: GeneratedWorkout[]
}

const exerciseNames: Record<Equipment, Record<string, string>> = {
  casa: {
    squat: 'Agachamento livre', hinge: 'Bom dia sem carga', push: 'Flexão inclinada', pull: 'Remada com mochila', lunge: 'Avanço assistido', shoulder: 'Flexão pike', glute: 'Elevação pélvica', core: 'Prancha frontal', cardio: 'Polichinelo', calf: 'Panturrilha em pé', arm: 'Rosca com mochila', triceps: 'Tríceps no banco', step: 'Subida no degrau', deadbug: 'Dead bug', lateral: 'Elevação lateral com garrafas', row: 'Remada com mochila', chest: 'Flexão de braços', pulldown: 'Pullover com mochila', legpress: 'Agachamento com pausa', hamstring: 'Flexão nórdica assistida', facepull: 'Crucifixo inverso com garrafas', carry: 'Caminhada com sacolas', cardioLong: 'Caminhada rápida', wallSit: 'Cadeira na parede', sidePlank: 'Prancha lateral', squatHold: 'Agachamento isométrico', bridgeHold: 'Ponte isométrica', hiit: 'Finisher: corrida alta + squat thrust',
  },
  halteres: {
    squat: 'Agachamento goblet', hinge: 'Levantamento romeno com halteres', push: 'Supino no chão com halteres', pull: 'Remada unilateral', lunge: 'Avanço com halteres', shoulder: 'Desenvolvimento com halteres', glute: 'Elevação pélvica com halter', core: 'Prancha frontal', cardio: 'Mountain climber', calf: 'Panturrilha com halteres', arm: 'Rosca alternada', triceps: 'Tríceps francês', step: 'Step-up com halteres', deadbug: 'Dead bug', lateral: 'Elevação lateral', row: 'Remada curvada com halteres', chest: 'Supino no chão com halteres', pulldown: 'Pullover com halter', legpress: 'Agachamento búlgaro', hamstring: 'Levantamento romeno', facepull: 'Crucifixo inverso', carry: 'Caminhada do fazendeiro', cardioLong: 'Caminhada ou bicicleta', wallSit: 'Cadeira na parede com halter', sidePlank: 'Prancha lateral', squatHold: 'Agachamento goblet isométrico', bridgeHold: 'Ponte isométrica com halter', hiit: 'Finisher: mountain climber + polichinelo',
  },
  academia_basica: {
    squat: 'Agachamento goblet', hinge: 'Levantamento romeno com halteres', push: 'Supino com halteres', pull: 'Remada unilateral no banco', lunge: 'Avanço com halteres', shoulder: 'Desenvolvimento com halteres', glute: 'Elevação pélvica no banco', core: 'Prancha frontal', cardio: 'Corda ou polichinelo', calf: 'Panturrilha com halteres', arm: 'Rosca direta com barra', triceps: 'Tríceps francês', step: 'Step-up no banco', deadbug: 'Dead bug', lateral: 'Elevação lateral', row: 'Remada curvada com barra', chest: 'Supino reto com barra', pulldown: 'Remada invertida na barra', legpress: 'Agachamento búlgaro', hamstring: 'Levantamento romeno', facepull: 'Crucifixo inverso', carry: 'Caminhada do fazendeiro', cardioLong: 'Caminhada rápida ou corda', wallSit: 'Cadeira na parede', sidePlank: 'Prancha lateral', squatHold: 'Agachamento isométrico', bridgeHold: 'Ponte isométrica', hiit: 'Circuito intervalado',
  },
  academia: {
    squat: 'Agachamento no smith', hinge: 'Levantamento romeno', push: 'Supino máquina', pull: 'Remada sentada', lunge: 'Avanço com halteres', shoulder: 'Desenvolvimento máquina', glute: 'Elevação pélvica', core: 'Prancha frontal', cardio: 'Bicicleta ergométrica', calf: 'Panturrilha máquina', arm: 'Rosca direta', triceps: 'Tríceps na polia', step: 'Step-up', deadbug: 'Dead bug', lateral: 'Elevação lateral', row: 'Remada baixa', chest: 'Supino reto', pulldown: 'Puxada frontal', legpress: 'Leg press', hamstring: 'Mesa flexora', facepull: 'Face pull', carry: 'Caminhada do fazendeiro', cardioLong: 'Esteira ou bicicleta', wallSit: 'Cadeira isométrica', sidePlank: 'Prancha lateral', squatHold: 'Agachamento isométrico', bridgeHold: 'Ponte isométrica', hiit: 'HIIT na bicicleta',
  },
}

const exerciseAlternatives: Record<Equipment, Record<string, string[]>> = {
  casa: {
    squat: ['Agachamento com pausa', 'Agachamento sumô'], lunge: ['Afundo reverso assistido', 'Agachamento dividido'], hinge: ['Bom dia com mochila', 'Inclinação de quadril na parede'], glute: ['Ponte unilateral', 'Elevação pélvica com pausa'], hamstring: ['Ponte com pés afastados', 'Flexão de joelho deslizando'], calf: ['Panturrilha unilateral', 'Panturrilha no degrau'], chest: ['Flexão com joelhos apoiados', 'Flexão na parede'], push: ['Flexão na parede', 'Flexão com joelhos apoiados'], shoulder: ['Desenvolvimento com garrafas', 'Elevação frontal com garrafas'], lateral: ['Elevação lateral isométrica', 'Elevação lateral unilateral'], triceps: ['Tríceps testa com garrafa', 'Flexão fechada apoiada'], row: ['Remada com toalha isométrica', 'Remada unilateral com mochila'], pull: ['Pullover com mochila', 'Remada isométrica com toalha'], arm: ['Rosca isométrica com toalha', 'Rosca unilateral com mochila'], core: ['Prancha com joelhos apoiados', 'Abdominal curto'], sidePlank: ['Prancha lateral com joelho apoiado', 'Prancha lateral dinâmica'], deadbug: ['Bird dog', 'Abdominal alternado'], wallSit: ['Agachamento isométrico', 'Cadeira com apoio'], bridgeHold: ['Ponte unilateral isométrica', 'Ponte com pausa'], step: ['Avanço alternado', 'Subida em degrau baixo'], facepull: ['Crucifixo inverso inclinado', 'Remada alta com garrafas'], cardio: ['Marcha acelerada', 'Polichinelo sem salto'], cardioLong: ['Marcha contínua', 'Subida alternada no degrau'], hiit: ['Finisher: marcha alta + agachamento', 'Finisher: escalador baixo impacto'],
  },
  halteres: {
    squat: ['Agachamento sumô com halter', 'Agachamento com dois halteres'], lunge: ['Afundo reverso com halteres', 'Agachamento búlgaro'], hinge: ['Stiff com halteres', 'Levantamento romeno unilateral'], glute: ['Ponte com halter', 'Elevação pélvica unilateral'], hamstring: ['Stiff com halteres', 'Flexão nórdica assistida'], calf: ['Panturrilha unilateral com halter', 'Panturrilha sentado com halter'], chest: ['Supino inclinado com halteres', 'Flexão de braços'], push: ['Flexão de braços', 'Supino unilateral no chão'], shoulder: ['Desenvolvimento Arnold', 'Desenvolvimento unilateral'], lateral: ['Elevação lateral unilateral', 'Elevação frontal'], triceps: ['Tríceps testa com halteres', 'Coice de tríceps'], row: ['Remada unilateral apoiada', 'Remada serrote'], pull: ['Remada curvada', 'Pullover com halter'], arm: ['Rosca martelo', 'Rosca concentrada'], core: ['Prancha com toque no ombro', 'Abdominal curto'], sidePlank: ['Prancha lateral dinâmica', 'Prancha lateral apoiada'], deadbug: ['Bird dog', 'Dead bug com halter'], wallSit: ['Agachamento isométrico com halter', 'Agachamento com pausa'], bridgeHold: ['Ponte unilateral isométrica', 'Ponte com halter'], step: ['Avanço com halteres', 'Agachamento búlgaro'], facepull: ['Crucifixo inverso inclinado', 'Remada alta com halteres'], cardio: ['Mountain climber baixo impacto', 'Polichinelo sem salto'], cardioLong: ['Caminhada rápida', 'Circuito contínuo com halteres'], hiit: ['Finisher: agachamento + desenvolvimento', 'Finisher: mountain climber baixo impacto'],
  },
  academia_basica: {
    squat: ['Agachamento com barra', 'Agachamento sumô com halter'], legpress: ['Agachamento frontal', 'Agachamento búlgaro'], lunge: ['Afundo reverso com halteres', 'Step-up no banco'], hinge: ['Stiff com barra', 'Levantamento romeno com halteres'], hamstring: ['Stiff com halteres', 'Flexão nórdica assistida'], glute: ['Elevação pélvica com barra', 'Ponte com halter'], calf: ['Panturrilha em pé com halteres', 'Panturrilha unilateral'], chest: ['Supino inclinado com halteres', 'Flexão de braços'], push: ['Supino no chão com halteres', 'Flexão de braços'], shoulder: ['Desenvolvimento Arnold', 'Desenvolvimento com barra'], lateral: ['Elevação lateral unilateral', 'Elevação frontal'], triceps: ['Tríceps testa com barra', 'Tríceps coice'], pulldown: ['Pullover com halter', 'Remada invertida'], row: ['Remada unilateral', 'Remada cavalinho com barra'], pull: ['Remada curvada com barra', 'Remada invertida'], facepull: ['Crucifixo inverso inclinado', 'Remada alta'], arm: ['Rosca martelo', 'Rosca alternada'], core: ['Prancha com toque no ombro', 'Abdominal curto'], sidePlank: ['Prancha lateral dinâmica', 'Prancha lateral apoiada'], deadbug: ['Bird dog', 'Abdominal alternado'], carry: ['Caminhada unilateral com halter', 'Sustentação isométrica com halteres'], cardio: ['Corda intervalada', 'Polichinelo sem salto'], cardioLong: ['Caminhada rápida', 'Corda em ritmo leve'], bridgeHold: ['Elevação pélvica isométrica', 'Ponte unilateral'],
  },
  academia: {
    squat: ['Hack squat', 'Agachamento livre'], legpress: ['Hack squat', 'Agachamento goblet'], lunge: ['Afundo no smith', 'Step-up com halteres'], hinge: ['Stiff com barra', 'Levantamento romeno com halteres'], hamstring: ['Cadeira flexora', 'Stiff com halteres'], glute: ['Glúteo no cabo', 'Elevação pélvica no smith'], calf: ['Panturrilha no leg press', 'Panturrilha sentado'], chest: ['Supino inclinado com halteres', 'Crossover na polia'], push: ['Chest press', 'Supino com halteres'], shoulder: ['Desenvolvimento com halteres', 'Desenvolvimento Arnold'], lateral: ['Elevação lateral na polia', 'Elevação lateral unilateral'], triceps: ['Tríceps francês na polia', 'Tríceps testa'], pulldown: ['Puxada neutra', 'Puxada articulada'], row: ['Remada unilateral máquina', 'Remada cavalinho'], pull: ['Remada curvada', 'Remada articulada'], facepull: ['Crucifixo inverso máquina', 'Remada alta na polia'], arm: ['Rosca martelo', 'Rosca Scott'], core: ['Abdominal na polia', 'Prancha com toque no ombro'], sidePlank: ['Prancha lateral dinâmica', 'Prancha lateral apoiada'], deadbug: ['Bird dog', 'Abdominal máquina'], carry: ['Caminhada unilateral com halter', 'Sustentação isométrica'], cardio: ['Elíptico intervalado', 'Esteira inclinada intervalada'], cardioLong: ['Esteira inclinada', 'Elíptico'], bridgeHold: ['Elevação pélvica isométrica', 'Ponte unilateral'],
  },
}

interface SplitTemplate { focus: string; keys: string[] }

const gymSplits: Record<number, SplitTemplate[]> = {
  2: [
    { focus: 'Superiores', keys: ['chest', 'pulldown', 'shoulder', 'row', 'arm', 'triceps'] },
    { focus: 'Pernas e glúteos', keys: ['squat', 'legpress', 'hinge', 'hamstring', 'glute', 'calf'] },
  ],
  3: [
    { focus: 'Peito, ombros e tríceps', keys: ['chest', 'push', 'shoulder', 'lateral', 'triceps'] },
    { focus: 'Costas e bíceps', keys: ['pulldown', 'row', 'pull', 'facepull', 'arm'] },
    { focus: 'Pernas e glúteos', keys: ['squat', 'legpress', 'hinge', 'hamstring', 'glute', 'calf'] },
  ],
  4: [
    { focus: 'Peito e tríceps', keys: ['chest', 'push', 'triceps', 'shoulder', 'core'] },
    { focus: 'Costas e bíceps', keys: ['pulldown', 'row', 'pull', 'facepull', 'arm'] },
    { focus: 'Pernas e glúteos', keys: ['squat', 'legpress', 'hinge', 'hamstring', 'glute', 'calf'] },
    { focus: 'Ombros e core', keys: ['shoulder', 'lateral', 'facepull', 'core', 'sidePlank'] },
  ],
  5: [
    { focus: 'Peito', keys: ['chest', 'push', 'shoulder', 'triceps', 'core'] },
    { focus: 'Costas', keys: ['pulldown', 'row', 'pull', 'facepull', 'carry'] },
    { focus: 'Pernas e glúteos', keys: ['squat', 'legpress', 'hinge', 'hamstring', 'glute', 'calf'] },
    { focus: 'Ombros', keys: ['shoulder', 'lateral', 'facepull', 'carry', 'core'] },
    { focus: 'Bíceps, tríceps e core', keys: ['arm', 'triceps', 'pull', 'push', 'deadbug', 'sidePlank'] },
  ],
  6: [
    { focus: 'Peito, ombros e tríceps I', keys: ['chest', 'shoulder', 'lateral', 'triceps', 'core'] },
    { focus: 'Costas e bíceps I', keys: ['pulldown', 'row', 'facepull', 'arm', 'carry'] },
    { focus: 'Pernas e glúteos I', keys: ['squat', 'legpress', 'hamstring', 'glute', 'calf'] },
    { focus: 'Peito, ombros e tríceps II', keys: ['push', 'shoulder', 'lateral', 'triceps', 'deadbug'] },
    { focus: 'Costas e bíceps II', keys: ['pull', 'row', 'pulldown', 'facepull', 'arm'] },
    { focus: 'Pernas e glúteos II', keys: ['hinge', 'lunge', 'step', 'hamstring', 'glute', 'calf'] },
  ],
  7: [
    { focus: 'Peito', keys: ['chest', 'push', 'triceps', 'core'] },
    { focus: 'Costas', keys: ['pulldown', 'row', 'pull', 'carry'] },
    { focus: 'Quadríceps e panturrilhas', keys: ['squat', 'legpress', 'lunge', 'step', 'calf'] },
    { focus: 'Posteriores e glúteos', keys: ['hinge', 'hamstring', 'glute', 'bridgeHold', 'calf'] },
    { focus: 'Ombros', keys: ['shoulder', 'lateral', 'facepull', 'core'] },
    { focus: 'Bíceps e tríceps', keys: ['arm', 'triceps', 'pull', 'push', 'carry'] },
    { focus: 'Core e condicionamento', keys: ['core', 'deadbug', 'sidePlank', 'cardioLong'] },
  ],
}

const homeSplits: Record<number, SplitTemplate[]> = {
  2: [
    { focus: 'Pernas e glúteos', keys: ['squat', 'lunge', 'glute', 'wallSit', 'hiit'] },
    { focus: 'Superiores e core', keys: ['chest', 'row', 'shoulder', 'core', 'hiit'] },
  ],
  3: [
    { focus: 'Pernas e glúteos', keys: ['squat', 'lunge', 'glute', 'wallSit', 'hiit'] },
    { focus: 'Peito, ombros e tríceps', keys: ['chest', 'push', 'shoulder', 'triceps', 'hiit'] },
    { focus: 'Costas, bíceps e core', keys: ['row', 'pull', 'arm', 'core', 'hiit'] },
  ],
  4: [
    { focus: 'Quadríceps', keys: ['squat', 'lunge', 'step', 'wallSit', 'hiit'] },
    { focus: 'Peito e tríceps', keys: ['chest', 'push', 'triceps', 'core', 'hiit'] },
    { focus: 'Posteriores e glúteos', keys: ['hinge', 'glute', 'bridgeHold', 'hamstring', 'hiit'] },
    { focus: 'Costas, ombros e core', keys: ['row', 'pull', 'shoulder', 'sidePlank', 'hiit'] },
  ],
  5: [
    { focus: 'Quadríceps', keys: ['squat', 'lunge', 'step', 'wallSit', 'hiit'] },
    { focus: 'Peito e tríceps', keys: ['chest', 'push', 'triceps', 'core', 'hiit'] },
    { focus: 'Posteriores e glúteos', keys: ['hinge', 'glute', 'bridgeHold', 'hamstring', 'hiit'] },
    { focus: 'Costas e bíceps', keys: ['row', 'pull', 'arm', 'facepull', 'hiit'] },
    { focus: 'Ombros e core', keys: ['shoulder', 'lateral', 'core', 'sidePlank', 'hiit'] },
  ],
  6: [
    { focus: 'Peito e tríceps', keys: ['chest', 'push', 'triceps', 'core', 'hiit'] },
    { focus: 'Costas e bíceps', keys: ['row', 'pull', 'arm', 'facepull', 'hiit'] },
    { focus: 'Pernas e glúteos', keys: ['squat', 'lunge', 'glute', 'wallSit', 'hiit'] },
    { focus: 'Ombros e tríceps', keys: ['shoulder', 'lateral', 'triceps', 'sidePlank', 'hiit'] },
    { focus: 'Costas e bíceps II', keys: ['pull', 'row', 'arm', 'deadbug', 'cardio'] },
    { focus: 'Posteriores e glúteos', keys: ['hinge', 'hamstring', 'bridgeHold', 'calf', 'cardio'] },
  ],
  7: [
    { focus: 'Peito', keys: ['chest', 'push', 'triceps', 'core', 'hiit'] },
    { focus: 'Costas', keys: ['row', 'pull', 'facepull', 'deadbug', 'hiit'] },
    { focus: 'Quadríceps', keys: ['squat', 'lunge', 'step', 'wallSit', 'hiit'] },
    { focus: 'Posteriores e glúteos', keys: ['hinge', 'hamstring', 'glute', 'bridgeHold', 'hiit'] },
    { focus: 'Ombros', keys: ['shoulder', 'lateral', 'push', 'sidePlank', 'hiit'] },
    { focus: 'Braços e core', keys: ['arm', 'triceps', 'core', 'deadbug', 'cardio'] },
    { focus: 'Core e condicionamento', keys: ['core', 'sidePlank', 'deadbug', 'cardioLong'] },
  ],
}

function prescription(level: FitnessLevel, goal: Goal, key: string, home = false) {
  if (home && key !== 'hiit') {
    if (level === 'iniciante') return '3 voltas · 30s ativo / 15s troca'
    if (level === 'intermediario') return '3 voltas · 35s ativo / 15s troca'
    return '4 voltas · 40s ativo / 10s troca'
  }
  if (key === 'cardioLong') return goal === 'perder' ? '15–20 min' : '10–15 min'
  if (key === 'cardio') return level === 'iniciante' ? '6× 30s leve / 30s pausa' : '10× 30s forte / 30s leve'
  if (key === 'hiit') return level === 'iniciante' ? '4× 30s forte / 30s pausa' : level === 'intermediario' ? '6× 40s forte / 20s pausa' : '8× 45s forte / 15s pausa'
  if (['core', 'deadbug', 'wallSit', 'sidePlank', 'squatHold', 'bridgeHold'].includes(key)) return level === 'iniciante' ? '2× 20–30s' : '3× 30–45s'
  const sets = level === 'iniciante' ? 2 : level === 'intermediario' ? 3 : 4
  const reps = goal === 'ganhar' ? '8–12' : '10–15'
  return `${sets}× ${reps}`
}

const lowImpactNames: Record<string, string> = {
  hiit: 'Caminhada rápida ou marcha no lugar',
  cardio: 'Cardio leve contínuo (marcha ou bicicleta suave)',
  cardioLong: 'Caminhada tranquila',
}

export function generateWorkoutPlan(profile: Profile, opts: { lowImpact?: boolean } = {}): GeneratedPlan {
  const lowImpact = opts.lowImpact === true
  const place = profile.trainingPlace || (profile.equipment === 'casa' || profile.equipment === 'halteres' ? 'casa' : 'academia')
  const equipment: Equipment = place === 'casa'
    ? (profile.homeSetup === 'halteres' ? 'halteres' : 'casa')
    : (profile.gymType === 'bairro' ? 'academia_basica' : 'academia')
  const level = profile.fitnessLevel || 'iniciante'
  const days = Math.min(7, Math.max(2, profile.trainingDays || 3))
  const names = exerciseNames[equipment]
  const homeDuration = level === 'iniciante' ? 20 : level === 'intermediario' ? 25 : 30
  const duration = place === 'casa' ? homeDuration : (profile.sessionMinutes || 45)
  const levelLabel = lowImpact ? 'Baixo impacto · no seu ritmo' : level === 'iniciante' ? 'Nível 1 · Base intensa' : level === 'intermediario' ? 'Nível 2 · Ritmo forte' : 'Nível 3 · Alta performance'
  const effort = lowImpact ? 'RPE 3–4/10 · leve' : level === 'iniciante' ? 'RPE 7–8/10' : level === 'intermediario' ? 'RPE 8/10' : 'RPE 8–9/10'
  const selected = (place === 'casa' ? homeSplits : gymSplits)[days]
  const isCardioKey = (key: string) => key === 'hiit' || key.startsWith('cardio')

  return {
    title: lowImpact ? 'Treino de baixo impacto' : place === 'casa' ? 'Treino dividido em casa' : profile.goal === 'ganhar' ? 'Hipertrofia por grupos musculares' : 'Treino dividido por grupos musculares',
    summary: lowImpact
      ? `${days} dias por semana · ${duration} min · sem HIIT · ritmo controlado e seguro`
      : `${days} dias por semana · ${duration} min · ${levelLabel} · divisão muscular · ${place === 'casa' ? 'HIIT e isometrias' : profile.gymType === 'bairro' ? 'estrutura básica' : 'estrutura completa'}`,
    progression: lowImpact
      ? 'Alternativa segura enquanto o HIIT não é liberado. Priorize amplitude confortável e respiração tranquila; procure avaliação médica antes de retomar o alta intensidade.'
      : place === 'casa'
        ? (level === 'iniciante' ? 'Complete pelo menos 8 sessões no Nível 1 antes de avançar. Mantenha esforço 7–8/10 e preserve a execução.' : level === 'intermediario' ? 'Avance depois de 8 sessões concluídas sem sintomas e com recuperação adequada.' : 'Mantenha esforço 8–9/10; esforço máximo não é necessário para validar a sessão.')
        : (level === 'iniciante' ? 'Nas 2 primeiras semanas, priorize técnica. Quando concluir todas as repetições com facilidade, aumente a carga mínima disponível.' : 'Ao atingir o topo das repetições em todas as séries, aumente 2–5% da carga na sessão seguinte.'),
    levelLabel,
    effort,
    sessionStructure: lowImpact ? '5 min aquecimento · 15 min ritmo leve · 5 min desaceleração' : place === 'casa' ? (level === 'iniciante' ? '4 min aquecimento · 9 min circuito · 4 min finisher · 3 min desaceleração' : level === 'intermediario' ? '5 min aquecimento · 10 min circuito · 6 min finisher · 4 min desaceleração' : '5 min aquecimento · 13 min circuito · 8 min finisher · 4 min desaceleração') : undefined,
    workouts: selected.map((template, index) => ({
      id: `split-${equipment}-${days}-day-${index}${lowImpact ? '-li' : ''}`,
      name: `Dia ${index + 1}`,
      focus: template.focus,
      duration,
      exercises: template.keys.map((key, exerciseIndex) => ({
        id: `${index}-${key}`,
        name: lowImpact && lowImpactNames[key] ? lowImpactNames[key] : names[key],
        alternatives: lowImpact && isCardioKey(key) ? [] : exerciseAlternatives[equipment][key] || [],
        prescription: lowImpact && isCardioKey(key) ? '5–10 min em ritmo confortável' : prescription(level, profile.goal, key, place === 'casa'),
        rest: key.startsWith('cardio') || key === 'hiit' ? 'conforme indicado' : level === 'iniciante' ? '60–90s' : '90–120s',
        instruction: exerciseIndex === 0 ? 'Faça todo o aquecimento indicado antes de começar.' : lowImpact ? 'Ritmo leve e confortável: você deve conseguir conversar durante o esforço.' : key === 'hiit' ? 'Ritmo vigoroso: poucas palavras por vez, nunca ignore sintomas.' : 'Movimento controlado, sem dor e sem prender a respiração.',
      })),
    })),
  }
}
