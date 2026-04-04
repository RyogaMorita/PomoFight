import { Tabs } from 'expo-router'
import { Text } from 'react-native'

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  )
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: '#12122a',
          borderTopColor: '#2a2a4a',
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'ホーム',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="battle"
        options={{
          title: 'バトル',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="⚔️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="diary"
        options={{
          title: '日記',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📖" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'プロフィール',
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  )
}
