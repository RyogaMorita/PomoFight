import { useState, useEffect, useCallback, useRef } from 'react'
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

export default function FreeMatchScreen({ goal, onJoinRoom, onJoinCode, onCancel }) {
  const { session } = useAuth()
  const [rooms, setRooms]           = useState([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [tab, setTab]               = useState('waiting')

  const channelRef = useRef(null)
  const pollRef    = useRef(null)

  useEffect(() => {
    async function init() {
      await cleanupStaleEntry()
      fetchRooms()
    }
    init()
    subscribeToRooms()
    pollRef.current = setInterval(fetchRooms, 8000)
    return () => {
      channelRef.current?.unsubscribe()
      clearInterval(pollRef.current)
    }
  }, [])

  function subscribeToRooms() {
    channelRef.current = supabase
      .channel('free-match-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, fetchRooms)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players' }, fetchRooms)
      .subscribe()
  }

  async function cleanupStaleEntry() {
    // 自分がホストの待機中部屋をすべて削除
    const { data: hosted } = await supabase
      .from('rooms')
      .select('id')
      .eq('host_id', session.user.id)
      .eq('status', 'waiting')
    for (const r of (hosted ?? [])) {
      await supabase.from('room_players').delete().eq('room_id', r.id)
      await supabase.from('rooms').delete().eq('id', r.id)
    }
    // 残存する自分のroom_playersエントリを削除
    const { data: stale } = await supabase
      .from('room_players')
      .select('room_id, rooms(status)')
      .eq('player_id', session.user.id)
    const toDelete = (stale ?? []).filter(r => r.rooms?.status === 'waiting')
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
      .in('status', ['waiting', 'active'])
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(30)
    // 自分がホストの部屋はリストから除外
    setRooms((data ?? []).filter(r => r.host_id !== session.user.id))
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

    const { error: insertError } = await supabase.from('room_players').insert({
      room_id: room.id, player_id: session.user.id,
    })
    if (insertError) {
      Alert.alert('参加できませんでした', '通信状態を確認してもう一度お試しください')
      return
    }

    const { count } = await supabase
      .from('room_players')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', room.id)
    if ((count ?? 0) > room.max_players) {
      await supabase.from('room_players')
        .delete()
        .eq('room_id', room.id)
        .eq('player_id', session.user.id)
      Alert.alert('満員です', '少し前に定員に達しました')
      fetchRooms()
      return
    }
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
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.titleRow}>
          <Icon name="internet" size={18} />
          <Text style={styles.title}>フリーマッチ</Text>
          <View style={styles.infoBadge}>
            <Text style={styles.infoBadgeText}>i</Text>
          </View>
        </View>
        <View style={{ width: 42 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'waiting' && styles.tabButtonActive]}
          onPress={() => setTab('waiting')}
        >
          <Text style={[styles.tabText, tab === 'waiting' && styles.tabTextActive]}>募集中</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'active' && styles.tabButtonInactiveActive]}
          onPress={() => setTab('active')}
        >
          <Text style={[styles.tabText, tab === 'active' && styles.tabTextDark]}>対戦中</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.goalBadge}>目的: {goal}</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#12c95b" />
        </View>
      ) : (
        <FlatList
          data={rooms.filter(r => tab === 'waiting' ? r.status === 'waiting' : r.status === 'active')}
          keyExtractor={r => r.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#12c95b" />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🏕️</Text>
              <Text style={styles.emptyText}>
                {tab === 'waiting' ? '公開部屋がありません\n最初の部屋を作ろう！' : '対戦中の部屋はありません'}
              </Text>
            </View>
          }
          renderItem={({ item: room }) => {
            const count    = room.room_players?.length ?? 0
            const isFull   = count >= room.max_players
            const players  = room.room_players?.map(p => p.profiles?.username).filter(Boolean)
            const canJoin  = room.status === 'waiting' && !isFull
            return (
              <View style={[styles.roomCard, isFull && styles.roomCardFull]}>
                <View style={styles.roomThumb}>
                  <Text style={styles.roomThumbText}>{(room.room_name || room.theme || 'P').slice(0, 1)}</Text>
                </View>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomName}>{room.room_name || '名無し部屋'}</Text>
                  <Text style={styles.roomGoal} numberOfLines={1}>{room.theme || '目的未設定'}</Text>
                  <View style={styles.roomMetaRow}>
                    <Text style={styles.ruleTag}>ルール</Text>
                    <Text style={styles.roomMeta}>開始 {Math.max(2, room.max_players ?? 2)}人</Text>
                    <Text style={styles.roomMeta}>参加人数 <Text style={styles.roomMetaHot}>{count}人</Text></Text>
                  </View>
                  {!!players?.length && (
                    <Text style={styles.roomPlayers} numberOfLines={1}>
                      {players.slice(0, 3).join(', ')}{players.length > 3 ? '...' : ''}
                    </Text>
                  )}
                </View>
                <View style={styles.roomRight}>
                  <TouchableOpacity
                    style={[styles.joinBtn, !canJoin && styles.joinBtnDisabled]}
                    onPress={() => canJoin && joinRoom(room)}
                    disabled={!canJoin}
                  >
                    <Text style={[styles.joinBtnText, !canJoin && styles.joinBtnTextDisabled]}>
                      {room.status === 'active' ? '対戦中' : isFull ? '満員' : '入室'}
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

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.bottomButton} onPress={() => setShowCreate(true)}>
          <Text style={styles.bottomButtonText}>ルーム作成</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomButton} onPress={onJoinCode}>
          <Text style={styles.bottomButtonText}>ルームID入力</Text>
        </TouchableOpacity>
      </View>
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

    const { data: room, error } = await supabase
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

    if (room && !error) {
      const { error: playerError } = await supabase.from('room_players').insert({
        room_id: room.id, player_id: session.user.id,
      })
      if (playerError) {
        await supabase.from('rooms').delete().eq('id', room.id)
        Alert.alert('エラー', '部屋への参加に失敗しました')
        setLoading(false)
        return
      }
      onCreated(room)
    } else {
      Alert.alert('エラー', '部屋の作成に失敗しました')
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
  container: { flex: 1, backgroundColor: '#ffc20d' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingTop: 48, paddingBottom: 10,
    backgroundColor: '#ffc20d',
  },
  backBtn:  {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#67b7ff',
  },
  backText: { fontSize: 30, lineHeight: 30, color: '#2386dc', fontWeight: '900' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    fontSize: 19, fontWeight: '900', color: colors.text,
    backgroundColor: '#fff', paddingVertical: 5, paddingHorizontal: 14,
    borderRadius: radius.full, borderWidth: 2, borderColor: '#e4b100',
  },
  infoBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#d8a000',
  },
  infoBadgeText: { color: colors.textSub, fontSize: 13, fontWeight: '900' },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  createBtn: {
    backgroundColor: colors.primary, borderRadius: radius.full,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: 220,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 2,
    borderColor: '#d79b00',
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabButtonActive: { backgroundColor: '#16d765' },
  tabButtonInactiveActive: { backgroundColor: '#f0f4ff' },
  tabText: { fontSize: 13, fontWeight: '900', color: colors.textLight },
  tabTextActive: { color: '#fff' },
  tabTextDark: { color: colors.text },

  goalBadge: {
    fontSize: 12, color: '#865c00', fontWeight: '800',
    paddingHorizontal: 18, paddingVertical: 6,
  },

  list: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 104, gap: 8 },

  roomCard: {
    backgroundColor: colors.card,
    borderRadius: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f2d565',
    borderBottomWidth: 5,
    borderBottomColor: '#d6a900',
    minHeight: 90,
    ...shadow,
  },
  roomCardFull: { opacity: 0.6 },
  roomThumb: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#dcefff',
    borderWidth: 2, borderColor: '#d7d7d7',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  roomThumbText: { fontSize: 26, fontWeight: '900', color: '#5c9dde' },
  roomInfo:    { flex: 1, gap: 3, minWidth: 0 },
  roomName:    { fontSize: 17, fontWeight: '900', color: colors.text },
  roomGoal:    { fontSize: 12, color: colors.textSub, fontWeight: '700' },
  roomMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  ruleTag: {
    color: colors.textSub, fontSize: 10, fontWeight: '900',
    borderWidth: 1.5, borderColor: '#b8b8b8',
    borderRadius: radius.sm,
    paddingVertical: 1, paddingHorizontal: 6,
    backgroundColor: '#fff',
  },
  roomMeta: { fontSize: 11, color: colors.textSub, fontWeight: '900' },
  roomMetaHot: { color: '#ff8a00' },
  roomPlayers: { fontSize: 10, color: colors.textLight, fontWeight: '700' },
  roomRight:   { alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  playerCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  playerCountFull: { color: colors.textLight },
  joinBtn: {
    backgroundColor: '#13cf5c',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 17,
    borderWidth: 2,
    borderColor: '#0aaf45',
    borderBottomWidth: 5,
    borderBottomColor: '#078335',
  },
  joinBtnDisabled: { backgroundColor: '#cfd5d8', borderColor: '#aab1b5', borderBottomColor: '#8e979d' },
  joinBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  joinBtnTextDisabled: { color: '#fff' },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#815900', fontSize: 15, textAlign: 'center', lineHeight: 24, fontWeight: '800' },

  bottomBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 18,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  bottomButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#b8c0d0',
    borderBottomWidth: 5,
    borderBottomColor: '#8f98aa',
    ...shadow,
  },
  bottomButtonText: { color: colors.text, fontSize: 16, fontWeight: '900' },

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
