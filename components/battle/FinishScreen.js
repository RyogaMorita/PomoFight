import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

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
        <ActivityIndicator size="large" color="#4CAF50" />
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
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  emoji: { fontSize: 80, marginBottom: 16 },
  result: { fontSize: 40, fontWeight: 'bold', marginBottom: 12 },
  win: { color: '#ffd700' },
  lose: { color: '#ff6b6b' },
  sub: { fontSize: 16, color: '#aaa', marginBottom: 24, textAlign: 'center' },

  rankBox: {
    backgroundColor: '#2a2a4a', borderRadius: 16,
    padding: 20, alignItems: 'center', marginBottom: 32, width: '100%',
  },
  rankLabel: { color: '#888', fontSize: 13, marginBottom: 6 },
  rankChange: { fontSize: 36, fontWeight: 'bold' },
  rankUp: { color: '#4CAF50' },
  rankDown: { color: '#ff6b6b' },
  rankNow: { color: '#aaa', fontSize: 14, marginTop: 8 },

  button: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 48,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
})
