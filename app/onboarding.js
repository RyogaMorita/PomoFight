import { useState, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions,
  Animated, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useAuth } from '../context/AuthContext'
import { colors, radius, shadow } from '../lib/theme'

const { width: W } = Dimensions.get('window')

const PAGES = [
  {
    emoji: '⚔️',
    illustration: <PhoneIllustration />,
    title: 'PomoFightへようこそ',
    desc: 'スマホ依存から解放される\nポモドーロ対戦アプリ',
    bg: '#f0f7f0',
  },
  {
    emoji: '📱',
    illustration: <FaceDownIllustration />,
    title: 'スマホを伏せて集中',
    desc: '25分間スマホを置いて作業しよう\n先にスマホを持ち上げた方が負け！',
    bg: '#f0f4ff',
  },
  {
    emoji: '🏆',
    illustration: <BattleIllustration />,
    title: '対戦相手とバトル',
    desc: 'ランダムマッチ・フレンドバトル・\n複数人部屋で集中力を競い合おう',
    bg: '#fff8f0',
  },
  {
    emoji: '🌳',
    illustration: <TreeIllustration />,
    title: '木を育てよう',
    desc: 'バトルに勝つと木が成長\n全10ステージを目指せ！',
    bg: '#f0f9f0',
  },
]

// ── イラストコンポーネント ─────────────────────────────────────

function PhoneIllustration() {
  return (
    <View style={il.phone}>
      <View style={il.phoneNotch} />
      <View style={il.phoneScreen}>
        <Text style={il.phoneEmoji}>🌱</Text>
        <Text style={il.phoneLine}>PomoFight</Text>
        <View style={il.phoneBar} />
        <View style={[il.phoneBar, { width: '60%' }]} />
      </View>
      <View style={il.phoneHome} />
    </View>
  )
}

function FaceDownIllustration() {
  return (
    <View style={il.faceDownWrap}>
      <View style={il.phoneFlat}>
        <Text style={il.faceDownEmoji}>📱</Text>
      </View>
      <View style={il.timerCircle}>
        <Text style={il.timerText}>25:00</Text>
        <Text style={il.timerLabel}>集中中</Text>
      </View>
    </View>
  )
}

function BattleIllustration() {
  return (
    <View style={il.battleWrap}>
      <View style={il.playerCard}>
        <Text style={il.playerEmoji}>🧑</Text>
        <Text style={il.playerName}>あなた</Text>
        <View style={[il.hpBar, { backgroundColor: colors.primary }]} />
      </View>
      <Text style={il.vsText}>VS</Text>
      <View style={il.playerCard}>
        <Text style={il.playerEmoji}>🧑</Text>
        <Text style={il.playerName}>相手</Text>
        <View style={[il.hpBar, { backgroundColor: colors.danger, width: '50%' }]} />
      </View>
    </View>
  )
}

function TreeIllustration() {
  return (
    <View style={il.treeWrap}>
      {['🌱','🌿','🌳','🌲'].map((t, i) => (
        <View key={i} style={[il.treeStage, i === 3 && il.treeStageActive]}>
          <Text style={{ fontSize: i === 3 ? 40 : 24 }}>{t}</Text>
          {i < 3 && <Text style={il.treeArrow}>↓</Text>}
        </View>
      ))}
    </View>
  )
}

// ── メイン ────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { createProfile } = useAuth()
  const [page, setPage]         = useState(0)
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const slideAnim = useRef(new Animated.Value(0)).current
  const totalPages = PAGES.length + 1 // +1 for username page

  function goTo(next) {
    const dir = next > page ? 1 : -1
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -dir * 30, duration: 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue:  dir * 30, duration: 0,  useNativeDriver: true }),
      Animated.spring(slideAnim,  { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start()
    setPage(next)
    setError('')
  }

  async function handleStart() {
    const trimmed = username.trim()
    if (trimmed.length < 2)  { setError('2文字以上で入力してください'); return }
    if (trimmed.length > 20) { setError('20文字以内で入力してください'); return }
    setLoading(true); setError('')
    const { error } = await createProfile(trimmed)
    if (error) setError(error.message.includes('unique') ? 'その名前はすでに使われています' : 'エラーが発生しました')
    setLoading(false)
  }

  const isLastPage   = page === totalPages - 1
  const currentBg    = page < PAGES.length ? PAGES[page].bg : '#f5f0e8'

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: currentBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* スキップ */}
      {page < PAGES.length && (
        <TouchableOpacity style={styles.skipBtn} onPress={() => goTo(PAGES.length)}>
          <Text style={styles.skipText}>スキップ</Text>
        </TouchableOpacity>
      )}

      {/* コンテンツ */}
      <Animated.View style={[styles.content, { transform: [{ translateX: slideAnim }] }]}>
        {page < PAGES.length ? (
          // ── ガイドページ ──
          <View style={styles.guidePage}>
            <View style={styles.illustrationWrap}>
              {PAGES[page].illustration}
            </View>
            <Text style={styles.pageTitle}>{PAGES[page].title}</Text>
            <Text style={styles.pageDesc}>{PAGES[page].desc}</Text>
          </View>
        ) : (
          // ── ユーザー名ページ ──
          <View style={styles.namePage}>
            <Text style={styles.nameEmoji}>👤</Text>
            <Text style={styles.pageTitle}>ニックネームを決めよう</Text>
            <Text style={styles.pageDesc}>後から変更はできません</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={styles.input}
                placeholder="例：集中マスター"
                placeholderTextColor={colors.textLight}
                value={username}
                onChangeText={setUsername}
                maxLength={20}
                autoFocus
                autoCapitalize="none"
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.startBtn, (!username.trim() || loading) && styles.startBtnDisabled]}
                onPress={handleStart}
                disabled={!username.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.startBtnText}>⚔️ バトルを始める</Text>
                }
              </TouchableOpacity>
            </View>
            <Text style={styles.note}>アカウントはプロフィールでバックアップできます</Text>
          </View>
        )}
      </Animated.View>

      {/* ページドット + ナビ */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.navBtn, page === 0 && styles.navBtnHidden]}
          onPress={() => page > 0 && goTo(page - 1)}
        >
          <Text style={styles.navBtnText}>‹</Text>
        </TouchableOpacity>

        {/* ドット */}
        <View style={styles.dots}>
          {Array.from({ length: totalPages }, (_, i) => (
            <TouchableOpacity key={i} onPress={() => goTo(i)}>
              <View style={[styles.dot, i === page && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.navBtn, isLastPage && styles.navBtnHidden]}
          onPress={() => !isLastPage && goTo(page + 1)}
        >
          <Text style={styles.navBtnText}>›</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── イラストスタイル ──────────────────────────────────────────

const il = StyleSheet.create({
  // スマホ
  phone: {
    width: 160, height: 280, backgroundColor: '#fff',
    borderRadius: 28, borderWidth: 3, borderColor: '#ddd',
    alignItems: 'center', overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 8,
  },
  phoneNotch: {
    width: 60, height: 14, backgroundColor: '#ddd',
    borderRadius: 7, marginTop: 12, marginBottom: 8,
  },
  phoneScreen: { flex: 1, width: '100%', padding: 16, alignItems: 'center', gap: 8 },
  phoneEmoji: { fontSize: 36 },
  phoneLine: { fontSize: 14, fontWeight: '800', color: '#333' },
  phoneBar: { width: '80%', height: 8, backgroundColor: '#e8f0e8', borderRadius: 4 },
  phoneHome: { width: 40, height: 5, backgroundColor: '#ddd', borderRadius: 3, marginBottom: 14 },

  // 伏せ
  faceDownWrap: { alignItems: 'center', gap: 20 },
  phoneFlat: {
    width: 120, height: 60, backgroundColor: '#fff',
    borderRadius: 12, borderWidth: 2, borderColor: '#ddd',
    alignItems: 'center', justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  faceDownEmoji: { fontSize: 28 },
  timerCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#fff', borderWidth: 3, borderColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  timerText:  { fontSize: 22, fontWeight: '900', color: colors.primary },
  timerLabel: { fontSize: 10, color: colors.textSub },

  // バトル
  battleWrap: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  playerCard: {
    width: 90, backgroundColor: '#fff', borderRadius: 16,
    padding: 12, alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4,
  },
  playerEmoji: { fontSize: 32 },
  playerName:  { fontSize: 11, fontWeight: '700', color: '#555' },
  hpBar: { width: '100%', height: 6, borderRadius: 3, backgroundColor: colors.primary },
  vsText: { fontSize: 22, fontWeight: '900', color: colors.danger },

  // ツリー
  treeWrap: { alignItems: 'center', gap: 4 },
  treeStage: { alignItems: 'center' },
  treeStageActive: {
    backgroundColor: colors.primaryLight, borderRadius: 20,
    paddingHorizontal: 20, paddingVertical: 8,
    borderWidth: 2, borderColor: colors.primary,
  },
  treeArrow: { fontSize: 16, color: colors.textLight },
})

// ── メインスタイル ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  skipBtn: {
    position: 'absolute', top: 56, right: 20, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radius.full,
    paddingVertical: 8, paddingHorizontal: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  skipText: { fontSize: 14, color: colors.textSub, fontWeight: '600' },

  content: { flex: 1, justifyContent: 'center' },

  // ガイドページ
  guidePage: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 40 },
  illustrationWrap: {
    height: 280, justifyContent: 'center', alignItems: 'center', marginBottom: 40,
  },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.text, marginBottom: 12, textAlign: 'center' },
  pageDesc:  { fontSize: 15, color: colors.textSub, textAlign: 'center', lineHeight: 24 },

  // ユーザー名ページ
  namePage: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 60 },
  nameEmoji: { fontSize: 72, marginBottom: 16 },
  inputCard: {
    width: '100%', backgroundColor: '#fff',
    borderRadius: radius.lg, padding: 20, marginTop: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
  },
  input: {
    backgroundColor: colors.bg, borderRadius: radius.md,
    padding: 14, fontSize: 16, color: colors.text,
    marginBottom: 12, borderWidth: 1, borderColor: colors.border,
    textAlign: 'center', letterSpacing: 1,
  },
  error:      { color: colors.danger, fontSize: 13, marginBottom: 10, textAlign: 'center' },
  startBtn: {
    backgroundColor: colors.primary, borderRadius: radius.md,
    padding: 16, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  note: { fontSize: 12, color: colors.textLight, marginTop: 16, textAlign: 'center' },

  // フッター
  footer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 48, paddingTop: 16,
  },
  navBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  navBtnHidden: { opacity: 0 },
  navBtnText: { fontSize: 28, color: colors.text, lineHeight: 32 },
  dots: { flexDirection: 'row', gap: 8 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  dotActive: {
    width: 24, backgroundColor: colors.primary,
  },
})
