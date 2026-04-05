import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, radius } from '../../lib/theme'
import HomeScreen from './index'
import BattleScreen from './battle'
import DiaryScreen from './diary'
import ProfileScreen from './profile'

const LEFT_TABS  = [
  { key: 'home',    label: 'ホーム',       emoji: '🏠' },
  { key: 'diary',   label: '日記',         emoji: '📖' },
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
          {/* 左タブ */}
          {LEFT_TABS.map(tab => (
            <SideTab
              key={tab.key}
              tab={tab}
              active={activeTab === tab.key}
              onPress={() => setActiveTab(tab.key)}
            />
          ))}

          {/* 中央：バトル開始ボタン */}
          <TouchableOpacity
            style={[styles.battleTab, activeTab === 'battle' && styles.battleTabActive]}
            onPress={() => setActiveTab('battle')}
            activeOpacity={0.8}
          >
            <Text style={styles.battleTabEmoji}>⚔️</Text>
            <Text style={[styles.battleTabLabel, activeTab === 'battle' && styles.battleTabLabelActive]}>
              バトル開始
            </Text>
          </TouchableOpacity>

          {/* 右タブ */}
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
    <TouchableOpacity style={styles.sideTab} onPress={onPress} activeOpacity={0.7}>
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
    paddingTop: 6,
    height: 78,
    alignItems: 'flex-start',
  },

  // サイドタブ
  sideTab: { flex: 1, alignItems: 'center', paddingTop: 4 },
  sideTabInner: {
    alignItems: 'center', paddingVertical: 4, paddingHorizontal: 10,
    borderRadius: radius.md, minWidth: 56,
  },
  sideTabInnerActive: { backgroundColor: colors.primaryLight },
  sideTabEmoji: { fontSize: 20 },
  sideTabLabel: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  sideTabLabelActive: { color: colors.primary, fontWeight: '700' },

  // 中央バトルボタン
  battleTab: {
    flex: 1.4,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -20,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  battleTabActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
  },
  battleTabEmoji: { fontSize: 22 },
  battleTabLabel: { fontSize: 11, color: '#fff', fontWeight: '800', marginTop: 2 },
  battleTabLabelActive: { color: '#fff' },
})
