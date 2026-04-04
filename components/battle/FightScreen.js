import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, AppState, Alert, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native'
import { Accelerometer } from 'expo-sensors'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const POMODORO_SECONDS = 25 * 60 // 25分
const FACE_DOWN_THRESHOLD = -0.8
const LEAVE_GRACE_SECONDS = 10 // 10秒猶予

export default function FightScreen({ room, goal, onFinish }) {
  const { session } = useAuth()
  const [timeLeft, setTimeLeft] = useState(POMODORO_SECONDS)
  const [isFaceDown, setIsFaceDown] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)
  const [leaveWarning, setLeaveWarning] = useState(0) // 離脱秒数カウント
  const [phase, setPhase] = useState('facedown') // facedown | fighting | log

  const leaveTimer = useRef(null)
  const pomodoroTimer = useRef(null)
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    setupListeners()
    return () => cleanup()
  }, [])

  function setupListeners() {
    // 加速度センサー（伏せ検知）
    Accelerometer.setUpdateInterval(500)
    const accelSub = Accelerometer.addListener(({ z }) => {
      setIsFaceDown(z < FACE_DOWN_THRESHOLD)
    })

    // アプリバックグラウンド検知
    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        startLeaveTimer()
      } else if (nextState === 'active') {
        clearLeaveTimer()
      }
      appState.current = nextState
    })

    // テストモードはリアルタイム監視不要
    if (room.isTest) {
      return () => { accelSub.remove(); appStateSub.remove() }
    }

    // 相手の離脱を監視
    const channel = supabase
      .channel(`fight-${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${room.id}`
      }, (payload) => {
        if (payload.new.player_id !== session.user.id && payload.new.status === 'left') {
          setOpponentLeft(true)
          setTimeout(() => onFinish('win'), 2000)
        }
      })
      .subscribe()

    return () => {
      accelSub.remove()
      appStateSub.remove()
      channel.unsubscribe()
    }
  }

  function cleanup() {
    clearLeaveTimer()
    if (pomodoroTimer.current) clearInterval(pomodoroTimer.current)
    Accelerometer.removeAllListeners()
  }

  function startLeaveTimer() {
    leaveTimer.current = setInterval(() => {
      setLeaveWarning(prev => {
        if (prev >= LEAVE_GRACE_SECONDS) {
          handleLose('離脱')
          return prev
        }
        return prev + 1
      })
    }, 1000)
  }

  function clearLeaveTimer() {
    if (leaveTimer.current) {
      clearInterval(leaveTimer.current)
      leaveTimer.current = null
      setLeaveWarning(0)
    }
  }

  // 伏せたらポモドーロ開始
  useEffect(() => {
    if (isFaceDown && phase === 'facedown') {
      setPhase('fighting')
      startPomodoro()
    }
  }, [isFaceDown, phase])

  function startPomodoro() {
    pomodoroTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(pomodoroTimer.current)
          setPhase('log')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleLose(reason) {
    cleanup()
    if (!room.isTest) {
      await supabase.from('room_players')
        .update({ status: 'left' })
        .eq('room_id', room.id)
        .eq('player_id', session.user.id)
    }
    onFinish('lose')
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // 伏せ待ち画面
  if (phase === 'facedown') {
    return (
      <View style={styles.container}>
        <Text style={styles.bigEmoji}>📱</Text>
        <Text style={styles.title}>スマホを伏せてください</Text>
        <Text style={styles.sub}>10秒以内に伏せないと失格</Text>
        <Text style={styles.goal}>目的: {goal}</Text>
      </View>
    )
  }

  // ログ入力（ポモドーロ終了後）
  if (phase === 'log') {
    return <LogInput room={room} goal={goal} onFinish={onFinish} session={session} />
  }

  // 対戦中
  return (
    <View style={styles.container}>

      {opponentLeft && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🎉 相手が離脱しました！勝利！</Text>
        </View>
      )}

      {leaveWarning > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>⚠️ アプリを離れています！{LEAVE_GRACE_SECONDS - leaveWarning}秒で失格</Text>
        </View>
      )}

      <Text style={styles.statusText}>
        {isFaceDown ? '✅ 伏せ中' : '⚠️ スマホを伏せてください'}
      </Text>

      <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
      <Text style={styles.timerLabel}>ポモドーロ残り時間</Text>

      <View style={styles.goalBox}>
        <Text style={styles.goalLabel}>今回の目的</Text>
        <Text style={styles.goalText}>{goal}</Text>
      </View>

      <TouchableOpacity style={styles.loseButton} onPress={() => handleLose('降参')}>
        <Text style={styles.loseText}>降参する</Text>
      </TouchableOpacity>
    </View>
  )
}

const FOCUS_SCORES = [
  { score: 1, label: '😵', desc: '全然ダメ' },
  { score: 2, label: '😕', desc: 'いまいち' },
  { score: 3, label: '😐', desc: 'まあまあ' },
  { score: 4, label: '😊', desc: '集中できた' },
  { score: 5, label: '🔥', desc: '完璧' },
]

function LogInput({ room, goal, onFinish, session }) {
  const [log, setLog] = useState('')
  const [focusScore, setFocusScore] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!focusScore) return
    setLoading(true)
    if (!room.isTest) {
      await supabase.from('pomodoro_logs').insert({
        user_id: session.user.id,
        room_id: room.id,
        log_text: log.trim() || goal,
        focus_score: focusScore,
        duration_minutes: 25,
      })
      await supabase.rpc('increment_pomodoro', { user_id: session.user.id })
    }
    setLoading(false)
    onFinish('win')
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.bigEmoji}>🌳</Text>
      <Text style={styles.title}>ポモドーロ完了！</Text>
      <Text style={styles.sub}>25分間お疲れさまでした</Text>

      {/* 一言ログ */}
      <View style={styles.logBox}>
        <Text style={styles.logLabel}>今回やったことを一言</Text>
        <TextInput
          style={styles.logInput}
          placeholder={goal}
          placeholderTextColor="#555"
          value={log}
          onChangeText={setLog}
          maxLength={50}
          autoFocus
        />
      </View>

      {/* 集中度 */}
      <View style={styles.logBox}>
        <Text style={styles.logLabel}>集中度は？</Text>
        <View style={styles.scoreRow}>
          {FOCUS_SCORES.map(({ score, label, desc }) => (
            <TouchableOpacity
              key={score}
              style={[styles.scoreItem, focusScore === score && styles.scoreItemActive]}
              onPress={() => setFocusScore(score)}
            >
              <Text style={styles.scoreEmoji}>{label}</Text>
              <Text style={styles.scoreDesc}>{desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, (!focusScore || loading) && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!focusScore || loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>完了 🌳</Text>
        }
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  bigEmoji: { fontSize: 80, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 14, color: '#aaa', marginBottom: 24 },
  goal: { fontSize: 16, color: '#4CAF50' },

  banner: {
    position: 'absolute', top: 60, left: 16, right: 16,
    backgroundColor: '#4CAF50', borderRadius: 12, padding: 12, alignItems: 'center',
  },
  bannerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  warningBanner: {
    position: 'absolute', top: 60, left: 16, right: 16,
    backgroundColor: '#ff4444', borderRadius: 12, padding: 12, alignItems: 'center',
  },
  warningText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  statusText: { fontSize: 14, color: '#aaa', marginBottom: 24 },

  timer: { fontSize: 72, fontWeight: 'bold', color: '#fff', fontVariant: ['tabular-nums'] },
  timerLabel: { fontSize: 14, color: '#666', marginBottom: 40 },

  goalBox: {
    backgroundColor: '#2a2a4a', borderRadius: 12,
    padding: 16, alignItems: 'center', width: '100%', marginBottom: 32,
  },
  goalLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  goalText: { fontSize: 18, color: '#fff', fontWeight: '600' },

  loseButton: { paddingVertical: 12, paddingHorizontal: 32 },
  loseText: { color: '#666', fontSize: 14 },

  logBox: { width: '100%', marginBottom: 20 },
  logLabel: { fontSize: 14, color: '#aaa', marginBottom: 8 },
  logInput: {
    backgroundColor: '#2a2a4a', borderRadius: 12, padding: 16,
    color: '#fff', fontSize: 16,
  },

  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  scoreItem: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: '#2a2a4a', borderRadius: 12,
    borderWidth: 2, borderColor: 'transparent',
  },
  scoreItemActive: { borderColor: '#4CAF50', backgroundColor: '#1a3a1a' },
  scoreEmoji: { fontSize: 22 },
  scoreDesc: { fontSize: 9, color: '#aaa', marginTop: 2 },

  button: {
    width: '100%', backgroundColor: '#4CAF50',
    borderRadius: 12, padding: 18, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
})
