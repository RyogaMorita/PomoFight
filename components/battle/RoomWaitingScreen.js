import { useState, useEffect, useRef } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Share, ActivityIndicator
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../lib/theme'

export default function RoomWaitingScreen({ room, onStart, onCancel }) {
  const { session } = useAuth()
  const [players, setPlayers]     = useState([])
  const [starting, setStarting]   = useState(false)
  const channelRef = useRef(null)

  const isHost = room.host_id === session.user.id
  const maxPlayers = room.max_players ?? 2
  const isFull = players.length >= maxPlayers

  useEffect(() => {
    fetchPlayers()
    subscribeToRoom()
    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [])

  async function fetchPlayers() {
    const { data } = await supabase
      .from('room_players')
      .select('player_id, profiles(username, rank)')
      .eq('room_id', room.id)
    setPlayers(data ?? [])
  }

  function subscribeToRoom() {
    const channel = supabase
      .channel(`waiting-${room.id}`)
      // 誰かが参加 → プレイヤー一覧を更新
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${room.id}`,
      }, () => fetchPlayers())
      // ホストがバトル開始 → 全員 onStart へ
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        if (payload.new.status === 'active') {
          channel.unsubscribe()
          onStart()
        }
      })
      .subscribe()
    channelRef.current = channel
  }

  async function startBattle() {
    setStarting(true)
    await supabase.from('rooms').update({ status: 'active' }).eq('id', room.id)
    // subscribeToRoom の UPDATE で全員 onStart が呼ばれる
  }

  async function leaveRoom() {
    await supabase.from('room_players')
      .delete()
      .eq('room_id', room.id)
      .eq('player_id', session.user.id)
    if (isHost) {
      await supabase.from('rooms').delete().eq('id', room.id)
    }
    onCancel()
  }

  async function shareCode() {
    const code = room.invite_code
    if (code) {
      await Share.share({ message: `PomoFightのフレンドバトルに招待！\n合言葉: ${code}\n部屋名: ${room.room_name ?? ''}` })
    }
  }

  return (
    <View style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={leaveRoom} style={styles.backBtn}>
          <Text style={styles.backText}>← 退出</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{room.room_name ?? '対戦ロビー'}</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* 部屋情報 */}
      <View style={styles.roomInfo}>
        <View style={styles.roomInfoRow}>
          <Text style={styles.roomInfoLabel}>🎯 目的</Text>
          <Text style={styles.roomInfoValue}>{room.theme}</Text>
        </View>
        <View style={styles.roomInfoRow}>
          <Text style={styles.roomInfoLabel}>👥 定員</Text>
          <Text style={styles.roomInfoValue}>{players.length} / {maxPlayers}人</Text>
        </View>
        {room.invite_code && (
          <View style={styles.roomInfoRow}>
            <Text style={styles.roomInfoLabel}>🔑 招待コード</Text>
            <TouchableOpacity onPress={shareCode} style={styles.codeWrap}>
              <Text style={styles.inviteCode}>{room.invite_code}</Text>
              <Text style={styles.shareHint}>📤 共有</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* プレイヤー一覧 */}
      <Text style={styles.sectionTitle}>参加者</Text>
      <FlatList
        data={players}
        keyExtractor={p => p.player_id}
        contentContainerStyle={styles.playerList}
        renderItem={({ item, index }) => (
          <View style={styles.playerRow}>
            <View style={styles.playerAvatar}>
              <Text style={styles.playerAvatarText}>{index + 1}</Text>
            </View>
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>
                {item.profiles?.username ?? '---'}
                {item.player_id === room.host_id ? '  👑 ホスト' : ''}
                {item.player_id === session.user.id ? '  （あなた）' : ''}
              </Text>
              <Text style={styles.playerRank}>Rank {item.profiles?.rank ?? 0}</Text>
            </View>
            <Text style={styles.playerReady}>✅</Text>
          </View>
        )}
        ListFooterComponent={
          players.length < maxPlayers ? (
            <View style={styles.emptySlot}>
              <Text style={styles.emptySlotText}>待機中...</Text>
            </View>
          ) : null
        }
      />

      {/* ボタン */}
      <View style={styles.footer}>
        {isHost ? (
          <>
            {!isFull && (
              <Text style={styles.waitingHint}>
                あと{maxPlayers - players.length}人参加すると開始できます（今すぐ開始も可）
              </Text>
            )}
            <TouchableOpacity
              style={[styles.startBtn, starting && styles.startBtnDisabled]}
              onPress={startBattle}
              disabled={starting || players.length < 2}
            >
              {starting
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.startBtnText}>⚔️ バトル開始！（{players.length}人）</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.waitingBox}>
            <ActivityIndicator color={colors.primary} style={{ marginRight: 10 }} />
            <Text style={styles.waitingText}>ホストの開始を待っています...</Text>
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn:     { width: 60 },
  backText:    { fontSize: 15, color: colors.danger, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: colors.text },

  roomInfo: {
    backgroundColor: colors.card, padding: 16, gap: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  roomInfoRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomInfoLabel: { fontSize: 13, color: colors.textSub, fontWeight: '600' },
  roomInfoValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  codeWrap:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inviteCode:    { fontSize: 18, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
  shareHint:     { fontSize: 12, color: colors.textSub },

  sectionTitle: {
    fontSize: 12, color: colors.textLight, fontWeight: '700',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    letterSpacing: 1,
  },
  playerList: { paddingHorizontal: 16, gap: 8 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 12, borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  playerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  playerAvatarText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  playerInfo:  { flex: 1 },
  playerName:  { fontSize: 15, fontWeight: '700', color: colors.text },
  playerRank:  { fontSize: 11, color: colors.textSub, marginTop: 2 },
  playerReady: { fontSize: 18 },

  emptySlot: {
    borderRadius: radius.md, padding: 12,
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    alignItems: 'center', marginTop: 4,
  },
  emptySlotText: { color: colors.textLight, fontSize: 13 },

  footer: {
    padding: 16, paddingBottom: 32,
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  waitingHint: {
    fontSize: 12, color: colors.textSub, textAlign: 'center', marginBottom: 10,
  },
  startBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center', ...shadow,
  },
  startBtnDisabled: { opacity: 0.5 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  waitingBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.cardSub, borderRadius: radius.lg,
    paddingVertical: 18, borderWidth: 1, borderColor: colors.border,
  },
  waitingText: { fontSize: 15, color: colors.textSub, fontWeight: '600' },
})
