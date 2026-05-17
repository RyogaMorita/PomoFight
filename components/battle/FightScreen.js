import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, AppState, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Modal, Animated, Vibration, Image
} from 'react-native'
import { Accelerometer } from 'expo-sensors'
import NetInfo from '@react-native-community/netinfo'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import {
  requestNotificationPermission,
  scheduleBattleNotifications,
  cancelPomodorNotification,
  notifyPomodoroComplete,
  scheduleBreakCompleteNotification,
  setupNotificationChannel,
} from '../../lib/notifications'
import { getSettings } from '../../lib/settings'
import { FishBattleDisplay } from '../FishDisplay'
import TreeDisplay from '../TreeDisplay'
import { isHomeFish, homeFishStage } from '../TreePickerModal'
import { colors, radius, shadow } from '../../lib/theme'

const FACE_DOWN_THRESHOLD = 0.6
const LEAVE_GRACE_SECONDS = 10
const FACEDOWN_LIMIT = 10
const FACEUP_GRACE = 10
const OFFLINE_GRACE_SECONDS = 10

const BREAK_SECONDS = 5 * 60

const PROFILE_ICONS = {
  bear: require('../../assets/profile_icon/bear_icon.png'),
  cat:  require('../../assets/profile_icon/cat_icon.png'),
  dog:  require('../../assets/profile_icon/dog_icon.png'),
}
const TREE_IMAGES = {
  1:  require('../../assets/trees/tree_1.png'),
  2:  require('../../assets/trees/tree_2.png'),
  3:  require('../../assets/trees/tree_3.png'),
  4:  require('../../assets/trees/tree_4.png'),
  5:  require('../../assets/trees/tree_5.png'),
  6:  require('../../assets/trees/tree_6.png'),
  7:  require('../../assets/trees/tree_7.png'),
  8:  require('../../assets/trees/tree_8.png'),
  9:  require('../../assets/trees/tree_9.png'),
  10: require('../../assets/trees/tree_10.png'),
}
const FISH_IMAGES = {
  1: require('../../assets/fish/fish_1.png'),
  2: require('../../assets/fish/fish_2.png'),
  3: require('../../assets/fish/fish_3.png'),
  4: require('../../assets/fish/fish_4.png'),
  5: require('../../assets/fish/fish_5.png'),
  6: require('../../assets/fish/fish_6.png'),
}

const STATUS_BADGES = {
  first_pomo: { emoji: '🌱', label: '初ポモドーロ' },
  pomo_10:    { emoji: '🌿', label: '10ポモ' },
  pomo_50:    { emoji: '🌳', label: '50ポモ' },
  pomo_100:   { emoji: '🌲', label: '100ポモ' },
  pomo_300:   { emoji: '🌲🌲', label: '300ポモ' },
  first_win:  { emoji: '⚔️', label: '初勝利' },
  win_10:     { emoji: '🏅', label: '10勝' },
  win_50:     { emoji: '🏆', label: '50勝' },
  win_100:    { emoji: '👑', label: '100勝' },
  rank_500:   { emoji: '🥈', label: 'シルバー到達' },
  rank_1000:  { emoji: '🥇', label: 'ゴールド到達' },
  rank_2000:  { emoji: '💎', label: 'ダイヤ到達' },
  seed:       { emoji: '🌱', label: '集中の種' },
}

export default function FightScreen({ room, goal, onFinish }) {
  const { session, profile } = useAuth()
  const POMODORO_SECONDS = 25 * 60
  const [timeLeft, setTimeLeft] = useState(POMODORO_SECONDS)
  const [breakLeft, setBreakLeft] = useState(BREAK_SECONDS)
  const [isFaceDown, setIsFaceDown] = useState(false)
  const [opponentLeft, setOpponentLeft] = useState(false)
  const [leaveWarning, setLeaveWarning] = useState(0)
  const [offlineCount, setOfflineCount] = useState(0)
  const [isOffline, setIsOffline] = useState(false)
  const [phase, setPhase] = useState('facedown')
  const [facedownCount, setFacedownCount] = useState(FACEDOWN_LIMIT)
  const [faceupCount, setFaceupCount] = useState(FACEUP_GRACE)
  const [opponent, setOpponent] = useState(null)
  const [opponentStatus, setOpponentStatus] = useState(null)
  const [activePlayers, setActivePlayers] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [pomodoros, setPomodoros] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [opponentBreakLog, setOpponentBreakLog] = useState(null)
  const growAnim = useRef(new Animated.Value(1)).current

  const showFish     = useRef(Math.random() < 0.5).current

  const leaveTimer   = useRef(null)
  const pomodoroTimer = useRef(null)
  const breakTimer   = useRef(null)
  const facedownTimer = useRef(null)
  const faceupTimer  = useRef(null)
  const offlineTimer = useRef(null)
  const fightChannel = useRef(null)
  const accelSub = useRef(null)
  const appStateSub = useRef(null)
  const netInfoUnsub = useRef(null)
  const hasLost         = useRef(false)
  const showingLoseAlert = useRef(false)
  const phaseRef     = useRef('facedown')
  const isFaceDownRef = useRef(false)
  const appState     = useRef(AppState.currentState)

  useEffect(() => {
    setupNotificationChannel()
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
    setNotificationsEnabled(s.notifications)
    if (s.notifications) {
      await requestNotificationPermission()
    }
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
      .select('player_id, profiles(username, rank, wins, losses, current_goal, profile_icon, status_badge, home_tree, pomo_streak)')
      .eq('room_id', room.id)
      .neq('player_id', session.user.id)

    if (!data) return
    setActivePlayers(data.length + 1)
    if (data.length === 1) {
      // 1v1: player_id をprofilesに含めて保存
      setOpponent({ ...data[0].profiles, player_id: data[0].player_id })
    }
  }

  function setupListeners() {
    Accelerometer.setUpdateInterval(500)
    accelSub.current = Accelerometer.addListener(({ z }) => {
      const fd = z > FACE_DOWN_THRESHOLD
      isFaceDownRef.current = fd
      setIsFaceDown(fd)
    })

    appStateSub.current = AppState.addEventListener('change', nextState => {
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
      return
    }

    const channel = supabase
      .channel(`fight-${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${room.id}`
      }, async (payload) => {
        if (payload.new.player_id === session.user.id) return
        if (payload.new.status !== 'left') return

        const { data } = await supabase
          .from('room_players')
          .select('player_id, status')
          .eq('room_id', room.id)

        const active = data?.filter(p => p.status !== 'left') ?? []
        const remaining = active.length

        if (remaining <= 1) {
          setOpponentLeft(true)
          cancelPomodorNotification()
          setTimeout(() => onFinish('win'), 2000)
        } else {
          setActivePlayers(remaining)
        }
      })
      .on('broadcast', { event: 'break_log' }, ({ payload }) => {
        if (payload.userId !== session.user.id) {
          setOpponentBreakLog(payload)
        }
      })
      .on('broadcast', { event: 'battle_status' }, ({ payload }) => {
        if (payload.userId !== session.user.id) {
          setOpponentStatus(payload)
        }
      })
      .subscribe()

    fightChannel.current = channel
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
    netInfoUnsub.current = NetInfo.addEventListener(state => {
      const connected = state.isConnected && state.isInternetReachable !== false
      setIsOffline(!connected)
      if (!connected) {
        startOfflineTimer()
      } else {
        clearOfflineTimer()
      }
    })
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

  function stopBreak() {
    if (breakTimer.current) {
      clearInterval(breakTimer.current)
      breakTimer.current = null
    }
  }

  function startBreak() {
    phaseRef.current = 'break'
    setPhase('break')
    scheduleBreakCompleteNotification(BREAK_SECONDS, {
      enabled: notificationsEnabled,
      sound: soundEnabled,
    })
    breakTimer.current = setInterval(() => {
      setBreakLeft(prev => {
        if (prev <= 1) {
          clearInterval(breakTimer.current)
          breakTimer.current = null
          phaseRef.current = 'log'
          setPhase('log')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function skipBreak() {
    stopBreak()
    cancelPomodorNotification()
    phaseRef.current = 'log'
    setPhase('log')
  }

  async function broadcastBreakLog(log, focusScore) {
    if (room.isTest || !fightChannel.current) return
    await fightChannel.current.send({
      type: 'broadcast',
      event: 'break_log',
      payload: {
        userId: session.user.id,
        username: profile?.username ?? '',
        log,
        focusScore,
      },
    })
  }

  async function broadcastBattleStatus(extra = {}) {
    if (room.isTest || !fightChannel.current) return
    await fightChannel.current.send({
      type: 'broadcast',
      event: 'battle_status',
      payload: {
        userId: session.user.id,
        username: profile?.username ?? 'プレイヤー',
        rank: profile?.rank ?? 0,
        wins: profile?.wins ?? 0,
        losses: profile?.losses ?? 0,
        pomoStreak: profile?.pomo_streak ?? 0,
        profileIcon: profile?.profile_icon,
        homeTree: profile?.home_tree,
        statusBadge: profile?.status_badge,
        phase: phaseRef.current,
        isFaceDown: isFaceDownRef.current,
        timeLeft,
        breakLeft,
        pomodoros,
        at: Date.now(),
        ...extra,
      },
    })
  }

  function cleanup() {
    stopFacedownTimer()
    stopFaceupTimer()
    stopBreak()
    clearLeaveTimer()
    clearOfflineTimer()
    if (pomodoroTimer.current) {
      clearInterval(pomodoroTimer.current)
      pomodoroTimer.current = null
    }
    accelSub.current?.remove()
    accelSub.current = null
    appStateSub.current?.remove()
    appStateSub.current = null
    netInfoUnsub.current?.()
    netInfoUnsub.current = null
    fightChannel.current?.unsubscribe()
    fightChannel.current = null
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
        Vibration.vibrate([0, 60, 40, 100]) // 伏せ確認バイブ（ピロン）
      }
    } else if (phaseRef.current === 'fighting') {
      if (!isFaceDown) {
        if (!faceupTimer.current) startFaceupTimer()
      } else {
        if (faceupTimer.current) {
          stopFaceupTimer()
          Vibration.vibrate([0, 60, 40, 100]) // 伏せ復帰バイブ
        }
      }
    }
  }, [isFaceDown])

  useEffect(() => {
    broadcastBattleStatus()
  }, [phase, isFaceDown, timeLeft, breakLeft, pomodoros])

  function startPomodoro() {
    scheduleBattleNotifications(POMODORO_SECONDS, {
      enabled: notificationsEnabled,
      sound: soundEnabled,
    })
    pomodoroTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(pomodoroTimer.current)
          pomodoroTimer.current = null
          stopFaceupTimer()
          Vibration.cancel()
          notifyPomodoroComplete({
            enabled: notificationsEnabled,
            sound: soundEnabled,
          })
          growTree()
          startBreak()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  function growTree() {
    setPomodoros(prev => prev + 1)
    Vibration.vibrate([0, 200, 100, 200, 100, 600])
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
        <BattleStatusBanner
          me={profile}
          opponent={opponent}
          opponentStatus={opponentStatus}
          myStatus={{
            phase,
            isFaceDown,
            timeLeft,
            breakLeft,
            pomodoros,
          }}
          activePlayers={activePlayers}
          onReport={() => setShowReport(true)}
        />
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

  if (phase === 'break' || phase === 'log') {
    return (
      <BreakLogScreen
        breakLeft={breakLeft}
        isBreak={phase === 'break'}
        onSkip={skipBreak}
        onSubmit={broadcastBreakLog}
        opponentBreakLog={opponentBreakLog}
        opponentStatus={opponentStatus}
        opponent={opponent}
        room={room}
        goal={goal}
        onFinish={onFinish}
        session={session}
        profile={profile}
        myStatus={{
          phase,
          isFaceDown,
          timeLeft,
          breakLeft,
          pomodoros,
        }}
      />
    )
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

      <BattleStatusBanner
        me={profile}
        opponent={opponent}
        opponentStatus={opponentStatus}
        myStatus={{
          phase,
          isFaceDown,
          timeLeft,
          breakLeft,
          pomodoros,
        }}
        activePlayers={activePlayers}
        onReport={() => setShowReport(true)}
      />

      <Animated.View style={[styles.treeWrap, { transform: [{ scale: growAnim }] }]}>
        {showFish
          ? <FishBattleDisplay totalPomodoros={pomodoros} />
          : <TreeDisplay totalPomodoros={pomodoros} size="large" />
        }
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
      {__DEV__ && (
        <TouchableOpacity onPress={() => setTimeLeft(3)} style={styles.devSkip}>
          <Text style={styles.devSkipText}>⚡ DEV: スキップ</Text>
        </TouchableOpacity>
      )}

      <View style={styles.goalBox}>
        <Text style={styles.goalLabel}>目的</Text>
        <Text style={styles.goalText}>{goal}</Text>
      </View>

      <TouchableOpacity style={styles.loseButton} onPress={() => {
        if (showingLoseAlert.current) return
        showingLoseAlert.current = true
        Alert.alert('降参しますか？', '敗北になります', [
          { text: 'キャンセル', onPress: () => { showingLoseAlert.current = false } },
          { text: '降参する', style: 'destructive', onPress: () => { showingLoseAlert.current = false; handleLose('降参') } },
        ])
      }}>
        <Text style={styles.loseText}>降参する</Text>
      </TouchableOpacity>

      <ReportModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        roomId={room.id}
        reportedId={opponent?.player_id}
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

function statusLabel(status) {
  if (!status) return '準備中'
  if (status.phase === 'facedown') return status.isFaceDown ? '伏せ確認OK' : '伏せ待ち'
  if (status.phase === 'fighting') return status.isFaceDown ? '集中中' : '伏せ解除中'
  if (status.phase === 'break') return '休憩中'
  if (status.phase === 'log' || status.phase === 'log_done') return 'メモ中'
  return '対戦中'
}

function compactTime(seconds) {
  if (typeof seconds !== 'number') return '--:--'
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function PlayerBannerCard({ player, status, side = 'left', accent = colors.primary, isMe = false }) {
  const iconKey = player?.profile_icon || player?.profileIcon
  const homeTree = player?.home_tree ?? player?.homeTree ?? 1
  const icon = iconKey === 'home'
    ? (isHomeFish(homeTree) ? FISH_IMAGES[homeFishStage(homeTree)] : TREE_IMAGES[homeTree])
    : (PROFILE_ICONS[iconKey] || PROFILE_ICONS.bear)
  const badge = STATUS_BADGES[player?.status_badge || player?.statusBadge] || STATUS_BADGES.first_pomo
  const wins = player?.wins ?? 0
  const losses = player?.losses ?? 0
  const rank = player?.rank ?? 0
  const pomoStreak = player?.pomo_streak ?? player?.pomoStreak ?? 0
  const time = status?.phase === 'break' ? status?.breakLeft : status?.timeLeft

  return (
    <View style={[styles.playerBannerCard, side === 'right' && styles.playerBannerCardRight, { borderColor: accent }]}>
      {side === 'left' && <Image source={icon} style={styles.bannerAvatar} resizeMode="contain" />}
      <View style={[styles.bannerInfo, side === 'right' && styles.bannerInfoRight]}>
        <Text style={styles.bannerName} numberOfLines={1}>{isMe ? 'あなた' : (player?.username ?? '相手待ち')}</Text>
        <Text style={styles.bannerMeta}>レート: {rank}</Text>
        <Text style={styles.bannerMeta}>{wins}勝{losses}敗</Text>
        <View style={styles.bannerBadge}>
          <Text style={styles.bannerBadgeText}>{badge.emoji} {badge.label}</Text>
        </View>
        <Text style={styles.bannerStreak}>🔥{pomoStreak}日目</Text>
        <View style={[styles.statusPill, { backgroundColor: accent }]}>
          <Text style={styles.statusPillText}>{statusLabel(status)} {compactTime(time)}</Text>
        </View>
      </View>
      {side === 'right' && <Image source={icon} style={styles.bannerAvatar} resizeMode="contain" />}
    </View>
  )
}

function BattleStatusBanner({ me, opponent, opponentStatus, myStatus, activePlayers, onReport }) {
  const mergedOpponent = opponentStatus
    ? {
        ...opponent,
        username: opponentStatus.username ?? opponent?.username,
        rank: opponentStatus.rank ?? opponent?.rank,
        wins: opponentStatus.wins ?? opponent?.wins,
        losses: opponentStatus.losses ?? opponent?.losses,
        pomoStreak: opponentStatus.pomoStreak ?? opponent?.pomo_streak,
        profileIcon: opponentStatus.profileIcon,
        homeTree: opponentStatus.homeTree,
        statusBadge: opponentStatus.statusBadge,
      }
    : opponent

  return (
    <View style={styles.battleBanner}>
      <PlayerBannerCard player={me} status={myStatus} isMe accent="#ff5ca8" />
      <Text style={styles.bannerVs}>VS</Text>
      <PlayerBannerCard
        player={mergedOpponent}
        status={opponentStatus}
        side="right"
        accent="#32d74b"
      />
      {activePlayers !== null && (
        <View style={styles.bannerCount}>
          <Text style={styles.bannerCountText}>残り {activePlayers}人</Text>
        </View>
      )}
      {opponent && onReport && (
        <TouchableOpacity style={styles.bannerReport} onPress={onReport}>
          <Text style={styles.bannerReportText}>通報</Text>
        </TouchableOpacity>
      )}
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

function BreakLogScreen({ breakLeft, isBreak, onSkip, onSubmit, opponentBreakLog, opponentStatus, opponent, room, goal, onFinish, session, profile, myStatus }) {
  const [log, setLog] = useState('')
  const [focusScore, setFocusScore] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submittedLog, setSubmittedLog] = useState(null)

  const bm = Math.floor(breakLeft / 60)
  const bs = breakLeft % 60

  async function handleSubmit() {
    if (!focusScore || submitted) return
    setLoading(true)
    {
      await supabase.from('pomodoro_logs').insert({
        user_id: session.user.id,
        room_id: room.isTest ? null : room.id,
        log_text: log.trim() || goal,
        focus_score: focusScore,
        duration_minutes: 25,
        match_type: room.match_type ?? (room.isTest ? 'cpu' : room.is_public ? 'public' : room.invite_code ? 'friend' : 'random'),
        rated: room.rated === true,
      })
      await supabase.rpc('increment_pomodoro', { user_id: session.user.id })
    }
    await onSubmit(log.trim() || goal, focusScore)
    setSubmittedLog({ log: log.trim() || goal, focusScore })
    setLoading(false)
    setSubmitted(true)
    if (!isBreak) onFinish('win')
  }

  // 休憩終了（isBreak が false になった）かつ提出済み → finish
  useEffect(() => {
    if (!isBreak && submitted) onFinish('win')
  }, [isBreak])

  // 休憩終了かつ未提出 → ログ画面になる（phase=log）ので自動提出しない
  // phase=log で画面がそのまま残るので自分でsubmitできる

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <BattleStatusBanner
        me={profile}
        opponent={opponent}
        opponentStatus={opponentBreakLog ? { ...opponentStatus, phase: 'log_done' } : opponentStatus}
        myStatus={myStatus}
      />
      {/* 休憩カウントダウン */}
      {isBreak && (
        <View style={styles.breakHeader}>
          <Text style={styles.breakHeaderEmoji}>☕</Text>
          <Text style={[styles.timer, styles.breakTimer]}>
            {String(bm).padStart(2, '0')}:{String(bs).padStart(2, '0')}
          </Text>
          {__DEV__ && (
            <TouchableOpacity style={styles.skipBreakBtn} onPress={onSkip}>
              <Text style={styles.skipBreakText}>⚡ DEV: 休憩スキップ</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isBreak && <Text style={styles.bigEmoji}>🌳</Text>}
      <Text style={styles.title}>ポモドーロ完了！</Text>

      {/* 相手プロフィール */}
      {opponent && !opponentBreakLog && (
        <View style={styles.opponentMiniCard}>
          <Text style={styles.vsText}>VS</Text>
          <View>
            <Text style={styles.opponentNameSmall}>{opponent.username}</Text>
            <Text style={styles.opponentRankSmall}>Rank {opponent.rank}</Text>
          </View>
        </View>
      )}

      {/* 相手のログ（受信後は相手カードを置き換え） */}
      {opponentBreakLog && (
        <View style={styles.opponentLogBox}>
          <Text style={styles.opponentLogLabel}>💬 {opponentBreakLog.username} のログ</Text>
          <Text style={styles.opponentLogText}>{opponentBreakLog.log}</Text>
          <Text style={styles.opponentLogScore}>
            集中度: {FOCUS_SCORES.find(f => f.score === opponentBreakLog.focusScore)?.label ?? ''}
          </Text>
        </View>
      )}

      {submitted ? (
        <View style={styles.submittedBox}>
          <Text style={styles.submittedText}>✅ ログを送信しました</Text>
          {submittedLog && (
            <View style={styles.myLogBox}>
              <Text style={styles.myLogLabel}>あなたの共有メモ</Text>
              <Text style={styles.myLogText}>{submittedLog.log}</Text>
              <Text style={styles.myLogScore}>
                集中度: {FOCUS_SCORES.find(f => f.score === submittedLog.focusScore)?.label ?? ''}
              </Text>
            </View>
          )}
          {isBreak && <Text style={styles.submittedSub}>休憩終了までお待ちください</Text>}
        </View>
      ) : (
        <>
          <View style={styles.logBox}>
            <Text style={styles.logLabel}>今回やったことを一言（相手にも共有）</Text>
            <TextInput
              style={styles.logInput}
              placeholder={goal}
              placeholderTextColor={colors.textLight}
              value={log}
              onChangeText={setLog}
              maxLength={50}
              autoFocus={!isBreak}
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
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>送信して完了 🌳</Text>
            }
          </TouchableOpacity>
        </>
      )}
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

  battleBanner: {
    position: 'absolute',
    top: 42,
    left: 10,
    right: 10,
    zIndex: 120,
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  playerBannerCard: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '48%',
    minHeight: 108,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff6aa9',
    borderWidth: 3,
    borderBottomWidth: 6,
    borderRadius: radius.md,
    padding: 8,
    ...shadow,
  },
  playerBannerCardRight: {
    left: undefined,
    right: 0,
    backgroundColor: '#4de34f',
  },
  bannerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  bannerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  bannerInfoRight: {
    marginLeft: 0,
    marginRight: 8,
    alignItems: 'flex-end',
  },
  bannerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
  },
  bannerMeta: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 1,
  },
  bannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginTop: 4,
  },
  bannerBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  bannerStreak: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 3,
  },
  statusPill: {
    borderRadius: radius.full,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  bannerVs: {
    position: 'absolute',
    top: 26,
    left: '46%',
    zIndex: 150,
    color: '#fff',
    fontSize: 34,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
  bannerCount: {
    position: 'absolute',
    top: 112,
    right: 0,
    zIndex: 151,
    backgroundColor: colors.accent,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bannerCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  bannerReport: {
    position: 'absolute',
    top: 118,
    left: 0,
    backgroundColor: colors.danger,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bannerReportText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },

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
    position: 'absolute', top: 194, left: 16, right: 16, zIndex: 130,
    backgroundColor: colors.danger, borderRadius: radius.md, padding: 12, alignItems: 'center',
  },
  warningText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  treeWrap: { width: '100%', marginTop: 154, marginBottom: 16 },
  statusText: { fontSize: 13, color: colors.textSub, marginBottom: 8 },
  timer: { fontSize: 56, fontWeight: 'bold', color: colors.text, fontVariant: ['tabular-nums'] },

  goalBox: {
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 16, alignItems: 'center', width: '100%', marginBottom: 24, ...shadow,
  },
  goalLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  goalText: { fontSize: 18, color: colors.text, fontWeight: '600' },

  breakHeader: { alignItems: 'center', marginBottom: 8 },
  breakHeaderEmoji: { fontSize: 36, marginBottom: 4 },
  breakTimer: { color: colors.primary, marginVertical: 4 },
  skipBreakBtn: {
    paddingVertical: 8, paddingHorizontal: 24,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card, marginTop: 4,
  },
  skipBreakText: { color: colors.textSub, fontSize: 14 },

  opponentMiniCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
  },

  opponentLogBox: {
    width: '100%', backgroundColor: colors.cardSub,
    borderRadius: radius.md, padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border,
  },
  opponentLogLabel: { fontSize: 12, color: colors.textSub, marginBottom: 6, fontWeight: '600' },
  opponentLogText:  { fontSize: 16, color: colors.text, fontWeight: '700', marginBottom: 4 },
  opponentLogScore: { fontSize: 13, color: colors.primary },

  myLogBox: {
    width: '100%',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  myLogLabel: { fontSize: 12, color: colors.textSub, marginBottom: 6, fontWeight: '700' },
  myLogText: { fontSize: 16, color: colors.text, fontWeight: '700', marginBottom: 4 },
  myLogScore: { fontSize: 13, color: colors.primary, fontWeight: '700' },

  submittedBox: { alignItems: 'center', paddingVertical: 24 },
  submittedText: { fontSize: 18, fontWeight: 'bold', color: colors.primary },
  submittedSub:  { fontSize: 13, color: colors.textSub, marginTop: 8 },

  loseButton: { paddingVertical: 12, paddingHorizontal: 32 },
  loseText: { color: colors.textLight, fontSize: 14 },
  devSkip: { paddingVertical: 4, paddingHorizontal: 12, marginBottom: 4 },
  devSkipText: { color: '#ff6b35', fontSize: 11, fontWeight: '700' },

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
