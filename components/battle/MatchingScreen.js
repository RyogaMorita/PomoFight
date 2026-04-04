import { useEffect, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export default function MatchingScreen({ goal, onMatched, onCancel }) {
  const { session, profile } = useAuth()
  const pulse = useRef(new Animated.Value(1)).current
  const roomRef = useRef(null)

  useEffect(() => {
    // ドットのアニメーション
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start()

    startMatching()
    return () => cleanup()
  }, [])

  async function startMatching() {
    // 待機中の部屋を探す
    const { data: waitingRooms } = await supabase
      .from('rooms')
      .select('*, room_players(*)')
      .eq('status', 'waiting')
      .lt('created_at', new Date(Date.now() - 2000).toISOString()) // 2秒以上前の部屋
      .limit(1)

    const waitingRoom = waitingRooms?.find(r => r.room_players.length === 1 &&
      r.room_players[0].player_id !== session.user.id)

    if (waitingRoom) {
      // 既存の部屋に参加
      await supabase.from('room_players').insert({
        room_id: waitingRoom.id,
        player_id: session.user.id,
      })
      await supabase.from('rooms').update({ status: 'active' }).eq('id', waitingRoom.id)
      roomRef.current = waitingRoom.id
      onMatched({ id: waitingRoom.id, opponentGoal: waitingRoom.theme })
    } else {
      // 新しい部屋を作成して待機
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

        // 相手が入るのを待つ
        const channel = supabase
          .channel(`room-${newRoom.id}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'rooms',
            filter: `id=eq.${newRoom.id}`
          }, (payload) => {
            if (payload.new.status === 'active') {
              channel.unsubscribe()
              onMatched({ id: newRoom.id, opponentGoal: null })
            }
          })
          .subscribe()
      }
    }
  }

  async function cleanup() {
    if (roomRef.current) {
      // キャンセル時は部屋を削除
      await supabase.from('rooms').delete().eq('id', roomRef.current).eq('status', 'waiting')
    }
  }

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.icon, { transform: [{ scale: pulse }] }]}>⚔️</Animated.Text>
      <Text style={styles.title}>マッチング中...</Text>
      <Text style={styles.goal}>目的: {goal}</Text>
      <Text style={styles.sub}>対戦相手を探しています</Text>

      <TouchableOpacity style={styles.cancelButton} onPress={() => { cleanup(); onCancel() }}>
        <Text style={styles.cancelText}>キャンセル</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  icon: { fontSize: 64, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  goal: { fontSize: 16, color: '#4CAF50', marginBottom: 8 },
  sub: { fontSize: 14, color: '#666', marginBottom: 48 },
  cancelButton: {
    paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: 12, borderWidth: 1, borderColor: '#3a3a5a',
  },
  cancelText: { color: '#aaa', fontSize: 16 },
})
