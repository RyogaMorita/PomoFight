import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import RankingModal from '../../components/RankingModal'
import TreeDisplay from '../../components/TreeDisplay'
import { colors, radius, shadow } from '../../lib/theme'

function StatBadge({ label, value }) {
  return (
    <View style={styles.statBadge}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

export default function HomeScreen() {
  const { profile } = useAuth()
  const [showRanking, setShowRanking] = useState(false)
  const wins = profile?.wins ?? 0
  const losses = profile?.losses ?? 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <RankingModal visible={showRanking} onClose={() => setShowRanking(false)} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>おかえり 👋</Text>
          <Text style={styles.username}>{profile?.username ?? '---'}</Text>
        </View>
        <TouchableOpacity style={styles.rankBadge} onPress={() => setShowRanking(true)}>
          <Text style={styles.rankBadgeText}>🏆 {profile?.rank ?? 0}</Text>
        </TouchableOpacity>
      </View>

      {/* 木カード */}
      <TreeDisplay totalPomodoros={profile?.total_pomodoros ?? 0} size="large" />

      {/* 統計 */}
      <View style={styles.statsCard}>
        <StatBadge label="ポモドーロ" value={`${profile?.total_pomodoros ?? 0}`} />
        <View style={styles.divider} />
        <StatBadge label="勝利" value={`${wins}勝`} />
        <View style={styles.divider} />
        <StatBadge label="敗北" value={`${losses}敗`} />
        <View style={styles.divider} />
        <StatBadge
          label="勝率"
          value={wins + losses > 0 ? `${Math.round(wins / (wins + losses) * 100)}%` : '-'}
        />
      </View>

      {/* バトルボタン */}
      <TouchableOpacity style={styles.battleButton}>
        <Text style={styles.battleButtonText}>⚔️  バトル開始</Text>
      </TouchableOpacity>

      <View style={styles.subButtons}>
        <TouchableOpacity style={styles.subButton}>
          <Text style={styles.subButtonText}>👥 フレンド対戦</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subButton}>
          <Text style={styles.subButtonText}>🚪 部屋を作る</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  greeting: { fontSize: 13, color: colors.textSub, marginBottom: 2 },
  username: { fontSize: 24, fontWeight: 'bold', color: colors.text },
  rankBadge: {
    backgroundColor: colors.card, borderRadius: radius.full,
    paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  rankBadgeText: { fontSize: 14, color: colors.gold, fontWeight: '600' },

  statsCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, flexDirection: 'row', alignItems: 'center',
    marginTop: 16, marginBottom: 20, ...shadow,
  },
  statBadge: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  divider: { width: 1, height: 32, backgroundColor: colors.border },

  battleButton: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12, ...shadow,
  },
  battleButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

  subButtons: { flexDirection: 'row', gap: 10 },
  subButton: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  subButtonText: { color: colors.textSub, fontSize: 14 },
})
