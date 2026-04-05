import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../lib/theme'

export default function FinishScreen({ result, room, onBack }) {
  const { session, profile, fetchProfile } = useAuth()
  const isWin = result === 'win'
  const [loading, setLoading] = useState(true)
  const [rankChange, setRankChange] = useState(0)

  useEffect(() => {
    recordResult()
  }, [])

  async function recordResult() {
    if (!room?.isTest) {
      const prevRank = profile?.rank ?? 0
      await supabase.rpc('record_battle_result', {
        p_user_id: session.user.id,
        p_is_win: isWin,
      })
      await fetchProfile(session.user.id)
      setRankChange(isWin ? 20 : -10)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{isWin ? '🏆' : '💀'}</Text>
      <Text style={[styles.result, isWin ? styles.win : styles.lose]}>
        {isWin ? '勝利！' : '敗北...'}
      </Text>
      <Text style={styles.sub}>
        {isWin ? 'よく頑張りました！木が成長しました🌳' : 'また次回頑張ろう！'}
      </Text>

      {!room?.isTest && (
        <View style={styles.rankBox}>
          <Text style={styles.rankLabel}>ランク変動</Text>
          <Text style={[styles.rankChange, isWin ? styles.rankUp : styles.rankDown]}>
            {isWin ? `+20` : `-10`}
          </Text>
          <Text style={styles.rankNow}>現在のランク: {profile?.rank ?? 0}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={onBack}>
        <Text style={styles.buttonText}>ホームに戻る</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  emoji: { fontSize: 80, marginBottom: 16 },
  result: { fontSize: 40, fontWeight: 'bold', marginBottom: 12 },
  win: { color: colors.gold },
  lose: { color: colors.danger },
  sub: { fontSize: 16, color: colors.textSub, marginBottom: 24, textAlign: 'center' },

  rankBox: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 20, alignItems: 'center', marginBottom: 32, width: '100%', ...shadow,
  },
  rankLabel: { color: colors.textLight, fontSize: 13, marginBottom: 6 },
  rankChange: { fontSize: 36, fontWeight: 'bold' },
  rankUp: { color: colors.primary },
  rankDown: { color: colors.danger },
  rankNow: { color: colors.textSub, fontSize: 14, marginTop: 8 },

  button: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 16, paddingHorizontal: 48, ...shadow,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
})
