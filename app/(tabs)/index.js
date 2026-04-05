import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import RankingModal from '../../components/RankingModal'
import FriendModal from '../../components/FriendModal'
import { getTreeStage } from '../../components/TreeDisplay'
import { colors, radius, shadow } from '../../lib/theme'

const TIERS = [
  { min: 2000, label: 'LEGEND',  emoji: '👑', color: '#ff6b35' },
  { min: 1500, label: 'DIAMOND', emoji: '💎', color: '#00bcd4' },
  { min: 1000, label: 'GOLD',    emoji: '🏅', color: colors.gold },
  { min: 500,  label: 'SILVER',  emoji: '🥈', color: '#90a4ae' },
  { min: 0,    label: 'BRONZE',  emoji: '🥉', color: '#a1887f' },
]

function getTier(rank) {
  return TIERS.find(t => rank >= t.min) ?? TIERS[TIERS.length - 1]
}

export default function HomeScreen({ onBattle }) {
  const { profile, session } = useAuth()
  const [showRanking, setShowRanking] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [streak, setStreak] = useState(0)

  const total   = profile?.total_pomodoros ?? 0
  const wins    = profile?.wins ?? 0
  const losses  = profile?.losses ?? 0
  const rank    = profile?.rank ?? 0
  const tier    = getTier(rank)
  const winRate = wins + losses > 0 ? Math.round(wins / (wins + losses) * 100) : 0

  useEffect(() => { fetchStreak() }, [])

  async function fetchStreak() {
    if (!session?.user?.id) return
    const { data } = await supabase
      .from('pomodoro_logs')
      .select('created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(60)
    if (!data) return

    const dates = [...new Set(data.map(l => {
      const d = new Date(l.created_at)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    }))]

    let count = 0
    const today = new Date()
    for (let i = 0; i < dates.length; i++) {
      const check = new Date(today)
      check.setDate(today.getDate() - i)
      const key = `${check.getFullYear()}-${check.getMonth()}-${check.getDate()}`
      if (dates.includes(key)) count++
      else break
    }
    setStreak(count)
  }

  return (
    <View style={styles.container}>
      <RankingModal visible={showRanking} onClose={() => setShowRanking(false)} />
      <FriendModal  visible={showFriends} onClose={() => setShowFriends(false)} />

      {/* ── プレイヤーバー ── */}
      <View style={styles.playerBar}>
        <View style={styles.playerLeft}>
          <Text style={styles.username}>{profile?.username ?? '---'}</Text>
          <View style={[styles.tierBadge, { borderColor: tier.color }]}>
            <Text style={styles.tierEmoji}>{tier.emoji}</Text>
            <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
            <Text style={[styles.tierNum, { color: tier.color }]}>{rank}</Text>
          </View>
        </View>
        <View style={styles.playerRight}>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakNum}>{streak}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFriends(true)}>
            <Text style={styles.iconBtnText}>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowRanking(true)}>
            <Text style={styles.iconBtnText}>🏆</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 勝績バー ── */}
      <View style={styles.statsBar}>
        <StatChip label="勝利" value={`${wins}勝`} color={colors.primary} />
        <View style={styles.statsDivider} />
        <StatChip label="勝率" value={`${winRate}%`} color={colors.gold} />
        <View style={styles.statsDivider} />
        <StatChip label="ポモドーロ" value={`${total}`} color={colors.accent} />
      </View>

      {/* ── バトル開始ボタン ── */}
      <View style={styles.bottomSection}>
        <TouchableOpacity style={styles.battleButton} onPress={onBattle} activeOpacity={0.85}>
          <Text style={styles.battleButtonText}>⚔️  バトル開始</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function StatChip({ label, value, color }) {
  return (
    <View style={styles.statChip}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  // プレイヤーバー
  playerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  playerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  username: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1.5, borderRadius: radius.full,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  tierEmoji: { fontSize: 13 },
  tierLabel: { fontSize: 11, fontWeight: '800' },
  tierNum:   { fontSize: 11, fontWeight: '600' },

  playerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#fff3e0', borderRadius: radius.full,
    paddingVertical: 4, paddingHorizontal: 8,
    borderWidth: 1, borderColor: '#ffcc02',
  },
  streakFire: { fontSize: 14 },
  streakNum:  { fontSize: 14, fontWeight: '800', color: '#e65100' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.cardSub, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  iconBtnText: { fontSize: 16 },

  // 勝績バー
  statsBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  statChip:    { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 15, fontWeight: '800' },
  statLabel:   { fontSize: 9, color: colors.textLight, marginTop: 1 },
  statsDivider: { width: 1, height: 28, backgroundColor: colors.border },

  // バトルボタン
  bottomSection: {
    paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8,
    marginTop: 'auto',
    backgroundColor: colors.card,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  battleButton: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  battleButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
})
