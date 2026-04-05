import { useState, useEffect } from 'react'
import GoalScreen from '../../components/battle/GoalScreen'
import MatchingScreen from '../../components/battle/MatchingScreen'
import CreateRoomScreen from '../../components/battle/CreateRoomScreen'
import JoinRoomScreen from '../../components/battle/JoinRoomScreen'
import FreeMatchScreen from '../../components/battle/FreeMatchScreen'
import RoomWaitingScreen from '../../components/battle/RoomWaitingScreen'
import FightScreen from '../../components/battle/FightScreen'
import FinishScreen from '../../components/battle/FinishScreen'

export default function BattleTab({ onHideTabBar, initialPhase = 'goal' }) {
  const [phase, setPhase]   = useState(initialPhase)
  const [goal, setGoal]     = useState('')
  const [room, setRoom]     = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => { setPhase(initialPhase) }, [initialPhase])

  useEffect(() => {
    const hide = ['matching', 'fighting', 'create_room', 'join_room', 'free_match', 'room_waiting'].includes(phase)
    onHideTabBar?.(hide)
  }, [phase])

  function goBack() { setPhase('goal'); setRoom(null); setResult(null) }

  if (phase === 'goal') return (
    <GoalScreen
      onStart={(g)        => { setGoal(g); setPhase('matching') }}
      onTestStart={(g, r) => { setGoal(g); setRoom(r); setPhase('fighting') }}
      onCreateRoom={(g)   => { setGoal(g); setPhase('create_room') }}
      onJoinRoom={(g)     => { setGoal(g); setPhase('join_room') }}
      onFreeMatch={(g)    => { setGoal(g); setPhase('free_match') }}
    />
  )

  if (phase === 'matching') return (
    <MatchingScreen
      goal={goal}
      onMatched={(r) => { setRoom(r); setPhase('fighting') }}
      onCancel={goBack}
    />
  )

  if (phase === 'create_room') return (
    <CreateRoomScreen
      goal={goal}
      onMatched={(r) => { setRoom(r); setPhase('room_waiting') }}
      onCancel={goBack}
    />
  )

  if (phase === 'join_room') return (
    <JoinRoomScreen
      goal={goal}
      onMatched={(r) => { setRoom(r); setPhase('room_waiting') }}
      onCancel={goBack}
    />
  )

  if (phase === 'free_match') return (
    <FreeMatchScreen
      goal={goal}
      onJoinRoom={(r) => { setRoom(r); setPhase('room_waiting') }}
      onCancel={goBack}
    />
  )

  if (phase === 'room_waiting') return (
    <RoomWaitingScreen
      room={room}
      onStart={() => setPhase('fighting')}
      onCancel={goBack}
    />
  )

  if (phase === 'fighting') return (
    <FightScreen
      room={room}
      goal={goal}
      onFinish={(res) => { setResult(res); setPhase('finish') }}
    />
  )

  if (phase === 'finish') return (
    <FinishScreen
      result={result}
      room={room}
      onBack={goBack}
    />
  )
}
