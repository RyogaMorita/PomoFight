import { useEffect, useRef, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Easing
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../lib/theme'
import { getTreeStage } from '../TreeDisplay'
import TreeEvolutionOverlay from '../TreeEvolutionOverlay'

const WIN_MESSAGES = [
  '完璧な集中力だ！🔥',
  'スマホに勝った！🏆',
  '木がまた育ったよ🌳',
  '集中力の化身！⚡',
]
const LOSE_MESSAGES = [
  '次は負けない！💪',
  '失敗は成長の証🌱',
  'また挑戦しよう！',
  '今日の反省を活かせ',
]

function Particle({ delay, isWin }) {
  const y    = useRef(new Animated.Value(0)).current
  const x    = useRef(new Animated.Value(0)).current
  const op   = useRef(new Animated.Value(0)).current
  const rot  = useRef(new Animated.Value(0)).current
  const dx   = (Math.random() - 0.5) * 300
  const color = isWin
    ? ['#ffd700', '#ff6b35', '#4caf50', '#2196f3', '#e91e63'][Math.floor(Math.random() * 5)]
    : '#888'

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op,  { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(y,   { toValue: -400 + Math.random() * 200, duration: 1200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(x,   { toValue: dx, duration: 1200, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
      Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }, [])

  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 * (Math.random() > 0.5 ? 1 : -1)}deg`] })

  return (
    <Animated.View style={{
      position: 'absolute', width: 8, height: 8,
      borderRadius: 2, backgroundColor: color,
      opacity: op, transform: [{ translateY: y }, { translateX: x }, { rotate: spin }],
    }} />
  )
}

export default function FinishScreen({ result, room, onBack }) {
  const { session, profile, fetchProfile } = useAuth()
  const isWin   = result === 'win'
  const [loading, setLoading]       = useState(true)
  const [bonusInfo, setBonusInfo]   = useState(null)
  const [evolvedStage, setEvolvedStage] = useState(null) // { from, to }

  // アニメーション
  const emojiScale   = useRef(new Animated.Value(0)).current
  const emojiRot     = useRef(new Animated.Value(0)).current
  const titleY       = useRef(new Animated.Value(40)).current
  const titleOp      = useRef(new Animated.Value(0)).current
  const cardsY       = useRef(new Animated.Value(60)).current
  const cardsOp      = useRef(new Animated.Value(0)).current
  const particles    = Array.from({ length: isWin ? 20 : 6 }, (_, i) => i)
  const rankCount    = useRef(new Animated.Value(0)).current
  const [displayRank, setDisplayRank] = useState(profile?.rank ?? 0)
  const bgFlash      = useRef(new Animated.Value(0)).current

  // ボーナスバナーアニメーション
  const bannerScale  = useRef(new Animated.Value(0)).current
  const bannerOp     = useRef(new Animated.Value(0)).current

  const message = isWin
    ? WIN_MESSAGES[Math.floor(Math.random() * WIN_MESSAGES.length)]
    : LOSE_MESSAGES[Math.floor(Math.random() * LOSE_MESSAGES.length)]

  useEffect(() => { recordResult() }, [])

  async function recordResult() {
    let change = 0
    let info   = null

    const oldStage = getTreeStage(profile?.total_pomodoros ?? 0)

    const { data } = await supabase.rpc('record_battle_result', {
      p_user_id: session.user.id,
      p_is_win: isWin,
    })
    info   = data
    change = data?.total ?? (isWin ? 20 : -10)
    setBonusInfo(info)
    await fetchProfile(session.user.id)

    // 進化チェック：最新のtotal_pomodorosを直接取得
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('total_pomodoros')
      .eq('id', session.user.id)
      .single()
    const newStage = getTreeStage(newProfile?.total_pomodoros ?? 0)
    if (newStage > oldStage) {
      setEvolvedStage({ from: oldStage, to: newStage })
    }

    setLoading(false)
    startAnimations(change, info)
  }

  function startAnimations(change, info) {
    // 背景フラッシュ
    Animated.sequence([
      Animated.timing(bgFlash, { toValue: 1, duration: 150, useNativeDriver: false }),
      Animated.timing(bgFlash, { toValue: 0, duration: 400, useNativeDriver: false }),
    ]).start()

    // 絵文字ドーン
    Animated.spring(emojiScale, {
      toValue: 1, friction: 4, tension: 80, useNativeDriver: true,
    }).start()

    // 絵文字回転（勝利のみ）
    if (isWin) {
      Animated.timing(emojiRot, {
        toValue: 1, duration: 600, easing: Easing.out(Easing.back(2)), useNativeDriver: true,
      }).start()
    }

    // タイトル
    Animated.parallel([
      Animated.timing(titleY,  { toValue: 0, duration: 500, delay: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(titleOp, { toValue: 1, duration: 400, delay: 200, useNativeDriver: true }),
    ]).start()

    // カード群
    Animated.parallel([
      Animated.timing(cardsY,  { toValue: 0, duration: 500, delay: 450, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(cardsOp, { toValue: 1, duration: 400, delay: 450, useNativeDriver: true }),
    ]).start()

    // ランクカウントアップ/ダウン
    {
      const prev = profile?.rank ?? 0
      Animated.timing(rankCount, {
        toValue: change, duration: 1200, delay: 800,
        easing: Easing.out(Easing.quad), useNativeDriver: false,
      }).start()
      rankCount.addListener(({ value }) => setDisplayRank(Math.round(prev + value)))
    }

    // ボーナスバナー（コンボ or 初勝利があるとき）
    const hasBonus = info && isWin && (info.combo_bonus > 0 || info.first_bonus > 0)
    if (hasBonus) {
      Animated.sequence([
        Animated.delay(900),
        Animated.spring(bannerScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        Animated.timing(bannerOp,   { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start()
    }
  }

  const spin = emojiRot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '20deg'] })
  const bgColor = bgFlash.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.bg, isWin ? '#fff9e6' : '#fff0f0'],
  })

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>結果を記録中...</Text>
      </View>
    )
  }

  const total       = bonusInfo?.total       ?? (isWin ? 20 : -10)
  const comboBonus  = bonusInfo?.combo_bonus ?? 0
  const firstBonus  = bonusInfo?.first_bonus ?? 0
  const streak      = bonusInfo?.streak      ?? 0
  const hasBonus    = isWin && (comboBonus > 0 || firstBonus > 0)

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }]}>

      {/* 木の進化演出 */}
      {evolvedStage && (
        <TreeEvolutionOverlay
          fromStage={evolvedStage.from}
          toStage={evolvedStage.to}
          onDismiss={() => setEvolvedStage(null)}
        />
      )}

      {/* パーティクル */}
      <View style={styles.particleOrigin} pointerEvents="none">
        {particles.map(i => (
          <Particle key={i} delay={i * 60} isWin={isWin} />
        ))}
      </View>

      {/* 絵文字 */}
      <View style={styles.emojiWrap}>
        <Animated.Text style={[
          styles.emoji,
          { transform: [{ scale: emojiScale }, { rotate: spin }] }
        ]}>
          {isWin ? '🏆' : '💀'}
        </Animated.Text>
        {/* 連勝バッジ */}
        {isWin && streak >= 2 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>🔥 {streak}連勝中！</Text>
          </View>
        )}
      </View>

      {/* タイトル */}
      <Animated.View style={{ transform: [{ translateY: titleY }], opacity: titleOp, alignItems: 'center' }}>
        <Text style={[styles.result, isWin ? styles.resultWin : styles.resultLose]}>
          {isWin ? '勝利！' : '敗北...'}
        </Text>
        <Text style={styles.message}>{message}</Text>
      </Animated.View>

      {/* カード群 */}
      <Animated.View style={[styles.cards, { transform: [{ translateY: cardsY }], opacity: cardsOp }]}>

        {/* ランク変動 */}
        {(
          <View style={[styles.rankCard, isWin ? styles.rankCardWin : styles.rankCardLose]}>
            <Text style={styles.rankCardLabel}>ランク変動</Text>

            {/* ボーナス内訳 */}
            {hasBonus ? (
              <View style={styles.bonusBreakdown}>
                <BreakdownRow label="基本" value={+20} color={colors.primary} />
                {comboBonus > 0 && (
                  <BreakdownRow label={`🔥 ${streak}連勝ボーナス`} value={comboBonus} color='#ff6b35' />
                )}
                {firstBonus > 0 && (
                  <BreakdownRow label="⭐ 本日初勝利ボーナス" value={firstBonus} color='#f59e0b' />
                )}
                <View style={styles.bonusDivider} />
                <View style={styles.bonusTotalRow}>
                  <Text style={styles.bonusTotalLabel}>合計</Text>
                  <Text style={[styles.rankChangeNum, styles.rankChangeWin]}>+{total}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.rankRow}>
                <Text style={[styles.rankArrow, isWin ? styles.rankArrowUp : styles.rankArrowDown]}>
                  {isWin ? '▲' : '▼'}
                </Text>
                <Text style={[styles.rankChangeNum, isWin ? styles.rankChangeWin : styles.rankChangeLose]}>
                  {isWin ? `+${total}` : `${total}`}
                </Text>
              </View>
            )}

            <View style={styles.rankNowRow}>
              <Text style={styles.rankNowLabel}>現在のランク</Text>
              <Text style={[styles.rankNowNum, isWin ? styles.rankChangeWin : styles.rankChangeLose]}>
                {displayRank}
              </Text>
            </View>
          </View>
        )}

        {/* 初勝利バナー */}
        {firstBonus > 0 && (
          <Animated.View style={[styles.firstWinBanner, { transform: [{ scale: bannerScale }], opacity: bannerOp }]}>
            <Text style={styles.firstWinText}>⭐ 本日初勝利！ボーナス +{firstBonus}</Text>
          </Animated.View>
        )}

        {/* ホームに戻る */}
        <TouchableOpacity style={styles.homeBtn} onPress={onBack} activeOpacity={0.85}>
          <Text style={styles.homeBtnText}>ホームに戻る</Text>
        </TouchableOpacity>

        {isWin && (
          <TouchableOpacity style={styles.replayBtn} onPress={onBack}>
            <Text style={styles.replayBtnText}>もう一度バトル ⚔️</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  )
}

function BreakdownRow({ label, value, color }) {
  return (
    <View style={styles.breakdownRow}>
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, { color }]}>+{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  loadingText: { marginTop: 12, color: colors.textSub, fontSize: 14 },

  particleOrigin: {
    position: 'absolute', top: '45%', left: '50%',
    alignItems: 'center', justifyContent: 'center',
  },

  emojiWrap: { alignItems: 'center', marginBottom: 16 },
  emoji: { fontSize: 96 },

  streakBadge: {
    marginTop: 8,
    backgroundColor: '#fff3e0',
    borderRadius: radius.full,
    paddingVertical: 4, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: '#ff6b35',
  },
  streakBadgeText: { fontSize: 14, fontWeight: '800', color: '#ff6b35' },

  result:     { fontSize: 44, fontWeight: '900', marginBottom: 8 },
  resultWin:  { color: colors.gold },
  resultLose: { color: colors.danger },
  message:    { fontSize: 16, color: colors.textSub, marginBottom: 32, textAlign: 'center' },

  cards: { width: '100%', gap: 12 },

  rankCard: {
    borderRadius: radius.lg, padding: 20,
    borderWidth: 2, ...shadow,
  },
  rankCardWin:  { backgroundColor: '#fffbea', borderColor: colors.gold },
  rankCardLose: { backgroundColor: '#fff5f5', borderColor: colors.danger },
  rankCardLabel:{ fontSize: 12, color: colors.textLight, fontWeight: '600', marginBottom: 12, textAlign: 'center' },

  rankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  rankArrow:    { fontSize: 20, fontWeight: '900' },
  rankArrowUp:  { color: colors.primary },
  rankArrowDown:{ color: colors.danger },
  rankChangeNum:{ fontSize: 48, fontWeight: '900' },
  rankChangeWin: { color: colors.primary },
  rankChangeLose:{ color: colors.danger },

  // ボーナス内訳
  bonusBreakdown: { marginBottom: 12 },
  breakdownRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  breakdownLabel: { fontSize: 13, color: colors.textSub, fontWeight: '500' },
  breakdownValue: { fontSize: 15, fontWeight: '800' },
  bonusDivider:   { height: 1, backgroundColor: colors.border, marginVertical: 6 },
  bonusTotalRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bonusTotalLabel:{ fontSize: 14, fontWeight: '700', color: colors.text },

  rankNowRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  rankNowLabel: { fontSize: 13, color: colors.textSub },
  rankNowNum:   { fontSize: 20, fontWeight: '800' },

  // 初勝利バナー
  firstWinBanner: {
    backgroundColor: '#fffbea',
    borderRadius: radius.lg,
    paddingVertical: 14, paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 2, borderColor: '#f59e0b',
    ...shadow,
  },
  firstWinText: { fontSize: 16, fontWeight: '800', color: '#d97706' },

  homeBtn: {
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center', ...shadow,
  },
  homeBtnText:  { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  replayBtn:    { paddingVertical: 14, alignItems: 'center' },
  replayBtnText:{ color: colors.textSub, fontSize: 15, fontWeight: '600' },
})
