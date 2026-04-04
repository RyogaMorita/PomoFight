import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { AuthProvider, useAuth } from '../context/AuthContext'

function RouteGuard() {
  const { session, profile, loading } = useAuth()
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

  return <Slot />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
    </AuthProvider>
  )
}
