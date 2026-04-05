import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, Animated
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import RankingModal from '../../components/RankingModal'
import FriendModal from '../../components/FriendModal'
import TreeDisplay, { getTreeStage } from '../../components/TreeDisplay'
import { colors, radius, shadow } from '../../lib/theme'

// 次のステージまでの進捗
function getProgress(total) {
  const thresholds = [0, 5, 15, 30, 50, 80, 120, 180, 250, 350]
  const stage = getTreeStage(total)
  if (stage >= 10) return 100
  const cur = thresholds[stage - 1] ?? 0
  const next = thresholds[stage] ?? 350
  return Math.min(100, Math.round(((total - cur) / (next - cur)) * 100))
}

export default function HomeScreen({ onBattle }) {
  const { profile } = useAuth()
  const [showRanking, setShowRanking] = useState(false)
  const [showFriends, setShowFriends] = useState(false)

  const total = profile?.total_pomodoros ?? 0
  const wins = profile?.wins ?? 0
  const losses = profile?.losses ?? 0
  const rank = profile?.rank ?? 0
  const progress = getProgress(total)
  const stage = getTreeStage(total)
  const winRate = wins + losses > 0 ? Math.round(wins / (wins + losses) * 100) : 0

  return (
    <View style={styles.container}>
      <RankingModal visible={showRanking} onClose={() => setShowRanking(false)} />
      <FriendModal visible={showFriends} onClose={() => setShowFriends(false)} />

      {/* ── 上部リソースバー ── */}
      <View style={styles.topBar}>
        {/* XPバー */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabelRow}>
            <Text style={styles.xpStage}>Stage {stage}</Text>
            <Text style={styles.xpCount}>{total} 🍅</Text>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${progress}%` }]} />
          </View>
        </View>
        {/* 戦績バッジ */}
        <View style={styles.wlBadge}>
          <Text style={styles.wlText}>{wins}勝 {losses}敗</Text>
          <Text style={styles.wlRate}>{winRate}%</Text>
        </View>
      </View>

      {/* ── プレイヤー情報バー ── */}
      <View style={styles.playerBar}>
        <View style={styles.playerLeft}>
          <Text style={styles.username}>{profile?.username ?? '---'}</Text>
          <View style={styles.trophyRow}>
            <Text style={styles.trophyIcon}>🏅</Text>
            <Text style={styles.trophyNum}>{rank}</Text>
          </View>
        </View>
        <View style={styles.iconButtons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFriends(true)}>
            <Text style={styles.iconBtnText}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowRanking(true)}>
            <Text style={styles.iconBtnText}>🏆</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 中央：木（メインビジュアル） ── */}
      <View style={styles.arenaWrap}>
        <TreeDisplay totalPomodoros={total} size="large" />
      </View>

      {/* ── バトル開始ボタン ── */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.battleButton} onPress={onBattle} activeOpacity={0.85}>
          <Text style={styles.battleButtonText}>⚔️  バトル開始</Text>
        </TouchableOpacity>

        <View style={styles.subButtons}>
          <TouchableOpacity style={styles.subButton}>
            <Text style={styles.subButtonEmoji}>👥</Text>
            <Text style={styles.subButtonText}>フレンド対戦</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.subButton}>
            <Text style={styles.subButtonEmoji}>🚪</Text>
            <Text style={styles.subButtonText}>部屋を作る</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // ── 上部リソースバー
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 12,
  },
  xpSection: { flex: 1 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  xpStage: { fontSize: 11, fontWeight: '700', color: colors.primary },
  xpCount: { fontSize: 11, color: colors.textSub },
  xpBarBg: {
    height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%', backgroundColor: colors.primary, borderRadius: 3,
  },
  wlBadge: {
    backgroundColor: colors.cardSub, borderRadius: radius.sm,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  wlText: { fontSize: 12, fontWeight: '700', color: colors.text },
  wlRate: { fontSize: 10, color: colors.textSub },

  // ── プレイヤーバー
  playerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  username: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  trophyRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trophyIcon: { fontSize: 14 },
  trophyNum: { fontSize: 15, fontWeight: '700', color: colors.gold },
  iconButtons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.cardSub, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  iconBtnText: { fontSize: 18 },

  // ── 中央アリーナ
  arenaWrap: {
    flex: 1, paddingHorizontal: 20, paddingVertical: 12,
    justifyContent: 'center',
  },

  // ── 下部ボタン群
  bottomSection: {
    paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8,
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  battleButton: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center', marginBottom: 10,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  battleButtonText: { color: '#fff', fontSize: 22, fontWeight: 'bold', letterSpacing: 1 },
  subButtons: { flexDirection: 'row', gap: 10 },
  subButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.cardSub, borderRadius: radius.md,
    paddingVertical: 12, borderWidth: 1, borderColor: colors.border,
  },
  subButtonEmoji: { fontSize: 16 },
  subButtonText: { color: colors.textSub, fontSize: 13, fontWeight: '600' },
})
