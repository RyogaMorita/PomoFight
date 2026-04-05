import { useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { useAuth } from '../../context/AuthContext'
import FriendSection from '../../components/FriendSection'
import { colors, radius, shadow } from '../../lib/theme'

// ── ランクティア ─────────────────────────────────────────────
const TIERS = [
  { min: 2000, label: 'LEGEND',  emoji: '👑', color: '#ff6b35' },
  { min: 1500, label: 'DIAMOND', emoji: '💎', color: '#00bcd4' },
  { min: 1000, label: 'GOLD',    emoji: '🏅', color: colors.gold },
  { min: 500,  label: 'SILVER',  emoji: '🥈', color: '#90a4ae' },
  { min: 0,    label: 'BRONZE',  emoji: '🥉', color: '#a1887f' },
]
function getTier(rank) {
  return TIERS.find(t => rank >= t.min) ?? TIERS[TIERS.length - 1]
}

// ── 称号 ─────────────────────────────────────────────────────
const TITLES = [
  { label: '👑 ポモドーロの神',   cond: p => p.total_pomodoros >= 500 },
  { label: '🌲 集中の大樹',       cond: p => p.total_pomodoros >= 200 },
  { label: '⚔️ 百戦錬磨',         cond: p => p.wins >= 100 },
  { label: '🏆 猛者',             cond: p => p.wins >= 50 },
  { label: '🌳 集中の木',         cond: p => p.total_pomodoros >= 80 },
  { label: '🔥 勝ち星',           cond: p => p.wins >= 10 },
  { label: '🌿 集中の芽',         cond: p => p.total_pomodoros >= 30 },
  { label: '⚔️ 初陣',             cond: p => p.wins >= 1 },
  { label: '🌱 集中の種',         cond: () => true },
]
function getTitle(profile) {
  return TITLES.find(t => t.cond(profile))?.label ?? '🌱 集中の種'
}

// ── 実績バッジ ────────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'first_pomo',   emoji: '🌱', label: '初ポモドーロ',  desc: '初めて完走',         cond: p => p.total_pomodoros >= 1 },
  { id: 'pomo_10',      emoji: '🌿', label: '10ポモ',        desc: '10回完走',           cond: p => p.total_pomodoros >= 10 },
  { id: 'pomo_50',      emoji: '🌳', label: '50ポモ',        desc: '50回完走',           cond: p => p.total_pomodoros >= 50 },
  { id: 'pomo_100',     emoji: '🌲', label: '100ポモ',       desc: '100回完走',          cond: p => p.total_pomodoros >= 100 },
  { id: 'pomo_300',     emoji: '🌲🌲', label: '300ポモ',     desc: '300回完走',          cond: p => p.total_pomodoros >= 300 },
  { id: 'first_win',   emoji: '⚔️',  label: '初勝利',        desc: 'バトルに初勝利',     cond: p => p.wins >= 1 },
  { id: 'win_10',      emoji: '🏅',  label: '10勝',          desc: '10回勝利',           cond: p => p.wins >= 10 },
  { id: 'win_50',      emoji: '🏆',  label: '50勝',          desc: '50回勝利',           cond: p => p.wins >= 50 },
  { id: 'win_100',     emoji: '👑',  label: '100勝',         desc: '100回勝利',          cond: p => p.wins >= 100 },
  { id: 'rank_500',    emoji: '🥈',  label: 'シルバー到達',  desc: 'ランク500以上',      cond: p => p.rank >= 500 },
  { id: 'rank_1000',   emoji: '🥇',  label: 'ゴールド到達',  desc: 'ランク1000以上',     cond: p => p.rank >= 1000 },
  { id: 'rank_2000',   emoji: '💎',  label: 'ダイヤ到達',    desc: 'ランク2000以上',     cond: p => p.rank >= 2000 },
]

export default function ProfileScreen() {
  const { profile, linkEmail } = useAuth()
  const [showBackup, setShowBackup] = useState(false)

  if (!profile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  const tier     = getTier(profile.rank ?? 0)
  const title    = getTitle(profile)
  const wins     = profile.wins ?? 0
  const losses   = profile.losses ?? 0
  const total    = profile.total_pomodoros ?? 0
  const winRate  = wins + losses > 0 ? Math.round(wins / (wins + losses) * 100) : 0
  const unlocked = ACHIEVEMENTS.filter(a => a.cond(profile))
  const locked   = ACHIEVEMENTS.filter(a => !a.cond(profile))

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── ヘッダー ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 プロフィール</Text>
      </View>

      {/* ── プロフィールカード ── */}
      <View style={styles.profileCard}>
        <View style={[styles.avatar, { borderColor: tier.color }]}>
          <Text style={styles.avatarText}>{profile.username?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={styles.titleText}>{title}</Text>
        <View style={[styles.tierBadge, { borderColor: tier.color, backgroundColor: tier.color + '18' }]}>
          <Text style={styles.tierEmoji}>{tier.emoji}</Text>
          <Text style={[styles.tierLabel, { color: tier.color }]}>{tier.label}</Text>
          <Text style={[styles.tierRank, { color: tier.color }]}>{profile.rank ?? 0}</Text>
        </View>
      </View>

      {/* ── 統計カード ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{total}</Text>
          <Text style={styles.statLabel}>ポモドーロ</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{wins}</Text>
          <Text style={styles.statLabel}>勝利</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNum, { color: winRate >= 50 ? colors.primary : colors.danger }]}>
            {winRate}%
          </Text>
          <Text style={styles.statLabel}>勝率</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{profile.rank ?? 0}</Text>
          <Text style={styles.statLabel}>ランク</Text>
        </View>
      </View>

      {/* ── 実績 ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏅 実績  {unlocked.length}/{ACHIEVEMENTS.length}</Text>

        {/* 解放済み */}
        <View style={styles.badgeGrid}>
          {unlocked.map(a => (
            <View key={a.id} style={styles.badge}>
              <Text style={styles.badgeEmoji}>{a.emoji}</Text>
              <Text style={styles.badgeLabel}>{a.label}</Text>
              <Text style={styles.badgeDesc}>{a.desc}</Text>
            </View>
          ))}
          {/* 未解放（薄く表示） */}
          {locked.map(a => (
            <View key={a.id} style={[styles.badge, styles.badgeLocked]}>
              <Text style={[styles.badgeEmoji, styles.badgeLockedEmoji]}>🔒</Text>
              <Text style={[styles.badgeLabel, styles.badgeLockedText]}>{a.label}</Text>
              <Text style={[styles.badgeDesc, styles.badgeLockedText]}>{a.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── フレンド ── */}
      <View style={styles.section}>
        <FriendSection />
      </View>

      {/* ── アカウントバックアップ ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔒 アカウントバックアップ</Text>
        <Text style={styles.sectionDesc}>メールアドレスを登録するとデータを引き継げます</Text>
        {!showBackup ? (
          <TouchableOpacity style={styles.backupBtn} onPress={() => setShowBackup(true)}>
            <Text style={styles.backupBtnText}>📧 メールで登録する</Text>
          </TouchableOpacity>
        ) : (
          <BackupForm onClose={() => setShowBackup(false)} linkEmail={linkEmail} />
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function BackupForm({ onClose, linkEmail }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit() {
    if (!email || !password) { Alert.alert('エラー', 'メールとパスワードを入力してください'); return }
    if (password !== confirm)  { Alert.alert('エラー', 'パスワードが一致しません'); return }
    if (password.length < 6)   { Alert.alert('エラー', 'パスワードは6文字以上にしてください'); return }
    setLoading(true)
    const { error } = await linkEmail(email, password)
    setLoading(false)
    if (error) { Alert.alert('エラー', error.message) }
    else { Alert.alert('完了', 'メールアドレスを確認してください', [{ text: 'OK', onPress: onClose }]) }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.form}>
        <TextInput style={styles.input} placeholder="メールアドレス" placeholderTextColor={colors.textLight}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="パスワード（6文字以上）" placeholderTextColor={colors.textLight}
          value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="パスワード（確認）" placeholderTextColor={colors.textLight}
          value={confirm} onChangeText={setConfirm} secureTextEntry />
        <TouchableOpacity style={[styles.submitBtn, loading && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>登録する</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { paddingBottom: 40 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },

  // プロフィールカード
  profileCard: {
    backgroundColor: colors.card, alignItems: 'center',
    paddingVertical: 28, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, marginBottom: 12,
  },
  avatarText:  { fontSize: 38, fontWeight: '900', color: colors.primary },
  username:    { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  titleText:   { fontSize: 14, color: colors.textSub, marginBottom: 12 },
  tierBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1.5, borderRadius: radius.full,
    paddingVertical: 4, paddingHorizontal: 14,
  },
  tierEmoji: { fontSize: 14 },
  tierLabel: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  tierRank:  { fontSize: 13, fontWeight: '700' },

  // 統計
  statsRow: {
    flexDirection: 'row', gap: 8,
    padding: 16,
    backgroundColor: colors.bg,
  },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center', ...shadow,
  },
  statNum:   { fontSize: 20, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 10, color: colors.textLight, marginTop: 3 },

  // セクション
  section: {
    backgroundColor: colors.card, marginHorizontal: 0,
    marginBottom: 8, padding: 16,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  sectionDesc:  { fontSize: 12, color: colors.textSub, marginBottom: 14 },

  // 実績バッジ
  badgeGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12,
  },
  badge: {
    width: '30%', backgroundColor: colors.primaryLight,
    borderRadius: radius.md, padding: 10, alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  badgeLocked: {
    backgroundColor: colors.cardSub, borderColor: colors.border,
  },
  badgeEmoji:      { fontSize: 24 },
  badgeLockedEmoji:{ fontSize: 20 },
  badgeLabel:      { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },
  badgeDesc:       { fontSize: 9, color: colors.textSub, textAlign: 'center' },
  badgeLockedText: { color: colors.textLight },

  // バックアップ
  backupBtn: {
    backgroundColor: colors.cardSub, borderRadius: radius.md,
    padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  backupBtnText: { color: colors.textSub, fontSize: 15 },

  form: { gap: 10 },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    padding: 14, color: colors.text, fontSize: 15,
    borderWidth: 1, borderColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: 14, alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelText: { color: colors.textLight, fontSize: 14, textAlign: 'center', marginTop: 12 },
})
