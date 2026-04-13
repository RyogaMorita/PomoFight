import { View, Image, Text, StyleSheet } from 'react-native'
import { colors, radius, shadow } from '../lib/theme'

const FISH_IMAGES = {
  1: require('../assets/fish/fish_1.png'),
  2: require('../assets/fish/fish_2.png'),
  3: require('../assets/fish/fish_3.png'),
  4: require('../assets/fish/fish_4.png'),
  5: require('../assets/fish/fish_5.png'),
  6: require('../assets/fish/fish_6.png'),
}

export const FISH_STAGE_NAMES = ['', '稚魚', '若魚', '勇魚', '闘魚', '猛魚', '伝説の魚']

const FISH_STAGE_MESSAGES = [
  '', 'まだ小さな魚です。', '少し成長した！', '元気に泳いでる！',
  '強そうな魚だ！', 'もうすぐ伝説！', '🎉 伝説の魚に到達！',
]

// ポモドーロ完了（休憩）ごとに1段階成長、最大6
export function getFishStage(totalPomodoros) {
  return Math.min((totalPomodoros ?? 0) + 1, 6)
}

// プロフィールアバター用（円形）
export function FishAvatar({ totalPomodoros, size = 88, borderColor }) {
  const stage = getFishStage(totalPomodoros)
  return (
    <View style={[
      styles.avatar,
      { width: size, height: size, borderRadius: size / 2, borderColor: borderColor ?? colors.primary }
    ]}>
      <Image
        source={FISH_IMAGES[stage]}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        resizeMode="cover"
      />
    </View>
  )
}

// 対戦中センター表示用
export function FishBattleDisplay({ totalPomodoros }) {
  const stage = getFishStage(totalPomodoros)
  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <Image
          source={FISH_IMAGES[stage]}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.message}>{FISH_STAGE_MESSAGES[stage]}</Text>
      <Text style={styles.stageName}>Stage {stage} / 6　{FISH_STAGE_NAMES[stage]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  // アバター（円形）
  avatar: {
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
  },

  // 対戦中センター
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    ...shadow,
  },
  imageWrap: {
    width: 240, height: 240,
    borderRadius: radius.md, overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#e0f2fe',
  },
  image: { width: 240, height: 240 },
  message: {
    fontSize: 14, color: colors.textSub, marginBottom: 6, textAlign: 'center',
  },
  stageName: { fontSize: 12, color: colors.textLight },
})
