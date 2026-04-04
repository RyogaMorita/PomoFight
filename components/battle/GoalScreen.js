import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native'

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
        placeholderTextColor="#666"
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
    flex: 1, backgroundColor: '#1a1a2e',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#aaa', marginBottom: 32 },
  input: {
    width: '100%', backgroundColor: '#2a2a4a', borderRadius: 12,
    padding: 16, fontSize: 16, color: '#fff', marginBottom: 16,
  },
  presets: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, justifyContent: 'center', marginBottom: 40,
  },
  preset: {
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: '#2a2a4a', borderRadius: 20,
    borderWidth: 1, borderColor: '#3a3a5a',
  },
  presetActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  presetText: { color: '#aaa', fontSize: 14 },
  presetTextActive: { color: '#fff', fontWeight: 'bold' },
  button: {
    width: '100%', backgroundColor: '#4CAF50',
    borderRadius: 12, padding: 18, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  testButton: {
    width: '100%', borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 12,
    borderWidth: 1, borderColor: '#3a3a5a',
  },
  testButtonText: { color: '#666', fontSize: 15 },
})
