import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform
} from 'react-native'
import { colors, radius, shadow } from '../../lib/theme'

const PRESETS = ['勉強', '読書', '仕事', '運動', '資格勉強', 'プログラミング']
const TEST_ROOM = { id: 'test-room', opponentGoal: '勉強', isTest: true }

export default function GoalScreen({ onStart, onTestStart, onCreateRoom, onJoinRoom, onFreeMatch }) {
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

      {/* ランダムマッチ */}
      <TouchableOpacity
        style={[styles.button, !goal && styles.buttonDisabled]}
        onPress={() => goal && onStart(goal)}
        disabled={!goal}
      >
        <Text style={styles.buttonText}>⚔️ ランダムマッチ</Text>
      </TouchableOpacity>

      {/* フレンドバトル / フリーマッチ */}
      <View style={styles.friendRow}>
        <TouchableOpacity
          style={[styles.friendBtn, !goal && styles.buttonDisabled]}
          onPress={() => goal && onCreateRoom(goal)}
          disabled={!goal}
        >
          <Text style={styles.friendBtnIcon}>🏠</Text>
          <Text style={styles.friendBtnText}>部屋を作る</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.friendBtn, !goal && styles.buttonDisabled]}
          onPress={() => goal && onJoinRoom(goal)}
          disabled={!goal}
        >
          <Text style={styles.friendBtnIcon}>🔑</Text>
          <Text style={styles.friendBtnText}>コードで参加</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.friendBtn, !goal && styles.buttonDisabled]}
          onPress={() => goal && onFreeMatch(goal)}
          disabled={!goal}
        >
          <Text style={styles.friendBtnIcon}>🌐</Text>
          <Text style={styles.friendBtnText}>フリーマッチ</Text>
        </TouchableOpacity>
      </View>

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
  title:    { fontSize: 28, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: colors.textSub, marginBottom: 32 },

  input: {
    width: '100%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: 16, fontSize: 16, color: colors.text, marginBottom: 16,
    borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  presets: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, justifyContent: 'center', marginBottom: 32,
  },
  preset: {
    paddingVertical: 8, paddingHorizontal: 16,
    backgroundColor: colors.card, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.border,
  },
  presetActive:     { backgroundColor: colors.primary, borderColor: colors.primary },
  presetText:       { color: colors.textSub, fontSize: 14 },
  presetTextActive: { color: '#fff', fontWeight: 'bold' },

  button: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: radius.md, padding: 18, alignItems: 'center',
    marginBottom: 12, ...shadow,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  friendRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 12 },
  friendBtn: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md,
    paddingVertical: 16, alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: colors.border, ...shadow,
  },
  friendBtnIcon: { fontSize: 24 },
  friendBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },

  testButton: {
    width: '100%', borderRadius: radius.md, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: colors.border,
  },
  testButtonText: { color: colors.textSub, fontSize: 15 },
})
