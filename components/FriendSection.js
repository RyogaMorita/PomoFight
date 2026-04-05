import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, ScrollView
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function FriendSection() {
  const { session, profile } = useAuth()
  const [friends, setFriends] = useState([])
  const [pending, setPending] = useState([])
  const [searchCode, setSearchCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('friends') // friends | add

  useEffect(() => {
    fetchFriends()
  }, [])

  async function fetchFriends() {
    // 承認済みフレンド
    const { data: accepted } = await supabase
      .from('friends')
      .select('friend_id, profiles!friends_friend_id_fkey(username, rank)')
      .eq('user_id', session.user.id)
      .eq('status', 'accepted')

    // 受信中のリクエスト
    const { data: requests } = await supabase
      .from('friends')
      .select('id, user_id, profiles!friends_user_id_fkey(username, rank)')
      .eq('friend_id', session.user.id)
      .eq('status', 'pending')

    setFriends(accepted ?? [])
    setPending(requests ?? [])
  }

  async function searchAndAdd() {
    if (!searchCode.trim()) return
    setLoading(true)

    const { data: target } = await supabase
      .from('profiles')
      .select('id, username, rank')
      .eq('id', searchCode.trim())
      .single()

    if (!target) {
      Alert.alert('見つかりません', 'フレンドコードを確認してください')
      setLoading(false)
      return
    }

    if (target.id === session.user.id) {
      Alert.alert('エラー', '自分自身には送れません')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('friends').insert({
      user_id: session.user.id,
      friend_id: target.id,
      status: 'pending',
    })

    setLoading(false)
    if (error?.code === '23505') {
      Alert.alert('すでに送信済みです')
    } else if (error) {
      Alert.alert('エラー', error.message)
    } else {
      Alert.alert('送信しました！', `${target.username} にフレンド申請を送りました`)
      setSearchCode('')
    }
  }

  async function acceptFriend(requestId, userId) {
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', requestId)
    // 双方向に登録
    await supabase.from('friends').insert({
      user_id: session.user.id,
      friend_id: userId,
      status: 'accepted',
    })
    fetchFriends()
  }

  async function rejectFriend(requestId) {
    await supabase.from('friends').delete().eq('id', requestId)
    fetchFriends()
  }

  const myCode = session?.user?.id ?? ''

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>👥 フレンド</Text>

      {/* 自分のコード */}
      <View style={styles.myCode}>
        <Text style={styles.myCodeLabel}>マイフレンドコード</Text>
        <Text style={styles.myCodeValue} numberOfLines={1} ellipsizeMode="middle">
          {myCode}
        </Text>
        <Text style={styles.myCodeHint}>相手に共有してフレンド申請してもらおう</Text>
      </View>

      {/* タブ */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'friends' && styles.tabBtnActive]}
          onPress={() => setTab('friends')}
        >
          <Text style={[styles.tabText, tab === 'friends' && styles.tabTextActive]}>
            フレンド ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'add' && styles.tabBtnActive]}
          onPress={() => setTab('add')}
        >
          <Text style={[styles.tabText, tab === 'add' && styles.tabTextActive]}>
            追加 {pending.length > 0 ? `🔴${pending.length}` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'friends' && (
        <View>
          {friends.length === 0 ? (
            <Text style={styles.empty}>まだフレンドがいません</Text>
          ) : (
            friends.map(f => (
              <View key={f.friend_id} style={styles.friendRow}>
                <View>
                  <Text style={styles.friendName}>{f.profiles.username}</Text>
                  <Text style={styles.friendRank}>Rank {f.profiles.rank}</Text>
                </View>
                <TouchableOpacity style={styles.battleBtn}>
                  <Text style={styles.battleBtnText}>⚔️ 対戦</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'add' && (
        <View>
          {/* 受信リクエスト */}
          {pending.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.pendingTitle}>フレンド申請</Text>
              {pending.map(r => (
                <View key={r.id} style={styles.pendingRow}>
                  <View>
                    <Text style={styles.friendName}>{r.profiles.username}</Text>
                    <Text style={styles.friendRank}>Rank {r.profiles.rank}</Text>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => acceptFriend(r.id, r.user_id)}
                    >
                      <Text style={styles.acceptText}>承認</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => rejectFriend(r.id)}
                    >
                      <Text style={styles.rejectText}>拒否</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* 検索・追加 */}
          <Text style={styles.addLabel}>フレンドコードで追加</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="フレンドコードを貼り付け"
            placeholderTextColor="#555"
            value={searchCode}
            onChangeText={setSearchCode}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.addBtn, (!searchCode || loading) && styles.addBtnDisabled]}
            onPress={searchAndAdd}
            disabled={!searchCode || loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.addBtnText}>申請を送る</Text>
            }
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },

  myCode: {
    backgroundColor: '#2a2a4a', borderRadius: 12, padding: 14, marginBottom: 16,
  },
  myCodeLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
  myCodeValue: { fontSize: 13, color: '#4CAF50', fontFamily: 'monospace', marginBottom: 4 },
  myCodeHint: { fontSize: 11, color: '#555' },

  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tabBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    backgroundColor: '#2a2a4a', alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#4CAF50' },
  tabText: { color: '#888', fontSize: 13 },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },

  empty: { color: '#555', textAlign: 'center', padding: 20 },

  friendRow: {
    backgroundColor: '#2a2a4a', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  friendName: { fontSize: 15, fontWeight: '600', color: '#fff' },
  friendRank: { fontSize: 12, color: '#ffd700', marginTop: 2 },
  battleBtn: {
    backgroundColor: '#4CAF50', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  battleBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  pendingSection: { marginBottom: 16 },
  pendingTitle: { fontSize: 13, color: '#aaa', marginBottom: 8 },
  pendingRow: {
    backgroundColor: '#2a2a4a', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  },
  pendingActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: '#4CAF50', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  acceptText: { color: '#fff', fontSize: 13 },
  rejectBtn: {
    backgroundColor: '#3a3a5a', borderRadius: 8,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  rejectText: { color: '#aaa', fontSize: 13 },

  addLabel: { fontSize: 13, color: '#aaa', marginBottom: 8 },
  searchInput: {
    backgroundColor: '#2a2a4a', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 14, marginBottom: 10,
  },
  addBtn: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
})
