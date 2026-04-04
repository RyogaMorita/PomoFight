import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useAuth } from '../context/AuthContext'

export default function OnboardingScreen() {
  const { createProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const trimmed = username.trim()
    if (trimmed.length < 2) {
      setError('2文字以上で入力してください')
      return
    }
    if (trimmed.length > 20) {
      setError('20文字以内で入力してください')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await createProfile(trimmed)
    if (error) {
      setError(error.message.includes('unique') ? 'その名前はすでに使われています' : 'エラーが発生しました')
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.emoji}>🌳</Text>
        <Text style={styles.title}>PomoFight</Text>
        <Text style={styles.subtitle}>ニックネームを決めよう</Text>

        <TextInput
          style={styles.input}
          placeholder="ニックネーム（2〜20文字）"
          value={username}
          onChangeText={setUsername}
          maxLength={20}
          autoFocus
          autoCapitalize="none"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>はじめる</Text>
          }
        </TouchableOpacity>

        <Text style={styles.note}>
          後から設定でアカウントをバックアップできます
        </Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  inner: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32
  },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#aaa', marginBottom: 40 },
  input: {
    width: '100%', backgroundColor: '#fff', borderRadius: 12,
    padding: 16, fontSize: 16, marginBottom: 12
  },
  error: { color: '#ff6b6b', marginBottom: 12, fontSize: 14 },
  button: {
    width: '100%', backgroundColor: '#4CAF50', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 16
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  note: { color: '#666', fontSize: 12, textAlign: 'center' },
})
