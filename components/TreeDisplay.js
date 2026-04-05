import { View, Text, Image, StyleSheet } from 'react-native'

const TREE_IMAGES = {
  1: require('../assets/trees/tree_1.png'),
  2: require('../assets/trees/tree_2.png'),
  3: require('../assets/trees/tree_3.png'),
  4: require('../assets/trees/tree_4.png'),
  5: require('../assets/trees/tree_5.png'),
  6: require('../assets/trees/tree_6.png'),
  7: require('../assets/trees/tree_7.png'),
  8: require('../assets/trees/tree_8.png'),
  9: require('../assets/trees/tree_9.png'),
  10: require('../assets/trees/tree_10.png'),
}

const STAGE_NAMES = [
  '', '種', '芽吹き', '若葉', '小さな木', '成長中',
  '立派な木', '大木', '古木', '神木', '伝説の木'
]

const STAGE_MESSAGES = [
  '', 'まだ種です。頑張ろう！', '芽が出てきた！', '葉っぱが増えてきた！',
  '小さな木になったよ！', '順調に育ってます！半分クリア！',
  '立派な木になってきた！', '大木に成長中！', '古木の風格が出てきた！',
  'もうすぐ伝説の木！', '🎉 伝説の木に到達！'
]

export function getTreeStage(totalPomodoros) {
  if (totalPomodoros < 5) return 1
  if (totalPomodoros < 15) return 2
  if (totalPomodoros < 30) return 3
  if (totalPomodoros < 50) return 4
  if (totalPomodoros < 80) return 5
  if (totalPomodoros < 120) return 6
  if (totalPomodoros < 180) return 7
  if (totalPomodoros < 250) return 8
  if (totalPomodoros < 350) return 9
  return 10
}

function getProgress(totalPomodoros, stage) {
  const thresholds = [0, 5, 15, 30, 50, 80, 120, 180, 250, 350]
  const next = thresholds[stage] ?? 350
  const current = thresholds[stage - 1] ?? 0
  if (stage >= 10) return 100
  return Math.round(((totalPomodoros - current) / (next - current)) * 100)
}

// カード形式（対戦中・ホーム用）
export default function TreeDisplay({ totalPomodoros, size = 'large' }) {
  const stage = getTreeStage(totalPomodoros ?? 0)
  const progress = getProgress(totalPomodoros ?? 0, stage)
  const isLarge = size === 'large'

  if (isLarge) {
    return (
      <View style={styles.card}>
        <View style={styles.imageWrap}>
          <Image
            source={TREE_IMAGES[stage]}
            style={styles.imageLarge}
            resizeMode="cover"
          />
          {/* 下一行のウォーターマークを画像背景色で隠す */}
          <View style={styles.watermarkCover} />
        </View>

        <Text style={styles.progressText}>{progress}%</Text>
        <Text style={styles.message}>{STAGE_MESSAGES[stage]}</Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>

        <Text style={styles.stageName}>Stage {stage} / 10　{STAGE_NAMES[stage]}</Text>
      </View>
    )
  }

  // 小サイズ（対戦中画面）
  return (
    <View style={styles.smallCard}>
      <View style={styles.imageWrapSmall}>
        <Image
          source={TREE_IMAGES[stage]}
          style={styles.imageSmall}
          resizeMode="cover"
        />
        <View style={styles.watermarkCoverSmall} />
      </View>
      <View style={styles.smallInfo}>
        <Text style={styles.smallStageName}>{STAGE_NAMES[stage]}</Text>
        <Text style={styles.smallProgress}>{progress}%</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  // ラージカード
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrap: {
    width: 240, height: 240,
    borderRadius: 12, overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#d8d8d8',
  },
  imageLarge: { width: 240, height: 240 },
  watermarkCover: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 30, backgroundColor: '#d8d8d8',
  },
  progressText: {
    fontSize: 36, fontWeight: 'bold', color: '#4CAF50', marginBottom: 4,
  },
  message: {
    fontSize: 14, color: '#888', marginBottom: 12, textAlign: 'center',
  },
  progressBar: {
    width: '100%', height: 8, backgroundColor: '#eee',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    height: '100%', backgroundColor: '#4CAF50', borderRadius: 4,
  },
  stageName: { fontSize: 12, color: '#aaa' },

  // スモールカード（対戦中）
  smallCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    padding: 8, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  imageWrapSmall: {
    width: 56, height: 56, borderRadius: 8,
    overflow: 'hidden', backgroundColor: '#d8d8d8',
  },
  imageSmall: { width: 56, height: 56 },
  watermarkCoverSmall: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 10, backgroundColor: '#d8d8d8',
  },
  smallInfo: { flex: 1 },
  smallStageName: { fontSize: 13, fontWeight: '600', color: '#333' },
  smallProgress: { fontSize: 12, color: '#4CAF50', marginTop: 2 },
})
