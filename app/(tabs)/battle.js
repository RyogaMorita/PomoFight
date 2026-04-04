import { View, Text, StyleSheet } from 'react-native'

export default function BattleScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>⚔️ バトル画面（実装予定）</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 18 },
})
