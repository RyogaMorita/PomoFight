import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native'
import { colors, radius, shadow } from '../../lib/theme'

const PRESETS = ['勉強', '読書', '仕事', '運動', '資格勉強', 'プログラミング']

const TEST_ROOM = { id: 'test-room', opponentGoal: '勉強', isTest: true }

export default function GoalScreen({ onStart, onTestStart }) {
  const [goal, setGoal] = useState('')

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>⚔️ バトル開始</Text>
      <Text style={styles.subtitle}>今回の目的を入力しよう</Text>

      <TextInput
        style={styles.input}
        placeholder="例：英語の勉強"
        placeholderTextColor={colors.textLight}
        value={goal}
        onChangeText={setGoal}
        maxLength={30}
      />

      {/* プリセット */}
      <View style={styles.presets}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.preset, goal === p && styles.presetActive]}
            onPress={() => setGoal(p)}
          >
            <Text style={[styles.presetText, goal === p && styles.presetTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, !goal && styles.buttonDisabled]}
        onPress={() => goal && onStart(goal)}
        disabled={!goal}
      >
        <Text style={styles.buttonText}>マッチング開始</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.testButton, !goal && styles.buttonDisabled]}
        onPress={() => goal && onTestStart(goal, TEST_ROOM)}
        disabled={!goal}
      >
        <Text style={styles.testButtonText}>🤖 テスト対戦（ひとりで試す）</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSub, marginBottom: 32 },
  input: {
    width: '100%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: 16, fontSize: 16, color: colors.text, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  presets: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, justifyContent: 'center', marginBottom: 40,
  },
  preset: {
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: colors.card, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText: { color: colors.textSub, fontSize: 14 },
  presetTextActive: { color: '#fff', fontWeight: 'bold' },
  button: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: radius.md, padding: 18, alignItems: 'center', ...shadow,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  testButton: {
    width: '100%', borderRadius: radius.md, padding: 14,
    alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  testButtonText: { color: colors.textSub, fontSize: 15 },
})
