import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useAuth } from '../../context/AuthContext'

export default function ProfileScreen() {
  const { profile } = useAuth()

  return (
    <View style={styles.container}>
      <Text style={styles.username}>{profile?.username}</Text>
      <Text style={styles.sub}>🏆 Rank {profile?.rank ?? 0}</Text>

      <TouchableOpacity style={styles.backupButton}>
        <Text style={styles.backupText}>📧 アカウントをバックアップ</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 24 },
  username: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  sub: { fontSize: 16, color: '#ffd700', marginBottom: 48 },
  backupButton: {
    backgroundColor: '#2a2a4a', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 24,
  },
  backupText: { color: '#ccc', fontSize: 16 },
})
