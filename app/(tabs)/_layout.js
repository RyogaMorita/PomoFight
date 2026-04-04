import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import HomeScreen from './index'
import BattleScreen from './battle'
import DiaryScreen from './diary'
import ProfileScreen from './profile'

const TABS = [
  { key: 'home', label: 'ホーム', emoji: '🏠', component: HomeScreen },
  { key: 'battle', label: 'バトル', emoji: '⚔️', component: BattleScreen },
  { key: 'diary', label: '日記', emoji: '📖', component: DiaryScreen },
  { key: 'profile', label: 'プロフィール', emoji: '👤', component: ProfileScreen },
]

export default function TabLayout() {
  const [activeTab, setActiveTab] = useState('home')
  const ActiveScreen = TABS.find(t => t.key === activeTab)?.component

  return (
    <View style={styles.container}>
      <View style={styles.screen}>
        {ActiveScreen && <ActiveScreen />}
      </View>
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={styles.tabEmoji}>{tab.emoji}</Text>
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  screen: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#12122a',
    borderTopColor: '#2a2a4a',
    borderTopWidth: 1,
    paddingBottom: 24,
    paddingTop: 8,
    height: 70,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabEmoji: { fontSize: 20 },
  tabLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  tabLabelActive: { color: '#4CAF50' },
})
