import { useState, useEffect } from 'react'
import GoalScreen from '../../components/battle/GoalScreen'
import MatchingScreen from '../../components/battle/MatchingScreen'
import FightScreen from '../../components/battle/FightScreen'
import FinishScreen from '../../components/battle/FinishScreen'

export default function BattleTab({ onHideTabBar }) {
  const [phase, setPhase] = useState('goal')
  const [goal, setGoal] = useState('')
  const [room, setRoom] = useState(null)
  const [result, setResult] = useState(null)

  // タブバーの表示制御
  useEffect(() => {
    const hide = phase === 'matching' || phase === 'fighting'
    onHideTabBar?.(hide)
  }, [phase])

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
        room={room}
        onBack={() => { setPhase('goal'); setRoom(null); setResult(null) }}
      />
    )
  }
}
