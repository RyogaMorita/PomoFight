import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native'
import { getTreeStage } from './TreeDisplay'
import Icon from './Icon'
import { colors, radius, shadow } from '../lib/theme'

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
  '立派な木', '大木', '古木', '神木', '伝説の木'
]

export default function TreePickerModal({ visible, onClose, totalPomodoros, selected, onSelect }) {
  const maxStage = getTreeStage(totalPomodoros ?? 0)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Icon name="plant" size={22} />
            <Text style={styles.title}>ホーム画像を選ぶ</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>バトルで到達したステージが解放されます</Text>

        <ScrollView contentContainerStyle={styles.grid}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map(stage => {
            const unlocked = stage <= maxStage
            const isSelected = selected === stage
            return (
              <TouchableOpacity
                key={stage}
                style={[
                  styles.cell,
                  isSelected && styles.cellSelected,
                  !unlocked && styles.cellLocked,
                ]}
                onPress={() => {
                  if (!unlocked) return
                  onSelect(stage)
                  onClose()
                }}
                activeOpacity={unlocked ? 0.7 : 1}
              >
                <View style={styles.imageWrap}>
                  <Image
                    source={TREE_IMAGES[stage]}
                    style={[styles.image, !unlocked && styles.imageLocked]}
                    resizeMode="cover"
                  />
                  <View style={styles.watermarkCover} />
                  {!unlocked && (
                    <View style={styles.lockOverlay}>
                      <Icon name="lock" size={28} />
                    </View>
                  )}
                </View>
                <Text style={[styles.stageName, !unlocked && styles.stageNameLocked]}>
                  {STAGE_NAMES[stage]}
                </Text>
                <Text style={[styles.stageNum, !unlocked && styles.stageNameLocked]}>
                  Stage {stage}
                </Text>
                {isSelected && <View style={styles.selectedDot} />}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 56,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 22, color: colors.textSub },
  subtitle: {
    fontSize: 13, color: colors.textSub, textAlign: 'center',
    paddingVertical: 12, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },

  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    padding: 16, gap: 12,
  },
  cell: {
    width: '47%', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 12, ...shadow,
    borderWidth: 2, borderColor: 'transparent',
  },
  cellSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cellLocked: {
    opacity: 0.5,
  },

  imageWrap: {
    width: 100, height: 100, borderRadius: radius.sm,
    overflow: 'hidden', backgroundColor: '#d8d8d8',
    marginBottom: 8,
  },
  image: { width: 100, height: 100 },
  imageLocked: { opacity: 0.4 },
  watermarkCover: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 18, backgroundColor: '#d8d8d8',
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
  },
  lockIcon: { fontSize: 28 },

  stageName: { fontSize: 13, fontWeight: '700', color: colors.text },
  stageNum:  { fontSize: 11, color: colors.textSub, marginTop: 2 },
  stageNameLocked: { color: colors.textLight },

  selectedDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary, marginTop: 6,
  },
})
