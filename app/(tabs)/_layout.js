import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, radius } from '../../lib/theme'
import HomeScreen from './index'
import BattleScreen from './battle'
import DiaryScreen from './diary'
import ProfileScreen from './profile'

const LEFT_TABS = [
  { key: 'home',    label: 'ホーム', emoji: '🏠' },
  { key: 'diary',   label: '日記',   emoji: '📖' },
]
const RIGHT_TABS = [
  { key: 'profile', label: 'プロフィール', emoji: '👤' },
]

export default function TabLayout() {
  const [activeTab, setActiveTab] = useState('home')
  const [hideTabBar, setHideTabBar] = useState(false)

  function renderScreen() {
    switch (activeTab) {
      case 'home':    return <HomeScreen />
      case 'battle':  return <BattleScreen onHideTabBar={setHideTabBar} />
      case 'diary':   return <DiaryScreen />
      case 'profile': return <ProfileScreen />
      default:        return null
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {renderScreen()}
      </View>

      {!hideTabBar && (
        <View style={styles.tabBar}>
          {LEFT_TABS.map(tab => (
            <SideTab
              key={tab.key}
              tab={tab}
              active={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}

          {/* 中央バトルボタン */}
          <TouchableOpacity
            style={[
              styles.battleTabWrap,
              activeTab === 'battle' ? styles.battleTabWrapActive : styles.battleTabWrapInactive,
            ]}
            onPress={() => setActiveTab('battle')}
            activeOpacity={0.8}
          >
            <View style={[
              styles.battleTab,
              activeTab === 'battle' && styles.battleTabActive,
            ]}>
              <Text style={styles.battleTabEmoji}>⚔️</Text>
              <Text style={[styles.battleTabLabel, activeTab === 'battle' && styles.battleTabLabelActive]}>バトル開始</Text>
            </View>
          </TouchableOpacity>

          {RIGHT_TABS.map(tab => (
            <SideTab
              key={tab.key}
              tab={tab}
              active={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}
        </View>
      )}
    </View>
  )
}

function SideTab({ tab, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.sideTab, active ? styles.sideTabActive : styles.sideTabInactive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.sideTabInner, active && styles.sideTabInnerActive]}>
        <Text style={styles.sideTabEmoji}>{tab.emoji}</Text>
        <Text style={[styles.sideTabLabel, active && styles.sideTabLabelActive]}>
          {tab.label}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: 24,
    height: 78,
    alignItems: 'flex-end',  // 下揃えにして、上への浮き上がりで差をつける
  },

  // サイドタブ
  sideTab: { flex: 1, alignItems: 'center', paddingBottom: 4 },
  sideTabInactive: { marginBottom: 0 },      // 通常位置
  sideTabActive:   { marginBottom: 8 },      // アクティブ時に浮き上がる
  sideTabInner: {
    alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: radius.md, minWidth: 56,
  },
  sideTabInnerActive: { backgroundColor: colors.primaryLight },
  sideTabEmoji: { fontSize: 20 },
  sideTabLabel: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  sideTabLabelActive: { color: colors.primary, fontWeight: '700' },

  // 中央バトルボタン（ラッパーで位置制御）
  battleTabWrap: { flex: 1.4, alignItems: 'center', paddingHorizontal: 4 },
  battleTabWrapInactive: { paddingBottom: 4 },   // 通常位置
  battleTabWrapActive:   { paddingBottom: 16 },  // アクティブ時に浮き上がる

  battleTab: {
    width: '100%', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 8, borderRadius: radius.lg,
    backgroundColor: colors.cardSub,
    borderWidth: 1, borderColor: colors.border,
  },
  battleTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  battleTabEmoji: { fontSize: 22 },
  battleTabLabel: { fontSize: 11, color: colors.textSub, fontWeight: '800', marginTop: 2 },
  battleTabLabelActive: { color: '#fff' },
})
