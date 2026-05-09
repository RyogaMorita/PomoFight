import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { colors } from '../lib/theme'

function RouteGuard() {
  const { session, profile, loading, configError } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inOnboarding = segments[0] === 'onboarding'
    const inTabs = segments[0] === '(tabs)'

    if (session && !profile && !inOnboarding) {
      router.replace('/onboarding')
    } else if (session && profile && inOnboarding) {
      router.replace('/(tabs)')
    } else if (session && profile && segments[0] === undefined) {
      router.replace('/(tabs)')
    }
  }, [session, profile, loading, segments[0]])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    )
  }

  if (configError) {
    return (
      <View style={styles.configError}>
        <Text style={styles.configTitle}>設定が必要です</Text>
        <Text style={styles.configText}>{configError}</Text>
      </View>
    )
  }

  return <Slot />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  configError: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  configTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
  },
  configText: {
    color: colors.textSub,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
})
