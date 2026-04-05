import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, radius } from '../../lib/theme'
import HomeScreen from './index'
import BattleScreen from './battle'
import DiaryScreen from './diary'
import ProfileScreen from './profile'

const TABS = [
  { key: 'home',    label: 'ホーム',       emoji: '🏠' },
  { key: 'battle',  label: 'バトル',       emoji: '⚔️' },
  { key: 'diary',   label: '日記',         emoji: '📖' },
  { key: 'profile', label: 'プロフィール', emoji: '👤' },
]

export default function TabLayout() {
  const [activeTab, setActiveTab] = useState('home')
  const [hideTabBar, setHideTabBar] = useState(false)

  function renderScreen() {
    switch (activeTab) {
      case 'home':
        return <HomeScreen onBattle={() => setActiveTab('battle')} />
      case 'battle':
        return <BattleScreen onHideTabBar={setHideTabBar} />
      case 'diary':
        return <DiaryScreen />
      case 'profile':
        return <ProfileScreen />
      default:
        return null
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {renderScreen()}
      </View>
      {!hideTabBar && (
        <View style={styles.tabBar}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key
            const isBattle = tab.key === 'battle'
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.tabItem}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                {isBattle ? (
                  // バトルタブだけ大きく強調
                  <View style={[styles.battleTab, isActive && styles.battleTabActive]}>
                    <Text style={styles.battleTabEmoji}>{tab.emoji}</Text>
                  </View>
                ) : (
                  <View style={[styles.tabInner, isActive && styles.tabInnerActive]}>
                    <Text style={styles.tabEmoji}>{tab.emoji}</Text>
                    <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                      {tab.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </View>
      )}
    </View>
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
    height: 74,
    alignItems: 'flex-start',
  },
  tabItem: {
    flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2,
  },
  tabInner: {
    alignItems: 'center', paddingVertical: 4, paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  tabInnerActive: {
    backgroundColor: colors.primaryLight,
  },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },

  // バトルタブ（中央・強調）
  battleTab: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.cardSub,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -18,
    borderWidth: 3, borderColor: colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 6,
  },
  battleTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  battleTabEmoji: { fontSize: 24 },
})
