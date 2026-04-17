import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../lib/theme'

const TIPS = [
  '💡 スマホを伏せて置くと木が育ちます',
  '⚡ 連勝するとボーナスランクがもらえます',
  '🔥 毎日バトルするとストリークが燃えます',
  '🌳 ポモドーロを積むほど木がレアになります',
  '🏆 今日の初勝利はボーナスランクがもらえます',
]

function RadarRing({ delay, color }) {
  const scale   = useRef(new Animated.Value(0.3)).current
  const opacity = useRef(new Animated.Value(0.7)).current

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 2.8, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0,   duration: 2200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 0.3, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.7, duration: 0, useNativeDriver: true }),
        ]),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  return (
    <Animated.View style={[styles.ring, { borderColor: color, opacity, transform: [{ scale }] }]} />
  )
}

export default function MatchingScreen({ goal, onMatched, onCancel }) {
  const { session, profile } = useAuth()
  const roomRef    = useRef(null)
  const channelRef = useRef(null)
  const iconPulse  = useRef(new Animated.Value(1)).current

  const [waitSeconds, setWaitSeconds] = useState(0)
  const [tipIndex,    setTipIndex]    = useState(0)
  const tipOp = useRef(new Animated.Value(1)).current

  // アイコンのパルス
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(iconPulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  // 待機秒数カウンター
  useEffect(() => {
    const t = setInterval(() => setWaitSeconds(p => p + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Tips ローテーション（6秒ごと）
  useEffect(() => {
    const t = setInterval(() => {
      Animated.sequence([
        Animated.timing(tipOp, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(tipOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start()
      setTipIndex(p => (p + 1) % TIPS.length)
    }, 6000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    startMatching()
    return () => cleanup()
  }, [])

  async function startMatching() {
    const { data: waitingRooms } = await supabase
      .from('rooms')
      .select('*, room_players(*)')
      .eq('status', 'waiting')
      .lt('created_at', new Date(Date.now() - 2000).toISOString())
      .limit(1)

    const waitingRoom = waitingRooms?.find(r =>
      r.room_players.length === 1 &&
      r.room_players[0].player_id !== session.user.id
    )

    if (waitingRoom) {
      await supabase.from('room_players').insert({
        room_id: waitingRoom.id,
        player_id: session.user.id,
      })
      await supabase.from('rooms').update({ status: 'active' }).eq('id', waitingRoom.id)
      roomRef.current = waitingRoom.id
      onMatched({ id: waitingRoom.id, opponentGoal: waitingRoom.theme })
    } else {
      const { data: newRoom } = await supabase
        .from('rooms')
        .insert({ host_id: session.user.id, theme: goal, status: 'waiting' })
        .select()
        .single()

      if (newRoom) {
        roomRef.current = newRoom.id
        await supabase.from('room_players').insert({
          room_id: newRoom.id,
          player_id: session.user.id,
        })

        const channel = supabase
          .channel(`room-${newRoom.id}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'rooms',
            filter: `id=eq.${newRoom.id}`
          }, (payload) => {
            if (payload.new.status === 'active') {
              channelRef.current?.unsubscribe()
              channelRef.current = null
              onMatched({ id: newRoom.id, opponentGoal: null })
            }
          })
          .subscribe()
        channelRef.current = channel
      }
    }
  }

  async function cleanup() {
    channelRef.current?.unsubscribe()
    channelRef.current = null
    if (roomRef.current) {
      await supabase.from('rooms').delete().eq('id', roomRef.current).eq('status', 'waiting')
    }
  }

  function getSearchMessage() {
    if (waitSeconds < 15) return '同じレベルの相手を探しています...'
    if (waitSeconds < 30) return '少し範囲を広げています...'
    return 'さらに広い範囲で探しています...'
  }

  function formatWait(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}秒`
  }

  const ringColor = waitSeconds >= 30 ? '#ff9800' : waitSeconds >= 15 ? '#2196f3' : colors.primary

  return (
    <View style={styles.container}>

      {/* レーダーアニメーション */}
      <View style={styles.radarWrap}>
        <RadarRing delay={0}    color={ringColor} />
        <RadarRing delay={700}  color={ringColor} />
        <RadarRing delay={1400} color={ringColor} />
        <Animated.Text style={[styles.icon, { transform: [{ scale: iconPulse }] }]}>⚔️</Animated.Text>
      </View>

      <Text style={styles.title}>マッチング中</Text>

      {/* 待機時間 */}
      <View style={styles.timerRow}>
        <Text style={styles.timerLabel}>待機時間</Text>
        <Text style={[styles.timerValue, waitSeconds >= 30 && styles.timerValueLong]}>
          {formatWait(waitSeconds)}
        </Text>
      </View>

      {/* 検索メッセージ */}
      <Text style={styles.searchMsg}>{getSearchMessage()}</Text>

      {/* 目的 */}
      <View style={styles.goalBadge}>
        <Text style={styles.goalText}>🎯 {goal}</Text>
      </View>

      {/* Tips */}
      <Animated.View style={[styles.tipBox, { opacity: tipOp }]}>
        <Text style={styles.tipText}>{TIPS[tipIndex]}</Text>
      </Animated.View>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => { cleanup(); onCancel() }}
        activeOpacity={0.8}
      >
        <Text style={styles.cancelText}>キャンセル</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },

  radarWrap: {
    width: 100, height: 100,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 32,
  },
  ring: {
    position: 'absolute',
    width: 80, height: 80,
    borderRadius: 40,
    borderWidth: 2,
  },
  icon: { fontSize: 52 },

  title: {
    fontSize: 26, fontWeight: '900', color: colors.text, marginBottom: 14,
    letterSpacing: 1,
  },

  timerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6,
  },
  timerLabel: { fontSize: 13, color: colors.textSub, fontWeight: '500' },
  timerValue: { fontSize: 18, fontWeight: '800', color: colors.primary },
  timerValueLong: { color: '#ff9800' },

  searchMsg: {
    fontSize: 13, color: colors.textLight, marginBottom: 20, textAlign: 'center',
  },

  goalBadge: {
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingVertical: 8, paddingHorizontal: 20,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 28,
    ...shadow,
  },
  goalText: { fontSize: 14, color: colors.text, fontWeight: '600' },

  tipBox: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: 18,
    marginBottom: 36,
    borderWidth: 1, borderColor: colors.border,
    maxWidth: 300,
  },
  tipText: { fontSize: 13, color: colors.textSub, textAlign: 'center', lineHeight: 20 },

  cancelButton: {
    paddingVertical: 12, paddingHorizontal: 36,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cancelText: { color: colors.textSub, fontSize: 16, fontWeight: '500' },
})
