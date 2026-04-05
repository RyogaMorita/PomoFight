import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { colors, radius, shadow } from '../lib/theme'

export default function OnboardingScreen() {
  const { createProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    const trimmed = username.trim()
    if (trimmed.length < 2) { setError('2文字以上で入力してください'); return }
    if (trimmed.length > 20) { setError('20文字以内で入力してください'); return }
    setLoading(true); setError('')
    const { error } = await createProfile(trimmed)
    if (error) setError(error.message.includes('unique') ? 'その名前はすでに使われています' : 'エラーが発生しました')
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.emoji}>🌱</Text>
        <Text style={styles.title}>PomoFight</Text>
        <Text style={styles.subtitle}>ニックネームを決めよう</Text>

        <View style={styles.card}>
          <TextInput
            style={styles.input}
            placeholder="ニックネーム（2〜20文字）"
            placeholderTextColor={colors.textLight}
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
              : <Text style={styles.buttonText}>はじめる 🌱</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>後から設定でアカウントをバックアップできます</Text>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: 'bold', color: colors.text, marginBottom: 6 },
  subtitle: { fontSize: 16, color: colors.textSub, marginBottom: 32 },
  card: {
    width: '100%', backgroundColor: colors.card,
    borderRadius: radius.lg, padding: 20, ...shadow,
  },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    padding: 14, fontSize: 16, color: colors.text,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
  },
  error: { color: colors.danger, marginBottom: 10, fontSize: 13 },
  button: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: 16, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  note: { color: colors.textLight, fontSize: 12, marginTop: 20 },
})
