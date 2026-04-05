import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, AppState, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Modal, Animated, Vibration
} from 'react-native'
import { Accelerometer } from 'expo-sensors'
import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  requestNotificationPermission,
  scheduleBattleNotifications,
  cancelPomodorNotification,
  setupNotificationChannel,
} from '../../lib/notifications'
import { getSettings } from '../../lib/settings'
import TreeDisplay, { getTreeStage } from '../TreeDisplay'
import { colors, radius, shadow } from '../../lib/theme'

const FACE_DOWN_THRESHOLD = 0.6
const LEAVE_GRACE_SECONDS = 10
const FACEDOWN_LIMIT = 10
const FACEUP_GRACE = 10
const OFFLINE_GRACE_SECONDS = 10

export default function FightScreen({ room, goal, onFinish }) {
  const { session, profile } = useAuth()
  const POMODORO_SECONDS = 25 * 60
  const [timeLeft, setTimeLeft] = useState(POMODORO_SECONDS)
  const [isFaceDown, setIsFaceDown] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)
  const [leaveWarning, setLeaveWarning] = useState(0)
  const [offlineCount, setOfflineCount] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const [phase, setPhase] = useState('facedown')
  const [facedownCount, setFacedownCount] = useState(FACEDOWN_LIMIT)
  const [faceupCount, setFaceupCount] = useState(FACEUP_GRACE)
  const [opponent, setOpponent] = useState(null)
  const [activePlayers, setActivePlayers] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [pomodoros, setPomodoros] = useState(profile?.total_pomodoros ?? 0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const growAnim = useRef(new Animated.Value(1)).current

  const leaveTimer   = useRef(null)
  const pomodoroTimer = useRef(null)
  const facedownTimer = useRef(null)
  const faceupTimer  = useRef(null)
  const offlineTimer = useRef(null)
  const hasLost      = useRef(false)
  const phaseRef     = useRef('facedown')
  const isFaceDownRef = useRef(false)   // スリープ時のleave判定用
  const appState     = useRef(AppState.currentState)

  useEffect(() => {
    setupNotificationChannel()
    requestNotificationPermission()
    loadSettingsAndInit()
    if (!room.isTest) fetchOpponent()
    setupListeners()
    setupNetworkListener()
    startFacedownTimer()
    return () => cleanup()
  }, [])

  async function loadSettingsAndInit() {
    const s = await getSettings()
    setSoundEnabled(s.sound)
  }

  // ── カウントが0になったら負け（setState外で検知）──────────
  useEffect(() => {
    if (facedownCount === 0 && phaseRef.current === 'facedown') {
      handleLose('伏せ失格')
    }
  }, [facedownCount])

  useEffect(() => {
    if (faceupCount === 0 && phaseRef.current === 'fighting') {
      handleLose('伏せ解除')
    }
  }, [faceupCount])

  useEffect(() => {
    if (leaveWarning >= LEAVE_GRACE_SECONDS && phaseRef.current === 'fighting') {
      handleLose('離脱')
    }
  }, [leaveWarning])

  useEffect(() => {
    if (offlineCount >= OFFLINE_GRACE_SECONDS && phaseRef.current === 'fighting') {
      handleLose('オフライン')
    }
  }, [offlineCount])

  async function fetchOpponent() {
    const { data } = await supabase
      .from('room_players')
      .select('player_id, profiles(username, rank, current_goal)')
      .eq('room_id', room.id)
      .neq('player_id', session.user.id)

    if (!data) return
    if (data.length === 1) {
      // 1v1
      setOpponent(data[0].profiles)
    } else {
      // 複数人：残り人数モード
      setActivePlayers(data.length + 1) // 自分含む
    }
  }

  function setupListeners() {
    Accelerometer.setUpdateInterval(500)
    const accelSub = Accelerometer.addListener(({ z }) => {
      const fd = z > FACE_DOWN_THRESHOLD
      isFaceDownRef.current = fd
      setIsFaceDown(fd)
    })

    const appStateSub = AppState.addEventListener('change', nextState => {
      if (nextState === 'background' || nextState === 'inactive') {
        // 伏せ中のスリープは正常 → leaveWarningを発動しない
        if (!isFaceDownRef.current) {
          startLeaveTimer()
        }
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
      }, async (payload) => {
        if (payload.new.player_id === session.user.id) return
        if (payload.new.status !== 'left') return

        // 残り人数を再取得して判定
        const { data } = await supabase
          .from('room_players')
          .select('player_id, status')
          .eq('room_id', room.id)

        const active = data?.filter(p => p.status !== 'left') ?? []
        const remaining = active.length

        if (remaining <= 1) {
          // 自分だけ残った → 勝利
          setOpponentLeft(true)
          cancelPomodorNotification()
          setTimeout(() => onFinish('win'), 2000)
        } else {
          // まだ他にいる → 残り人数更新
          setActivePlayers(remaining)
        }
      })
      .subscribe()

    return () => { accelSub.remove(); appStateSub.remove(); channel.unsubscribe() }
  }

  // ── 開始前：伏せ猶予カウントダウン ───────────────────────
  function startFacedownTimer() {
    facedownTimer.current = setInterval(() => {
      setFacedownCount(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
  }

  function stopFacedownTimer() {
    if (facedownTimer.current) {
      clearInterval(facedownTimer.current)
      facedownTimer.current = null
    }
  }

  // ── 対戦中：起き上がり猶予カウントダウン ─────────────────
  function startFaceupTimer() {
    Vibration.vibrate([0, 300, 200, 300])
    faceupTimer.current = setInterval(() => {
      setFaceupCount(prev => {
        const next = prev > 0 ? prev - 1 : 0
        Vibration.vibrate(100)
        return next
      })
    }, 1000)
  }

  function stopFaceupTimer() {
    if (faceupTimer.current) {
      clearInterval(faceupTimer.current)
      faceupTimer.current = null
      Vibration.cancel()
      setFaceupCount(FACEUP_GRACE)
    }
  }

  function setupNetworkListener() {
    if (room.isTest) return
    const unsub = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable !== false
      setIsOffline(!connected)
      if (!connected) {
        startOfflineTimer()
      } else {
        clearOfflineTimer()
      }
    })
    return unsub
  }

  function startOfflineTimer() {
    if (offlineTimer.current) return
    offlineTimer.current = setInterval(() => {
      setOfflineCount(prev => prev < OFFLINE_GRACE_SECONDS ? prev + 1 : prev)
    }, 1000)
  }

  function clearOfflineTimer() {
    if (offlineTimer.current) {
      clearInterval(offlineTimer.current)
      offlineTimer.current = null
      setOfflineCount(0)
    }
  }

  function cleanup() {
    stopFacedownTimer()
    stopFaceupTimer()
    clearLeaveTimer()
    clearOfflineTimer()
    if (pomodoroTimer.current) {
      clearInterval(pomodoroTimer.current)
      pomodoroTimer.current = null
    }
    Accelerometer.removeAllListeners()
    cancelPomodorNotification()
    Vibration.cancel()
  }

  function startLeaveTimer() {
    if (leaveTimer.current) return
    leaveTimer.current = setInterval(() => {
      setLeaveWarning(prev => (prev < LEAVE_GRACE_SECONDS ? prev + 1 : prev))
    }, 1000)
  }

  function clearLeaveTimer() {
    if (leaveTimer.current) {
      clearInterval(leaveTimer.current)
      leaveTimer.current = null
      setLeaveWarning(0)
    }
  }

  // ── 伏せ状態の変化を監視 ─────────────────────────────────
  useEffect(() => {
    if (phaseRef.current === 'facedown') {
      if (isFaceDown) {
        stopFacedownTimer()
        phaseRef.current = 'fighting'
        setPhase('fighting')
        startPomodoro()
      }
    } else if (phaseRef.current === 'fighting') {
      if (!isFaceDown) {
        if (!faceupTimer.current) startFaceupTimer()
      } else {
        if (faceupTimer.current) stopFaceupTimer()
      }
    }
  }, [isFaceDown])

  function startPomodoro() {
    scheduleBattleNotifications(POMODORO_SECONDS)
    pomodoroTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(pomodoroTimer.current)
          pomodoroTimer.current = null
          growTree()
          phaseRef.current = 'log'
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
    if (hasLost.current) return   // ガード：絶対に1回だけ
    hasLost.current = true
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

  // ── 開始前フェーズ ────────────────────────────────────────
  if (phase === 'facedown') {
    return (
      <View style={styles.container}>
        <Text style={styles.bigEmoji}>📱</Text>
        <Text style={styles.title}>スマホを伏せてください</Text>
        <Text style={styles.sub}>伏せないと失格になります</Text>
        <Text style={[styles.facedownCount, facedownCount <= 3 && styles.countDanger]}>
          {facedownCount}
        </Text>
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

  // ── 対戦中フェーズ ────────────────────────────────────────
  const isFaceupWarning = faceupTimer.current !== null

  return (
    <View style={styles.container}>

      {opponentLeft && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>🎉 相手が離脱しました！勝利！</Text>
        </View>
      )}
      {isOffline && offlineCount > 0 && (
        <View style={[styles.warningBanner, { backgroundColor: '#ff6b00' }]}>
          <Text style={styles.warningText}>
            📡 オフライン！{OFFLINE_GRACE_SECONDS - offlineCount}秒で失格
          </Text>
        </View>
      )}
      {leaveWarning > 0 && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ アプリを離れています！{LEAVE_GRACE_SECONDS - leaveWarning}秒で失格
          </Text>
        </View>
      )}
      {isFaceupWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            📱 スマホを伏せてください！{faceupCount}秒で失格
          </Text>
        </View>
      )}

      {activePlayers !== null && (
        <View style={styles.activePlayersBar}>
          <Text style={styles.activePlayersText}>👥 残り {activePlayers} 人</Text>
        </View>
      )}

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

      <Animated.View style={[styles.treeWrap, { transform: [{ scale: growAnim }] }]}>
        <TreeDisplay totalPomodoros={pomodoros} size="large" />
      </Animated.View>

      {isFaceupWarning ? (
        <Text style={[styles.faceupCount, faceupCount <= 3 && styles.countDanger]}>
          {faceupCount}
        </Text>
      ) : (
        <Text style={styles.statusText}>
          {isFaceDown ? '✅ 伏せ中' : '⚠️ スマホを伏せてください'}
        </Text>
      )}

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

function ReportModal({ visible, onClose, roomId, reportedId, reporterId }) {
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
  sub: { fontSize: 14, color: colors.textSub, marginBottom: 16 },
  goal: { fontSize: 16, color: colors.primary, marginBottom: 16 },

  facedownCount: {
    fontSize: 80, fontWeight: 'bold', color: colors.primary,
    marginBottom: 16, fontVariant: ['tabular-nums'],
  },
  faceupCount: {
    fontSize: 48, fontWeight: 'bold', color: colors.danger,
    marginBottom: 8, fontVariant: ['tabular-nums'],
  },
  countDanger: { color: colors.danger },

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

  activePlayersBar: {
    position: 'absolute', top: 48, right: 16, zIndex: 99,
    backgroundColor: colors.accent, borderRadius: radius.full,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  activePlayersText: { color: '#fff', fontWeight: '800', fontSize: 13 },

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
