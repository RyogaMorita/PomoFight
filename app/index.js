import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function HomeScreen() {
  const { profile } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌳</Text>
      <Text style={styles.title}>PomoFight</Text>
      <Text style={styles.welcome}>ようこそ、{profile?.username} さん</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>対戦を始める</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', padding: 32
  },
  emoji: { fontSize: 80, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  welcome: { fontSize: 16, color: '#aaa', marginBottom: 48 },
  button: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    paddingVertical: 16, paddingHorizontal: 48
  },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
})
