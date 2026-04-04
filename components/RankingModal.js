import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, ActivityIndicator
} from 'react-native'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const RANK_TIERS = [
  { min: 2000, label: '👑 LEGEND', color: '#ff6b35' },
  { min: 1500, label: '💎 DIAMOND', color: '#00d4ff' },
  { min: 1000, label: '🏅 GOLD', color: '#ffd700' },
  { min: 500, label: '🥈 SILVER', color: '#c0c0c0' },
  { min: 0, label: '🥉 BRONZE', color: '#cd7f32' },
]

function getTier(rank) {
  return RANK_TIERS.find(t => rank >= t.min) ?? RANK_TIERS[RANK_TIERS.length - 1]
}

export default function RankingModal({ visible, onClose }) {
  const { session } = useAuth()
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (visible) fetchRankings()
  }, [visible])

  async function fetchRankings() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, username, rank, wins, losses, total_pomodoros')
      .order('rank', { ascending: false })
      .limit(50)
    setRankings(data ?? [])
    setLoading(false)
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🏆 ワールドランキング</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#4CAF50" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {rankings.map((user, index) => {
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
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 56, borderBottomWidth: 1, borderBottomColor: '#2a2a4a',
  },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  close: { fontSize: 20, color: '#666', padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#2a2a4a', borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  rowMe: { borderWidth: 1.5, borderColor: '#4CAF50' },
  position: { fontSize: 18, width: 36, textAlign: 'center' },
  userInfo: { flex: 1, marginLeft: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  username: { fontSize: 16, fontWeight: '600', color: '#fff' },
  meTag: {
    backgroundColor: '#4CAF50', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 1,
    fontSize: 10, color: '#fff', fontWeight: 'bold',
  },
  tier: { fontSize: 12, marginTop: 2 },
  rankInfo: { alignItems: 'flex-end' },
  rankNum: { fontSize: 18, fontWeight: 'bold', color: '#ffd700' },
  wl: { fontSize: 11, color: '#666', marginTop: 2 },
})
