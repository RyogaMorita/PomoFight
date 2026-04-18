import { useState, useEffect } from 'react'
import { Modal, View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native'
import { getTreeStage } from './TreeDisplay'
import { getFishStage, FISH_STAGE_NAMES } from './FishDisplay'
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

const FISH_IMAGES = {
  1: require('../assets/fish/fish_1.png'),
  2: require('../assets/fish/fish_2.png'),
  3: require('../assets/fish/fish_3.png'),
  4: require('../assets/fish/fish_4.png'),
  5: require('../assets/fish/fish_5.png'),
  6: require('../assets/fish/fish_6.png'),
}

const TREE_STAGE_NAMES = [
  '', '種', '芽吹き', '若葉', '小さな木', '成長中',
  '立派な木', '大木', '古木', '神木', '伝説の木'
]

// home_tree encoding: 1-10 = 木, 11-16 = 魚 (11 = fish_1, ...)
export function isHomeFish(homeTree) { return (homeTree ?? 1) >= 11 }
export function homeFishStage(homeTree) { return (homeTree ?? 11) - 10 }

export default function TreePickerModal({ visible, onClose, totalPomodoros, selected, onSelect }) {
  const [tab, setTab] = useState(isHomeFish(selected) ? 'fish' : 'tree')

  useEffect(() => {
    if (visible) setTab(isHomeFish(selected) ? 'fish' : 'tree')
  }, [visible])

  const maxTree = getTreeStage(totalPomodoros ?? 0)
  const maxFish = getFishStage(totalPomodoros ?? 0)

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

        {/* タブ切り替え */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'tree' && styles.tabActive]}
            onPress={() => setTab('tree')}
          >
            <Text style={[styles.tabText, tab === 'tree' && styles.tabTextActive]}>🌳 木</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'fish' && styles.tabActive]}
            onPress={() => setTab('fish')}
          >
            <Text style={[styles.tabText, tab === 'fish' && styles.tabTextActive]}>🐟 魚</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>バトルで到達したステージが解放されます</Text>

        <ScrollView contentContainerStyle={styles.grid}>
          {tab === 'tree'
            ? Array.from({ length: 10 }, (_, i) => i + 1).map(stage => {
                const unlocked = stage <= maxTree
                const isSelected = selected === stage
                return (
                  <TouchableOpacity
                    key={stage}
                    style={[styles.cell, isSelected && styles.cellSelected, !unlocked && styles.cellLocked]}
                    onPress={() => { if (!unlocked) return; onSelect(stage); onClose() }}
                    activeOpacity={unlocked ? 0.7 : 1}
                  >
                    <View style={styles.imageWrap}>
                      <Image source={TREE_IMAGES[stage]} style={[styles.image, !unlocked && styles.imageLocked]} resizeMode="cover" />
                      <View style={styles.watermarkCover} />
                      {!unlocked && <View style={styles.lockOverlay}><Icon name="lock" size={28} /></View>}
                    </View>
                    <Text style={[styles.stageName, !unlocked && styles.stageNameLocked]}>{TREE_STAGE_NAMES[stage]}</Text>
                    <Text style={[styles.stageNum, !unlocked && styles.stageNameLocked]}>Stage {stage}</Text>
                    {isSelected && <View style={styles.selectedDot} />}
                  </TouchableOpacity>
                )
              })
            : Array.from({ length: 6 }, (_, i) => i + 1).map(fishStage => {
                const encoded = 10 + fishStage
                const unlocked = fishStage <= maxFish
                const isSelected = selected === encoded
                return (
                  <TouchableOpacity
                    key={fishStage}
                    style={[styles.cell, isSelected && styles.cellSelected, !unlocked && styles.cellLocked]}
                    onPress={() => { if (!unlocked) return; onSelect(encoded); onClose() }}
                    activeOpacity={unlocked ? 0.7 : 1}
                  >
                    <View style={styles.imageWrap}>
                      <Image source={FISH_IMAGES[fishStage]} style={[styles.image, !unlocked && styles.imageLocked]} resizeMode="cover" />
                      {!unlocked && <View style={styles.lockOverlay}><Icon name="lock" size={28} /></View>}
                    </View>
                    <Text style={[styles.stageName, !unlocked && styles.stageNameLocked]}>{FISH_STAGE_NAMES[fishStage]}</Text>
                    <Text style={[styles.stageNum, !unlocked && styles.stageNameLocked]}>Stage {fishStage}</Text>
                    {isSelected && <View style={styles.selectedDot} />}
                  </TouchableOpacity>
                )
              })
          }
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

  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 3, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.textSub },
  tabTextActive: { color: colors.primary },

  subtitle: {
    fontSize: 13, color: colors.textSub, textAlign: 'center',
    paddingVertical: 10, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, gap: 12 },
  cell: {
    width: '47%', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 12, ...shadow,
    borderWidth: 2, borderColor: 'transparent',
  },
  cellSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  cellLocked:   { opacity: 0.5 },

  imageWrap: {
    width: 100, height: 100, borderRadius: radius.sm,
    overflow: 'hidden', backgroundColor: '#d8d8d8', marginBottom: 8,
  },
  image:       { width: 100, height: 100 },
  imageLocked: { opacity: 0.4 },
  watermarkCover: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 18, backgroundColor: '#d8d8d8',
  },
  lockOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },

  stageName:       { fontSize: 13, fontWeight: '700', color: colors.text },
  stageNum:        { fontSize: 11, color: colors.textSub, marginTop: 2 },
  stageNameLocked: { color: colors.textLight },

  selectedDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: colors.primary, marginTop: 6,
  },
})
