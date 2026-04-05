import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, AppState, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Modal, Animated
} from 'react-native'
import { Accelerometer } from 'expo-sensors'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  requestNotificationPermission,
  schedulePomodoroDoneNotification,
  cancelPomodorNotification,
  setupNotificationChannel,
} from '../../lib/notifications'
import TreeDisplay, { getTreeStage } from '../TreeDisplay'
import { colors, radius, shadow } from '../../lib/theme'

const POMODORO_SECONDS = 25 * 60
const FACE_DOWN_THRESHOLD = 0.6  // z > 0.6 = 画面が下向き
const LEAVE_GRACE_SECONDS = 10

export default function FightScreen({ room, goal, onFinish }) {
  const { session, profile } = useAuth()
  const [timeLeft, setTimeLeft] = useState(POMODORO_SECONDS)
  const [isFaceDown, setIsFaceDown] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)
  const [leaveWarning, setLeaveWarning] = useState(0)
  const [phase, setPhase] = useState('facedown')
  const [opponent, setOpponent] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [pomodoros, setPomodoros] = useState(profile?.total_pomodoros ?? 0)
  const growAnim = useRef(new Animated.Value(1)).current

  const leaveTimer = useRef(null)
  const pomodoroTimer = useRef(null)
  const appState = useRef(AppState.currentState)

  useEffect(() => {
    setupNotificationChannel()
    requestNotificationPermission()
    if (!room.isTest) fetchOpponent()
    setupListeners()
    return () => cleanup()
  }, [])

  async function fetchOpponent() {
    const { data } = await supabase
      .from('room_players')
      .select('player_id, profiles(username, rank, current_goal)')
      .eq('room_id', room.id)
      .neq('player_id', session.user.id)
      .single()
    if (data) setOpponent(data.profiles)
  }

  function setupListeners() {
    Accelerometer.setUpdateInterval(500)
    const accelSub = Accelerometer.addListener(({ z }) => {
      setIsFaceDown(z > FACE_DOWN_THRESHOLD)
    })

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        startLeaveTimer()
      } else if (nextState === 'active') {
        clearLeaveTimer()
      }
      appState.current = nextState
    })

    if (room.isTest) {
      return () => { accelSub.remove(); appStateSub.remove() }
    }

    const channel = supabase
      .channel(`fight-${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${room.id}`
      }, (payload) => {
        if (payload.new.player_id !== session.user.id && payload.new.status === 'left') {
          setOpponentLeft(true)
          cancelPomodorNotification()
          setTimeout(() => onFinish('win'), 2000)
        }
      })
      .subscribe()

    return () => { accelSub.remove(); appStateSub.remove(); channel.unsubscribe() }
  }

  function cleanup() {
    clearLeaveTimer()
    if (pomodoroTimer.current) clearInterval(pomodoroTimer.current)
    Accelerometer.removeAllListeners()
    cancelPomodorNotification()
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

  useEffect(() => {
    if (isFaceDown && phase === 'facedown') {
      setPhase('fighting')
      startPomodoro()
    }
  }, [isFaceDown, phase])

  function startPomodoro() {
    schedulePomodoroDoneNotification(POMODORO_SECONDS)
    pomodoroTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(pomodoroTimer.current)
          growTree()
          setPhase('log')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function growTree() {
    setPomodoros(prev => prev + 1)
    Animated.sequence([
      Animated.timing(growAnim, { toValue: 1.15, duration: 400, useNativeDriver: true }),
      Animated.timing(growAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start()
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

  if (phase === 'facedown') {
    return (
      <View style={styles.container}>
        <Text style={styles.bigEmoji}>📱</Text>
        <Text style={styles.title}>スマホを伏せてください</Text>
        <Text style={styles.sub}>10秒以内に伏せないと失格</Text>
        <Text style={styles.goal}>目的: {goal}</Text>
        {opponent && (
          <View style={styles.opponentBox}>
            <Text style={styles.opponentLabel}>対戦相手</Text>
            <Text style={styles.opponentName}>{opponent.username}</Text>
            <Text style={styles.opponentRank}>🏆 Rank {opponent.rank}</Text>
          </View>
        )}
      </View>
    )
  }

  if (phase === 'log') {
    return <LogInput room={room} goal={goal} onFinish={onFinish} session={session} />
  }

  return (
    <View style={styles.container}>

      {/* 勝利・警告バナー（最前面に固定） */}
      {opponentLeft && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🎉 相手が離脱しました！勝利！</Text>
        </View>
      )}
      {leaveWarning > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ アプリを離れています！{LEAVE_GRACE_SECONDS - leaveWarning}秒で失格
          </Text>
        </View>
      )}

      {/* 相手情報 */}
      {opponent && (
        <View style={styles.opponentCard}>
          <View style={styles.opponentLeft}>
            <Text style={styles.vsText}>VS</Text>
            <View>
              <Text style={styles.opponentNameSmall}>{opponent.username}</Text>
              <Text style={styles.opponentRankSmall}>Rank {opponent.rank}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => setShowReport(true)}>
            <Text style={styles.reportBtn}>🚨</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 木（大きく中央） */}
      <Animated.View style={[styles.treeWrap, { transform: [{ scale: growAnim }] }]}>
        <TreeDisplay totalPomodoros={pomodoros} size="large" />
      </Animated.View>

      <Text style={styles.statusText}>
        {isFaceDown ? '✅ 伏せ中' : '⚠️ スマホを伏せてください'}
      </Text>

      <Text style={styles.timer}>{formatTime(timeLeft)}</Text>

      <View style={styles.goalBox}>
        <Text style={styles.goalLabel}>目的</Text>
        <Text style={styles.goalText}>{goal}</Text>
      </View>

      <TouchableOpacity style={styles.loseButton} onPress={() => {
        Alert.alert('降参しますか？', '敗北になります', [
          { text: 'キャンセル' },
          { text: '降参する', style: 'destructive', onPress: () => handleLose('降参') },
        ])
      }}>
        <Text style={styles.loseText}>降参する</Text>
      </TouchableOpacity>

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        roomId={room.id}
        reportedId={opponent?.id}
        reporterId={session.user.id}
      />
    </View>
  )
}

// 通報モーダル
function ReportModal({ visible, onClose, roomId, reportedId, reporterId }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const REASONS = ['チート疑惑', '暴言・嫌がらせ', '不適切な内容', 'その他']

  async function handleReport(r) {
    setLoading(true)
    await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      room_id: roomId,
      reason: r,
    })
    setLoading(false)
    Alert.alert('通報しました', '確認後に対応いたします', [{ text: 'OK', onPress: onClose }])
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>🚨 通報する</Text>
          <Text style={styles.modalSub}>理由を選択してください</Text>
          {REASONS.map(r => (
            <TouchableOpacity
              key={r}
              style={styles.reasonBtn}
              onPress={() => handleReport(r)}
              disabled={loading}
            >
              <Text style={styles.reasonText}>{r}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// 集中度・ログ入力
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

      <View style={styles.logBox}>
        <Text style={styles.logLabel}>今回やったことを一言</Text>
        <TextInput
          style={styles.logInput}
          placeholder={goal}
          placeholderTextColor={colors.textLight}
          value={log}
          onChangeText={setLog}
          maxLength={50}
          autoFocus
        />
      </View>

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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>完了 🌳</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  bigEmoji: { fontSize: 80, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.textSub, marginBottom: 24 },
  goal: { fontSize: 16, color: colors.primary, marginBottom: 16 },

  opponentBox: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 16, alignItems: 'center', marginTop: 16, width: '100%', ...shadow,
  },
  opponentLabel: { fontSize: 11, color: colors.textLight, marginBottom: 4 },
  opponentName: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  opponentRank: { fontSize: 13, color: colors.gold, marginTop: 2 },

  opponentCard: {
    position: 'absolute', top: 48, left: 16, right: 16,
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    ...shadow,
  },
  opponentLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vsText: { fontSize: 12, fontWeight: 'bold', color: colors.danger },
  opponentNameSmall: { fontSize: 15, fontWeight: 'bold', color: colors.text },
  opponentRankSmall: { fontSize: 11, color: colors.gold },
  reportBtn: { fontSize: 20, padding: 4 },

  banner: {
    position: 'absolute', top: 52, left: 16, right: 16, zIndex: 100,
    backgroundColor: colors.primary, borderRadius: radius.md, padding: 12, alignItems: 'center',
  },
  bannerText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  warningBanner: {
    position: 'absolute', top: 52, left: 16, right: 16, zIndex: 100,
    backgroundColor: colors.danger, borderRadius: radius.md, padding: 12, alignItems: 'center',
  },
  warningText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  treeWrap: { width: '100%', marginTop: 56, marginBottom: 16 },
  statusText: { fontSize: 13, color: colors.textSub, marginBottom: 8 },
  timer: { fontSize: 56, fontWeight: 'bold', color: colors.text, fontVariant: ['tabular-nums'] },

  goalBox: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 16, alignItems: 'center', width: '100%', marginBottom: 24, ...shadow,
  },
  goalLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  goalText: { fontSize: 18, color: colors.text, fontWeight: '600' },

  loseButton: { paddingVertical: 12, paddingHorizontal: 32 },
  loseText: { color: colors.textLight, fontSize: 14 },

  // 通報モーダル
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
  modalSub: { fontSize: 13, color: colors.textSub, marginBottom: 16 },
  reasonBtn: {
    backgroundColor: colors.cardSub, borderRadius: radius.md,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: colors.border,
  },
  reasonText: { color: colors.text, fontSize: 15 },
  cancelBtn: { padding: 14, alignItems: 'center', marginTop: 4 },
  cancelText: { color: colors.textLight, fontSize: 15 },

  // ログ入力
  logBox: { width: '100%', marginBottom: 20 },
  logLabel: { fontSize: 14, color: colors.textSub, marginBottom: 8 },
  logInput: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 16, color: colors.text, fontSize: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  scoreItem: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 2, borderColor: 'transparent',
  },
  scoreItemActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  scoreEmoji: { fontSize: 22 },
  scoreDesc: { fontSize: 9, color: colors.textLight, marginTop: 2 },

  button: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: radius.md, padding: 18, alignItems: 'center', ...shadow,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
})
