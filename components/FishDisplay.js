import { View, Image, StyleSheet } from 'react-native'
import { colors, radius } from '../lib/theme'

const FISH_IMAGES = {
  1: require('../assets/fish/fish_1.png'),
  2: require('../assets/fish/fish_2.png'),
  3: require('../assets/fish/fish_3.png'),
  4: require('../assets/fish/fish_4.png'),
  5: require('../assets/fish/fish_5.png'),
  6: require('../assets/fish/fish_6.png'),
  7: require('../assets/fish/fish_6.png'), // TODO: fish_7.png 追加時に更新
  8: require('../assets/fish/fish_6.png'), // TODO: fish_8.png 追加時に更新
}

export const FISH_STAGE_NAMES = [
  '', '稚魚', '若魚', '勇魚', '闘魚', '猛魚', '豪魚', '剛魚', '伝説の魚'
]

export function getFishStage(wins) {
  if (wins < 3)  return 1
  if (wins < 8)  return 2
  if (wins < 15) return 3
  if (wins < 25) return 4
  if (wins < 40) return 5
  if (wins < 60) return 6
  if (wins < 90) return 7
  return 8
}

// プロフィールアバター用（円形）
export function FishAvatar({ wins, size = 88, borderColor }) {
  const stage = getFishStage(wins ?? 0)
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

const styles = StyleSheet.create({
  avatar: {
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: '#e0f2fe',
  },
})
