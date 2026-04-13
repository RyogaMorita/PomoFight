import { useState } from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, radius } from '../../lib/theme'
import HomeScreen from './index'
import BattleScreen from './battle'
import DiaryScreen from './diary'
import ProfileScreen from './profile'
import SettingsScreen from './settings'

const TABS = [
  { key: 'home',     label: 'ホーム',       emoji: null,  image: require('../../assets/home.png') },
  { key: 'diary',    label: '日記',         emoji: '📖',  image: null },
  { key: 'battle',   label: 'バトル',       emoji: null,  image: require('../../assets/Wsord.png') },
  { key: 'profile',  label: 'プロフィール', emoji: null,  image: require('../../assets/profile.png') },
  { key: 'settings', label: '設定',         emoji: '⚙️',  image: null },
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
      case 'diary':    return <DiaryScreen />
      case 'profile':  return <ProfileScreen />
      case 'settings': return <SettingsScreen />
      default:         return null
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
                onPress={() => tab.key === 'battle' ? goToBattle('goal') : setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                {tab.image
                  ? <Image source={tab.image} style={[styles.tabImage, { opacity: active ? 1 : 0.4 }]} resizeMode="contain" />
                  : <Text style={styles.tabEmoji}>{tab.emoji}</Text>
                }
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
  tabImage: { width: 22, height: 22 },
  tabLabel: { fontSize: 10, color: colors.textLight, marginTop: 2 },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
})
