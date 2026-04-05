import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../lib/theme'

export default function JoinRoomScreen({ goal, onMatched, onCancel }) {
  const { session } = useAuth()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function joinRoom() {
    if (code.length !== 6) return
    setLoading(true)
    setError('')

    const { data: room } = await supabase
      .from('rooms')
      .select('*, room_players(*)')
      .eq('invite_code', code.toUpperCase())
      .eq('status', 'waiting')
      .single()

    if (!room) {
      setError('部屋が見つかりません。コードを確認してね')
      setLoading(false)
      return
    }

    if (room.room_players?.some(p => p.player_id === session.user.id)) {
      setError('自分の部屋には参加できません')
      setLoading(false)
      return
    }

    await supabase.from('room_players').insert({
      room_id: room.id, player_id: session.user.id,
    })
    await supabase.from('rooms').update({ status: 'active' }).eq('id', room.id)

    onMatched({ id: room.id, opponentGoal: room.theme })
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Text style={styles.title}>🔑 部屋に参加</Text>
      <Text style={styles.sub}>友達からもらった6桁のコードを入力</Text>

      <View style={styles.inputRow}>
        {Array.from({ length: 6 }, (_, i) => (
          <View key={i} style={[
            styles.codeBox,
            code.length > i && styles.codeBoxFilled,
          ]}>
            <Text style={styles.codeBoxText}>{code[i] ?? ''}</Text>
          </View>
        ))}
      </View>

      {/* 透明な実際の入力フィールド */}
      <TextInput
        style={styles.hiddenInput}
        value={code}
        onChangeText={t => { setCode(t.toUpperCase().replace(/[^A-Z0-9]/g, '')); setError('') }}
        maxLength={6}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus
      />

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, (code.length !== 6 || loading) && styles.buttonDisabled]}
        onPress={joinRoom}
        disabled={code.length !== 6 || loading}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>参加する ⚔️</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={styles.cancelText}>キャンセル</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: colors.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  sub:   { fontSize: 14, color: colors.textSub, marginBottom: 32, textAlign: 'center' },

  inputRow: {
    flexDirection: 'row', gap: 8, marginBottom: 8,
  },
  codeBox: {
    width: 44, height: 56, borderRadius: radius.md,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.border,
  },
  codeBoxFilled: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  codeBoxText: { fontSize: 24, fontWeight: '900', color: colors.primary },

  hiddenInput: {
    position: 'absolute', opacity: 0, width: 1, height: 1,
  },

  errorBox: {
    backgroundColor: colors.dangerLight, borderRadius: radius.md,
    paddingVertical: 10, paddingHorizontal: 16, marginBottom: 20,
    borderWidth: 1, borderColor: colors.danger,
  },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },

  button: {
    width: '100%', backgroundColor: colors.primary,
    borderRadius: radius.md, paddingVertical: 18,
    alignItems: 'center', marginTop: 24, marginBottom: 12, ...shadow,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  cancelBtn: {
    paddingVertical: 12, paddingHorizontal: 32,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  cancelText: { color: colors.textSub, fontSize: 16 },
})
