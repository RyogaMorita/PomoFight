import { useEffect, useRef } from 'react'
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  Animated, Easing,
} from 'react-native'
import { colors, radius } from '../lib/theme'

const TREE_IMAGES = {
  1:  require('../assets/trees/tree_1.png'),
  2:  require('../assets/trees/tree_2.png'),
  3:  require('../assets/trees/tree_3.png'),
  4:  require('../assets/trees/tree_4.png'),
  5:  require('../assets/trees/tree_5.png'),
  6:  require('../assets/trees/tree_6.png'),
  7:  require('../assets/trees/tree_7.png'),
  8:  require('../assets/trees/tree_8.png'),
  9:  require('../assets/trees/tree_9.png'),
  10: require('../assets/trees/tree_10.png'),
}

const STAGE_NAMES = [
  '', '種', '芽吹き', '若葉', '小さな木', '成長中',
  '立派な木', '大木', '古木', '神木', '伝説の木',
]

function EvoParticle({ delay }) {
  const y   = useRef(new Animated.Value(0)).current
  const x   = useRef(new Animated.Value(0)).current
  const op  = useRef(new Animated.Value(0)).current
  const rot = useRef(new Animated.Value(0)).current
  const dx  = (Math.random() - 0.5) * 280
  const colors_list = ['#ffd700', '#4caf50', '#00bcd4', '#ff6b35', '#e91e63', '#fff176']
  const color = colors_list[Math.floor(Math.random() * colors_list.length)]
  const size  = 6 + Math.random() * 8

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(op,  { toValue: 1, duration: 80,  useNativeDriver: true }),
        Animated.timing(y,   { toValue: -350 + Math.random() * 150, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(x,   { toValue: dx,  duration: 1000, useNativeDriver: true }),
        Animated.timing(rot, { toValue: 1,   duration: 1000, useNativeDriver: true }),
      ]),
      Animated.timing(op, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start()
  }, [])

  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${(Math.random() > 0.5 ? 1 : -1) * 720}deg`] })

  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      opacity: op,
      transform: [{ translateY: y }, { translateX: x }, { rotate: spin }],
    }} />
  )
}

export default function TreeEvolutionOverlay({ fromStage, toStage, onDismiss }) {
  const particles = Array.from({ length: 30 }, (_, i) => i)

  // アニメーション値
  const overlayOp     = useRef(new Animated.Value(0)).current
  const flashOp       = useRef(new Animated.Value(0)).current
  const oldTreeOp     = useRef(new Animated.Value(0)).current
  const oldTreeScale  = useRef(new Animated.Value(0.8)).current
  const newTreeScale  = useRef(new Animated.Value(0)).current
  const newTreeOp     = useRef(new Animated.Value(0)).current
  const titleScale    = useRef(new Animated.Value(0)).current
  const titleOp       = useRef(new Animated.Value(0)).current
  const stageNameY    = useRef(new Animated.Value(20)).current
  const stageNameOp   = useRef(new Animated.Value(0)).current
  const arrowOp       = useRef(new Animated.Value(0)).current
  const particleTrigger = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.sequence([
      // 1. オーバーレイ表示
      Animated.timing(overlayOp, { toValue: 1, duration: 350, useNativeDriver: true }),

      // 2. 古い木を表示
      Animated.parallel([
        Animated.timing(oldTreeOp,    { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(oldTreeScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),

      Animated.delay(600),

      // 3. 矢印フェードイン
      Animated.timing(arrowOp, { toValue: 1, duration: 200, useNativeDriver: true }),

      Animated.delay(200),

      // 4. フラッシュ！
      Animated.sequence([
        Animated.timing(flashOp, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(flashOp, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),

      // 5. 新しい木をドーン
      Animated.parallel([
        Animated.timing(newTreeOp,    { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(newTreeScale, { toValue: 1, friction: 4, tension: 100, useNativeDriver: true }),
      ]),

      // 6. STAGE UP! テキスト
      Animated.parallel([
        Animated.spring(titleScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        Animated.timing(titleOp,    { toValue: 1, duration: 200, useNativeDriver: true }),
      ]),

      // 7. ステージ名
      Animated.parallel([
        Animated.timing(stageNameY,  { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(stageNameOp, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),

    ]).start(() => {
      // パーティクルトリガー（アニメーション完了後）
      particleTrigger.setValue(1)
    })
  }, [])

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOp }]}>

      {/* フラッシュ */}
      <Animated.View style={[styles.flash, { opacity: flashOp }]} pointerEvents="none" />

      {/* パーティクル */}
      <View style={styles.particleOrigin} pointerEvents="none">
        {particles.map(i => (
          <EvoParticle key={i} delay={800 + i * 40} />
        ))}
      </View>

      {/* メインコンテンツ */}
      <View style={styles.content}>

        {/* 木の変化表示 */}
        <View style={styles.treeRow}>
          {/* 旧ステージ */}
          <Animated.View style={[styles.treeBox, styles.treeBoxOld, { opacity: oldTreeOp, transform: [{ scale: oldTreeScale }] }]}>
            <Image source={TREE_IMAGES[fromStage]} style={styles.treeImg} resizeMode="cover" />
            <Text style={styles.treeStageOld}>Stage {fromStage}</Text>
          </Animated.View>

          {/* 矢印 */}
          <Animated.Text style={[styles.arrow, { opacity: arrowOp }]}>→</Animated.Text>

          {/* 新ステージ */}
          <Animated.View style={[styles.treeBox, styles.treeBoxNew, { opacity: newTreeOp, transform: [{ scale: newTreeScale }] }]}>
            <Image source={TREE_IMAGES[toStage]} style={styles.treeImg} resizeMode="cover" />
            <Text style={styles.treeStageNew}>Stage {toStage}</Text>
          </Animated.View>
        </View>

        {/* STAGE UP! */}
        <Animated.Text style={[styles.stageUpText, { transform: [{ scale: titleScale }], opacity: titleOp }]}>
          🌟 STAGE UP! 🌟
        </Animated.Text>

        {/* ステージ名 */}
        <Animated.Text style={[styles.stageName, { transform: [{ translateY: stageNameY }], opacity: stageNameOp }]}>
          {STAGE_NAMES[toStage]}
        </Animated.Text>

        {/* タップで続ける */}
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.8}>
          <Text style={styles.dismissText}>タップして続ける</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffcc',
    zIndex: 1000,
  },
  particleOrigin: {
    position: 'absolute',
    top: '50%', left: '50%',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1001,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
  },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
  },
  treeBox: {
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: 8,
  },
  treeBoxOld: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  treeBoxNew: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderWidth: 2,
    borderColor: '#ffd700',
  },
  treeImg: {
    width: 110, height: 110,
    borderRadius: radius.md,
  },
  treeStageOld: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  treeStageNew: {
    marginTop: 6,
    fontSize: 13,
    color: '#ffd700',
    fontWeight: '800',
  },
  arrow: {
    fontSize: 28,
    color: '#ffd700',
    fontWeight: '900',
  },
  stageUpText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffd700',
    marginBottom: 10,
    textShadowColor: 'rgba(255,215,0,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  stageName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 36,
    letterSpacing: 1,
  },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dismissText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
})
