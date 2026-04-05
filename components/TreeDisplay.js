import { View, Text, Image, StyleSheet } from 'react-native'

// 画像が揃ったら自動で使われる。なければ絵文字にフォールback
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

const TREE_EMOJIS = ['🌱', '🌱', '🌿', '🪴', '🌳', '🌳', '🌲', '🌲', '🎄', '🌴', '🎋']

const STAGE_NAMES = [
  '', '種', '芽吹き', '若葉', '小さな木', '成長中',
  '立派な木', '大木', '古木', '神木', '伝説の木'
]

// ポモドーロ数からステージ（1〜10）を計算
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

export default function TreeDisplay({ totalPomodoros, size = 'large' }) {
  const stage = getTreeStage(totalPomodoros ?? 0)
  const isLarge = size === 'large'

  return (
    <View style={styles.container}>
      <View style={isLarge ? styles.imageWrapLarge : styles.imageWrapSmall}>
        <Image
          source={TREE_IMAGES[stage]}
          style={isLarge ? styles.imageLarge : styles.imageSmall}
          resizeMode="cover"
        />
        {/* 右下のウォーターマークを隠す */}
        <View style={[styles.watermarkCover, isLarge ? styles.coverLarge : styles.coverSmall]} />
      </View>
      <Text style={[styles.stageName, isLarge ? styles.stageNameLarge : styles.stageNameSmall]}>
        Stage {stage}  {STAGE_NAMES[stage]}
      </Text>
      {isLarge && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(stage / 10) * 100}%` }]} />
        </View>
      )}
    </View>
  )
}


const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  imageWrapLarge: { width: 200, height: 200, marginBottom: 8, overflow: 'hidden' },
  imageWrapSmall: { width: 60, height: 60, overflow: 'hidden' },
  imageLarge: { width: 200, height: 200 },
  imageSmall: { width: 60, height: 60 },
  watermarkCover: { position: 'absolute', backgroundColor: '#1a1a2e' },
  coverLarge: { width: 60, height: 24, bottom: 0, right: 0 },
  coverSmall: { width: 20, height: 8, bottom: 0, right: 0 },
  stageName: { color: '#4CAF50', fontWeight: '600' },
  stageNameLarge: { fontSize: 16, marginBottom: 12 },
  stageNameSmall: { fontSize: 11 },
  progressBar: {
    width: 160, height: 6, backgroundColor: '#2a2a4a',
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
})
