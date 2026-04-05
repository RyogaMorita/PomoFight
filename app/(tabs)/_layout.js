import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, radius } from '../../lib/theme'
import HomeScreen from './index'
import BattleScreen from './battle'
import DiaryScreen from './diary'
import ProfileScreen from './profile'

const TABS = [
  { key: 'home',    label: 'ホーム',       emoji: '🏠' },
  { key: 'diary',   label: '日記',         emoji: '📖' },
  { key: 'battle',  label: 'バトル開始',   emoji: '⚔️' },
  { key: 'profile', label: 'プロフィール', emoji: '👤' },
]

export default function TabLayout() {
  const [activeTab, setActiveTab]           = useState('home')
  const [hideTabBar, setHideTabBar]         = useState(false)
  const [battleInitialPhase, setBattleInitialPhase] = useState('goal')
  const [battleKey, setBattleKey]           = useState(0)

  function goToBattle(phase = 'goal') {
    setBattleInitialPhase(phase)
    setBattleKey(k => k + 1)
    setActiveTab('battle')
  }

  function renderScreen() {
    switch (activeTab) {
      case 'home':    return (
        <HomeScreen
          onBattle={()      => goToBattle('goal')}
          onCreateRoom={()  => goToBattle('create_room')}
          onJoinRoom={()    => goToBattle('join_room')}
        />
      )
      case 'battle':  return (
        <BattleScreen
          key={battleKey}
          initialPhase={battleInitialPhase}
          onHideTabBar={setHideTabBar}
        />
      )
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
          {TABS.map(tab => {
            const active = activeTab === tab.key
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.tabEmoji}>{tab.emoji}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
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
    height: 78,
    alignItems: 'flex-end',
  },

  tabItem: {
    flex: 1, alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 4,
    marginBottom: 0,
    borderRadius: radius.md,
    marginHorizontal: 4,
  },
  tabItemActive: {
    backgroundColor: colors.primaryLight,
    marginBottom: 8,
  },

  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
})
