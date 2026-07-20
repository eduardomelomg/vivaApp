import type { PlantStage, PlantState } from './plant'

const stageOrder: PlantStage[] = ['semente', 'broto', 'muda', 'adulta', 'florida', 'arvore']

export function PlantCompanion({ state, size = 'medium' }: { state: PlantState; size?: 'small' | 'medium' | 'large' }) {
  let visibleStage = state.stage
  if (state.health === 'recuperando') visibleStage = state.recoveryDays <= 1 ? 'broto' : state.recoveryDays < 4 ? 'muda' : state.stage
  const stage = stageOrder.indexOf(visibleStage)
  const isTree = visibleStage === 'arvore'
  const isDead = state.health === 'sem_vida'

  return <div className={`plant-companion ${size} health-${state.health} stage-${visibleStage}`} role="img" aria-label={`Planta ${state.label.toLowerCase()}`}>
    <svg viewBox="0 0 120 140" aria-hidden="true">
      <ellipse className="plant-shadow" cx="60" cy="127" rx="34" ry="7"/>
      {visibleStage === 'semente' && <><path className="soil" d="M36 112c7-15 41-15 48 0Z"/><ellipse className="seed" cx="60" cy="105" rx="8" ry="5" transform="rotate(-18 60 105)"/></>}
      {visibleStage !== 'semente' && <>
        <path className="pot-rim" d="M30 103h60l-5 13H35Z"/>
        <path className="pot" d="m36 113 5 20h38l5-20Z"/>
        <path className="pot-light" d="M44 116h7l2 13h-6Z"/>
        <g className={`plant-body ${isDead ? 'dead' : ''}`}>
          {isTree ? <>
            <path className="trunk" d="M54 108c4-25 2-51 7-75 7 26 3 50 7 75Z"/>
            <path className="branch" d="M60 69 42 49M64 62l17-20M60 84 42 71M65 82l18-12"/>
            <g className="tree-crown"><circle cx="42" cy="46" r="22"/><circle cx="66" cy="34" r="27"/><circle cx="84" cy="54" r="22"/><circle cx="59" cy="61" r="28"/></g>
            {state.health === 'saudavel' && <g className="fruit"><circle cx="43" cy="44" r="3"/><circle cx="76" cy="46" r="3"/><circle cx="60" cy="65" r="3"/></g>}
          </> : <>
            <path className="stem" d={`M60 106C${state.health === 'murchando' || state.health === 'seca' || isDead ? '58 82 70 64' : '59 83 60 58'} ${stage >= 3 ? '61 36' : stage >= 2 ? '61 48' : '60 73'}`}/>
            {stage >= 1 && <path className="leaf leaf-one" d="M59 82C46 68 34 72 35 83c8 7 16 7 24-1Z"/>}
            {stage >= 2 && <path className="leaf leaf-two" d="M61 69c11-14 24-11 24 0-7 8-16 9-24 0Z"/>}
            {stage >= 3 && <><path className="leaf leaf-three" d="M60 55C45 40 34 46 37 58c8 7 16 6 23-3Z"/><path className="leaf leaf-four" d="M62 45c9-15 23-13 25-2-6 9-15 11-25 2Z"/></>}
            {stage >= 4 && <g className="flower"><circle cx="61" cy="31" r="6"/><circle cx="53" cy="35" r="6"/><circle cx="56" cy="26" r="6"/><circle cx="66" cy="25" r="6"/><circle cx="70" cy="34" r="6"/><circle className="flower-center" cx="61" cy="31" r="5"/></g>}
          </>}
        </g>
      </>}
    </svg>
  </div>
}
