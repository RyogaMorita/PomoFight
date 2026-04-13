import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Animated, Share } from 'react-native'
import Icon from '../Icon'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../lib/theme'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function CreateRoomScreen({ goal, onMatched, onCancel }) {
  const { session } = useAuth()
  const [code, setCode] = useState('')
  const [shared, setShared] = useState(false)
  const roomRef = useRef(null)
  const channelRef = useRef(null)
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    createRoom()
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start()
    return () => cleanup()
  }, [])

  async function createRoom() {
    const inviteCode = generateCode()
    const { data: room } = await supabase
      .from('rooms')
      .insert({ host_id: session.user.id, theme: goal, status: 'waiting', invite_code: inviteCode })
      .select()
      .single()

    if (!room) return
    roomRef.current = room.id
    setCode(inviteCode)

    await supabase.from('room_players').insert({
      room_id: room.id, player_id: session.user.id,
    })

    const channel = supabase
      .channel(`room-${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        if (payload.new.status === 'active') {
          channel.unsubscribe()
          onMatched({ id: room.id, opponentGoal: null })
        }
      })
      .subscribe()
    channelRef.current = channel
  }

  async function cleanup() {
    channelRef.current?.unsubscribe()
    if (roomRef.current) {
      await supabase.from('rooms').delete().eq('id', roomRef.current).eq('status', 'waiting')
    }
  }

  async function shareCode() {
    await Share.share({ message: `PomoFightのフレンドバトルに招待！\n合言葉: ${code}` })
    setShared(true)
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Icon name="home" size={26} />
        <Text style={styles.title}>部屋を作る</Text>
      </View>
      <Text style={styles.goal}>目的: {goal}</Text>
      <Text style={styles.sub}>このコードを友達に教えよう</Text>

      <Animated.View style={[styles.codeCard, { transform: [{ scale: pulse }] }]}>
        {code ? (
          code.split('').map((char, i) => (
            <View key={i} style={styles.codeChar}>
              <Text style={styles.codeCharText}>{char}</Text>
            </View>
          ))
        ) : (
          Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={[styles.codeChar, styles.codeCharEmpty]}>
              <Text style={styles.codeCharText}>-</Text>
            </View>
          ))
        )}
      </Animated.View>

      <TouchableOpacity style={[styles.shareBtn, shared && styles.shareBtnDone]} onPress={shareCode}>
        <Text style={styles.shareBtnText}>{shared ? '✓ 送信済み' : '📤 コードを共有'}</Text>
      </TouchableOpacity>

      <View style={styles.waitingBox}>
        <Animated.Text style={[styles.waitingDot, { opacity: pulse }]}>●</Animated.Text>
        <Text style={styles.waitingText}>友達の参加を待っています...</Text>
      </View>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => { cleanup(); onCancel() }}>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  title:  { fontSize: 26, fontWeight: 'bold', color: colors.text },
  goal:   { fontSize: 14, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  sub:    { fontSize: 14, color: colors.textSub, marginBottom: 32 },

  codeCard: {
    flexDirection: 'row', gap: 8, marginBottom: 28,
  },
  codeChar: {
    width: 44, height: 56, borderRadius: radius.md,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.primary, ...shadow,
  },
  codeCharEmpty: { borderColor: colors.border },
  codeCharText: { fontSize: 24, fontWeight: '900', color: colors.primary, letterSpacing: 0 },

  shareBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: 40, marginBottom: 32, ...shadow,
  },
  shareBtnDone: { backgroundColor: colors.textLight },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  waitingBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderRadius: radius.lg,
    paddingVertical: 14, paddingHorizontal: 24,
    marginBottom: 32, borderWidth: 1, borderColor: colors.border,
  },
  waitingDot:  { fontSize: 10, color: colors.primary },
  waitingText: { fontSize: 14, color: colors.textSub },

  cancelBtn: {
    paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cancelText: { color: colors.textSub, fontSize: 16 },
})
