import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { colors, radius, shadow } from '../lib/theme'

const RANK_TIERS = [
  { min: 2000, label: '👑 LEGEND', color: '#ff6b35' },
  { min: 1500, label: '💎 DIAMOND', color: '#00d4ff' },
  { min: 1000, label: '🏅 GOLD', color: colors.gold },
  { min: 500,  label: '🥈 SILVER', color: '#a0a0a0' },
  { min: 0,    label: '🥉 BRONZE', color: '#cd7f32' },
]
function getTier(rank) {
  return RANK_TIERS.find(t => rank >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1]
}

export default function RankingModal({ visible, onClose }) {
  const { session } = useAuth()
  const [tab, setTab]           = useState('pomo')
  const [pomoRank, setPomoRank] = useState([])
  const [rateRank, setRateRank] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (visible) fetchAll()
  }, [visible])

  async function fetchAll() {
    setLoading(true)
    await Promise.all([fetchPomoRankings(), fetchRateRankings()])
    setLoading(false)
  }

  async function fetchPomoRankings() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: logs } = await supabase
      .from('pomodoro_logs')
      .select('user_id')
      .gte('created_at', today.toISOString())

    if (!logs?.length) { setPomoRank([]); return }

    // user_idごとにカウント
    const countMap = {}
    for (const row of logs) {
      countMap[row.user_id] = (countMap[row.user_id] ?? 0) + 1
    }

    const userIds = Object.keys(countMap)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)

    const result = (profiles ?? []).map(p => ({
      id: p.id, username: p.username, count: countMap[p.id] ?? 0,
    })).sort((a, b) => b.count - a.count).slice(0, 50)

    setPomoRank(result)
  }

  async function fetchRateRankings() {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, rank, wins, losses')
      .order('rank', { ascending: false })
      .limit(50)
    setRateRank(data ?? [])
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🏆 ランキング</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* タブ切り替え */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'pomo' && styles.tabBtnActive]}
            onPress={() => setTab('pomo')}
          >
            <Text style={[styles.tabBtnText, tab === 'pomo' && styles.tabBtnTextActive]}>
              🍅 今日のポモ数
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'rate' && styles.tabBtnActive]}
            onPress={() => setTab('rate')}
          >
            <Text style={[styles.tabBtnText, tab === 'rate' && styles.tabBtnTextActive]}>
              🏅 レート
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : tab === 'pomo' ? (
          <ScrollView contentContainerStyle={styles.list}>
            {pomoRank.length === 0 ? (
              <Text style={styles.empty}>今日のポモドーロ記録がまだありません</Text>
            ) : pomoRank.map((user, index) => {
              const isMe = user.id === session?.user?.id
              return (
                <View key={user.id} style={[styles.row, isMe && styles.rowMe]}>
                  <Text style={styles.position}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                  </Text>
                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.username}>{user.username}</Text>
                      {isMe && <Text style={styles.meTag}>YOU</Text>}
                    </View>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankNum}>{user.count}</Text>
                    <Text style={styles.wl}>ポモドーロ</Text>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {rateRank.map((user, index) => {
              const tier = getTier(user.rank)
              const isMe = user.id === session?.user?.id
              return (
                <View key={user.id} style={[styles.row, isMe && styles.rowMe]}>
                  <Text style={styles.position}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                  </Text>
                  <View style={styles.userInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.username}>{user.username}</Text>
                      {isMe && <Text style={styles.meTag}>YOU</Text>}
                    </View>
                    <Text style={[styles.tier, { color: tier.color }]}>{tier.label}</Text>
                  </View>
                  <View style={styles.rankInfo}>
                    <Text style={styles.rankNum}>{user.rank}</Text>
                    <Text style={styles.wl}>{user.wins}勝{user.losses}敗</Text>
                  </View>
                </View>
              )
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  close: { fontSize: 20, color: colors.textSub, padding: 4 },

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 8, gap: 8,
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, borderRadius: radius.md,
    alignItems: 'center', backgroundColor: colors.cardSub,
    borderWidth: 1, borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSub },
  tabBtnTextActive: { color: '#fff' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.textLight, marginTop: 40, fontSize: 14 },
  list: { padding: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 14, marginBottom: 8, ...shadow,
  },
  rowMe: { borderWidth: 1.5, borderColor: colors.primary },
  position: { fontSize: 18, width: 36, textAlign: 'center' },
  userInfo: { flex: 1, marginLeft: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { fontSize: 16, fontWeight: '600', color: colors.text },
  meTag: {
    backgroundColor: colors.primary, borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1,
    fontSize: 10, color: '#fff', fontWeight: 'bold',
  },
  tier: { fontSize: 12, marginTop: 2 },
  rankInfo: { alignItems: 'flex-end' },
  rankNum: { fontSize: 18, fontWeight: 'bold', color: colors.gold },
  wl: { fontSize: 11, color: colors.textLight, marginTop: 2 },
})
