import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '../../context/AuthContext'
import RankingModal from '../../components/RankingModal'

// 木のレベルに応じた表示（画像できたら差し替え）
function TreeDisplay({ level }) {
  const treeEmojis = ['🌱', '🌿', '🪴', '🌳', '🌲', '🎄', '🌴', '🎋']
  const index = Math.min(Math.floor(level / 10), treeEmojis.length - 1)
  return (
    <View style={styles.treeContainer}>
      {/* 画像できたら↓に差し替え */}
      {/* <Image source={require('../../assets/trees/level_${level}.png')} style={styles.treeImage} /> */}
      <Text style={styles.treeEmoji}>{treeEmojis[index]}</Text>
      <Text style={styles.treeLevel}>Lv.{level} の木</Text>
    </View>
  )
}

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
  const router = useRouter()
  const [showRanking, setShowRanking] = useState(false)

  const treeLevel = Math.floor((profile?.total_pomodoros ?? 0) / 5)
  const wins = profile?.wins ?? 0
  const losses = profile?.losses ?? 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <RankingModal visible={showRanking} onClose={() => setShowRanking(false)} />

      {/* ヘッダー */}
      <View style={styles.header}>
        <View>
          <Text style={styles.username}>{profile?.username ?? '---'}</Text>
          <Text style={styles.rankText}>🏆 Rank {profile?.rank ?? 0}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 8 }}>
          <View style={styles.pomodoroCount}>
            <Text style={styles.pomodoroNum}>{profile?.total_pomodoros ?? 0}</Text>
            <Text style={styles.pomodoroLabel}>🍅 合計</Text>
          </View>
          <TouchableOpacity onPress={() => setShowRanking(true)}>
            <Text style={styles.rankingBtn}>🌍 ランキング</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 木 */}
      <TreeDisplay level={treeLevel} />

      {/* 戦績 */}
      <View style={styles.statsRow}>
        <StatBadge label="勝利" value={`${wins}勝`} />
        <StatBadge label="敗北" value={`${losses}敗`} />
        <StatBadge label="勝率" value={wins + losses > 0 ? `${Math.round(wins / (wins + losses) * 100)}%` : '-'} />
      </View>

      {/* バトル開始ボタン */}
      <TouchableOpacity
        style={styles.battleButton}
        onPress={() => router.push('/(tabs)/battle')}
        activeOpacity={0.85}
      >
        <Text style={styles.battleButtonText}>⚔️  バトル開始</Text>
      </TouchableOpacity>

      {/* サブボタン */}
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
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 24, paddingBottom: 40 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 24,
    paddingTop: 48,
  },
  username: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  rankText: { fontSize: 14, color: '#ffd700', marginTop: 2 },
  pomodoroCount: { alignItems: 'center' },
  pomodoroNum: { fontSize: 28, fontWeight: 'bold', color: '#ff6b6b' },
  pomodoroLabel: { fontSize: 12, color: '#aaa' },
  rankingBtn: { fontSize: 13, color: '#4CAF50' },

  treeContainer: { alignItems: 'center', marginVertical: 32 },
  treeEmoji: { fontSize: 120 },
  treeLevel: { fontSize: 16, color: '#4CAF50', marginTop: 8, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#12122a', borderRadius: 16,
    padding: 16, marginBottom: 32,
  },
  statBadge: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: '#aaa', marginTop: 4 },

  battleButton: {
    backgroundColor: '#4CAF50', borderRadius: 16,
    paddingVertical: 18, alignItems: 'center', marginBottom: 16,
    shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  battleButtonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },

  subButtons: { flexDirection: 'row', gap: 12 },
  subButton: {
    flex: 1, backgroundColor: '#2a2a4a', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  subButtonText: { color: '#ccc', fontSize: 14, fontWeight: '600' },
})
