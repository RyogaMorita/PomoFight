import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import FriendSection from '../../components/FriendSection'

export default function ProfileScreen() {
  const { profile, linkEmail } = useAuth()
  const [showBackup, setShowBackup] = useState(false)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>👤 プロフィール</Text>

      {/* ユーザー情報 */}
      <View style={styles.card}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{profile?.username?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.username}>{profile?.username}</Text>
        <Text style={styles.rank}>🏆 Rank {profile?.rank ?? 0}</Text>
      </View>

      {/* 戦績 */}
      <View style={styles.statsCard}>
        <StatRow label="総ポモドーロ" value={`${profile?.total_pomodoros ?? 0} 回`} />
        <StatRow label="勝利" value={`${profile?.wins ?? 0} 勝`} />
        <StatRow label="敗北" value={`${profile?.losses ?? 0} 敗`} />
        <StatRow
          label="勝率"
          value={
            (profile?.wins ?? 0) + (profile?.losses ?? 0) > 0
              ? `${Math.round((profile.wins / (profile.wins + profile.losses)) * 100)}%`
              : '-'
          }
        />
      </View>

      {/* フレンド */}
      <FriendSection />

      {/* アカウントバックアップ */}
      <View style={styles.backupSection}>
        <Text style={styles.sectionTitle}>アカウントのバックアップ</Text>
        <Text style={styles.sectionDesc}>
          メールアドレスを登録するとデータを引き継げます
        </Text>

        {!showBackup ? (
          <TouchableOpacity
            style={styles.backupButton}
            onPress={() => setShowBackup(true)}
          >
            <Text style={styles.backupButtonText}>📧 メールで登録する</Text>
          </TouchableOpacity>
        ) : (
          <BackupForm onClose={() => setShowBackup(false)} linkEmail={linkEmail} />
        )}
      </View>
    </ScrollView>
  )
}

function StatRow({ label, value }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

function BackupForm({ onClose, linkEmail }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!email || !password) {
      Alert.alert('エラー', 'メールとパスワードを入力してください')
      return
    }
    if (password !== confirm) {
      Alert.alert('エラー', 'パスワードが一致しません')
      return
    }
    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上にしてください')
      return
    }

    setLoading(true)
    const { error } = await linkEmail(email, password)
    setLoading(false)

    if (error) {
      Alert.alert('エラー', error.message)
    } else {
      Alert.alert('完了', 'メールアドレスを確認してください', [
        { text: 'OK', onPress: onClose }
      ])
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          placeholderTextColor="#555"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード（6文字以上）"
          placeholderTextColor="#555"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="パスワード（確認）"
          placeholderTextColor="#555"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>登録する</Text>
          }
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 },

  card: {
    backgroundColor: '#2a2a4a', borderRadius: 16,
    padding: 24, alignItems: 'center', marginBottom: 16,
  },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  username: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  rank: { fontSize: 15, color: '#ffd700' },

  statsCard: {
    backgroundColor: '#2a2a4a', borderRadius: 16,
    padding: 16, marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#3a3a5a',
  },
  statLabel: { color: '#aaa', fontSize: 15 },
  statValue: { color: '#fff', fontSize: 15, fontWeight: '600' },

  backupSection: {
    backgroundColor: '#2a2a4a', borderRadius: 16, padding: 16,
  },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: '#888', marginBottom: 16 },

  backupButton: {
    backgroundColor: '#3a3a5a', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  backupButtonText: { color: '#ccc', fontSize: 15 },

  form: { gap: 10 },
  input: {
    backgroundColor: '#3a3a5a', borderRadius: 12,
    padding: 14, color: '#fff', fontSize: 15,
  },
  submitButton: {
    backgroundColor: '#4CAF50', borderRadius: 12,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  buttonDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelText: { color: '#666', fontSize: 14, textAlign: 'center', marginTop: 12 },
})
