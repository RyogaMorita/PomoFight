import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

export default function FinishScreen({ result, onBack }) {
  const isWin = result === 'win'

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{isWin ? '🏆' : '💀'}</Text>
      <Text style={[styles.result, isWin ? styles.win : styles.lose]}>
        {isWin ? '勝利！' : '敗北...'}
      </Text>
      <Text style={styles.sub}>
        {isWin ? 'よく頑張りました！木が成長しました🌳' : 'また次回頑張ろう！'}
      </Text>

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
  sub: { fontSize: 16, color: '#aaa', marginBottom: 48, textAlign: 'center' },
  button: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 48,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
})
