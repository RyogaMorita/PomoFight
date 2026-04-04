import { useState } from 'react'
import GoalScreen from '../../components/battle/GoalScreen'
import MatchingScreen from '../../components/battle/MatchingScreen'
import FightScreen from '../../components/battle/FightScreen'
import FinishScreen from '../../components/battle/FinishScreen'

// バトルの状態管理
// goal → matching → fighting → finish

export default function BattleTab() {
  const [phase, setPhase] = useState('goal') // goal | matching | fighting | finish
  const [goal, setGoal] = useState('')
  const [room, setRoom] = useState(null)
  const [result, setResult] = useState(null) // win | lose

  if (phase === 'goal') {
    return (
      <GoalScreen
        onStart={(g) => { setGoal(g); setPhase('matching') }}
        onTestStart={(g, testRoom) => { setGoal(g); setRoom(testRoom); setPhase('fighting') }}
      />
    )
  }

  if (phase === 'matching') {
    return (
      <MatchingScreen
        goal={goal}
        onMatched={(room) => { setRoom(room); setPhase('fighting') }}
        onCancel={() => setPhase('goal')}
      />
    )
  }

  if (phase === 'fighting') {
    return (
      <FightScreen
        room={room}
        goal={goal}
        onFinish={(result) => { setResult(result); setPhase('finish') }}
      />
    )
  }

  if (phase === 'finish') {
    return (
      <FinishScreen
        result={result}
        onBack={() => { setPhase('goal'); setRoom(null); setResult(null) }}
      />
    )
  }
}
