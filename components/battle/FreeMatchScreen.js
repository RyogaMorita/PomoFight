import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import Icon from '../Icon'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../lib/theme'

const MAX_PLAYERS_OPTIONS = [2, 3, 4, 6, 8]

export default function FreeMatchScreen({ goal, onJoinRoom, onCancel }) {
  const { session } = useAuth()
  const [rooms, setRooms]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    cleanupStaleEntry()
    fetchRooms()
  }, [])

  async function cleanupStaleEntry() {
    const { data: stale } = await supabase
      .from('room_players')
      .select('room_id, rooms(status, is_public)')
      .eq('player_id', session.user.id)
    const toDelete = (stale ?? []).filter(
      r => r.rooms?.status === 'waiting' && r.rooms?.is_public
    )
    for (const r of toDelete) {
      await supabase.from('room_players')
        .delete()
        .eq('room_id', r.room_id)
        .eq('player_id', session.user.id)
    }
  }

  async function fetchRooms() {
    const { data } = await supabase
      .from('rooms')
      .select('*, room_players(player_id, profiles(username))')
      .eq('status', 'waiting')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30)
    setRooms(data ?? [])
    setLoading(false)
    setRefreshing(false)
  }

  async function joinRoom(room) {
    const alreadyIn = room.room_players.some(p => p.player_id === session.user.id)
    if (alreadyIn) { onJoinRoom(room); return }

    if (room.room_players.length >= room.max_players) {
      Alert.alert('満員です', 'この部屋はすでに満員です')
      return
    }

    await supabase.from('room_players').insert({
      room_id: room.id, player_id: session.user.id,
    })
    onJoinRoom(room)
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchRooms()
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.backBtn}>
          <Text style={styles.backText}>← 戻る</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Icon name="internet" size={20} />
          <Text style={styles.title}>フリーマッチ</Text>
        </View>
        <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(true)}>
          <Text style={styles.createBtnText}>＋ 作る</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.goalBadge}>目的: {goal}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={r => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏕️</Text>
              <Text style={styles.emptyText}>公開部屋がありません{'\n'}最初の部屋を作ろう！</Text>
            </View>
          }
          renderItem={({ item: room }) => {
            const count    = room.room_players?.length ?? 0
            const isFull   = count >= room.max_players
            const players  = room.room_players?.map(p => p.profiles?.username).filter(Boolean)
            return (
              <View style={[styles.roomCard, isFull && styles.roomCardFull]}>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomName}>{room.room_name || '名無し部屋'}</Text>
                  <Text style={styles.roomGoal}>🎯 {room.theme}</Text>
                  <Text style={styles.roomPlayers}>
                    {players?.slice(0, 3).join(', ')}{players?.length > 3 ? '...' : ''}
                  </Text>
                </View>
                <View style={styles.roomRight}>
                  <Text style={[styles.playerCount, isFull && styles.playerCountFull]}>
                    {count}/{room.max_players}人
                  </Text>
                  <TouchableOpacity
                    style={[styles.joinBtn, isFull && styles.joinBtnDisabled]}
                    onPress={() => !isFull && joinRoom(room)}
                    disabled={isFull}
                  >
                    <Text style={[styles.joinBtnText, isFull && styles.joinBtnTextDisabled]}>
                      {isFull ? '満員' : '参加'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}

      <CreateRoomModal
        visible={showCreate}
        goal={goal}
        session={session}
        onCreated={(room) => { setShowCreate(false); onJoinRoom(room) }}
        onClose={() => setShowCreate(false)}
      />
    </View>
  )
}

function CreateRoomModal({ visible, goal, session, onCreated, onClose }) {
  const [roomName, setRoomName]   = useState('')
  const [maxPlayers, setMaxPlayers] = useState(4)
  const [loading, setLoading]     = useState(false)

  async function createRoom() {
    if (!roomName.trim()) return
    setLoading(true)

    const { data: room } = await supabase
      .from('rooms')
      .insert({
        host_id: session.user.id,
        theme: goal,
        status: 'waiting',
        room_name: roomName.trim(),
        max_players: maxPlayers,
        is_public: true,
      })
      .select()
      .single()

    if (room) {
      await supabase.from('room_players').insert({
        room_id: room.id, player_id: session.user.id,
      })
      onCreated(room)
    }
    setLoading(false)
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTitleRow}>
            <Icon name="home" size={22} />
            <Text style={styles.modalTitle}>部屋を作る</Text>
          </View>
          <Text style={styles.modalGoal}>🎯 {goal}</Text>

          <Text style={styles.modalLabel}>部屋名</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="例：一緒に頑張ろう！"
            placeholderTextColor={colors.textLight}
            value={roomName}
            onChangeText={setRoomName}
            maxLength={20}
          />

          <Text style={styles.modalLabel}>最大人数</Text>
          <View style={styles.playerOptions}>
            {MAX_PLAYERS_OPTIONS.map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.playerOption, maxPlayers === n && styles.playerOptionActive]}
                onPress={() => setMaxPlayers(n)}
              >
                <Text style={[styles.playerOptionText, maxPlayers === n && styles.playerOptionTextActive]}>
                  {n}人
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.modalBtn, (!roomName.trim() || loading) && styles.modalBtnDisabled]}
            onPress={createRoom}
            disabled={!roomName.trim() || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.modalBtnText}>部屋を作る</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>キャンセル</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn:  { padding: 4 },
  backText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:    { fontSize: 18, fontWeight: 'bold', color: colors.text },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  createBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  goalBadge: {
    fontSize: 12, color: colors.primary, fontWeight: '600',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },

  list: { padding: 16, gap: 10 },

  roomCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  roomCardFull: { opacity: 0.6 },
  roomInfo:    { flex: 1, gap: 3 },
  roomName:    { fontSize: 16, fontWeight: '700', color: colors.text },
  roomGoal:    { fontSize: 12, color: colors.primary },
  roomPlayers: { fontSize: 11, color: colors.textSub },
  roomRight:   { alignItems: 'center', gap: 6 },
  playerCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  playerCountFull: { color: colors.textLight },
  joinBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 8, paddingHorizontal: 18,
  },
  joinBtnDisabled: { backgroundColor: colors.border },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  joinBtnTextDisabled: { color: colors.textLight },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: colors.textSub, fontSize: 15, textAlign: 'center', lineHeight: 24 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: 24, paddingBottom: 40,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  modalTitle:  { fontSize: 20, fontWeight: 'bold', color: colors.text },
  modalGoal:   { fontSize: 13, color: colors.primary, marginBottom: 20 },
  modalLabel:  { fontSize: 13, color: colors.textSub, fontWeight: '600', marginBottom: 8 },
  modalInput: {
    backgroundColor: colors.cardSub, borderRadius: radius.md,
    padding: 14, fontSize: 15, color: colors.text, marginBottom: 20,
    borderWidth: 1, borderColor: colors.border,
  },
  playerOptions: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  playerOption: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.cardSub, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  playerOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  playerOptionText:       { fontSize: 13, color: colors.textSub, fontWeight: '600' },
  playerOptionTextActive: { color: '#fff', fontWeight: '700' },
  modalBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center', marginBottom: 10, ...shadow,
  },
  modalBtnDisabled: { opacity: 0.4 },
  modalBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  modalCancel: { paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { color: colors.textLight, fontSize: 15 },
})
