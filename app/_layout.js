import { Slot, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from '../context/AuthContext'

function RouteGuard() {
  const { session, profile, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inOnboarding = segments[0] === 'onboarding'

    if (session && !profile) {
      // ログイン済みだがプロフィール未作成 → ユーザー名入力へ
      if (!inOnboarding) router.replace('/onboarding')
    } else if (session && profile) {
      // ログイン済みかつプロフィールあり → ホームへ
      if (inOnboarding) router.replace('/')
    }
  }, [session, profile, loading])

  return <Slot />
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RouteGuard />
    </AuthProvider>
  )
}
