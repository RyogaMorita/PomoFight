import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 既存セッションを確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
      else signInAnonymously()
    })

    // セッション変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signInAnonymously() {
    const { error } = await supabase.auth.signInAnonymously()
    if (error) console.error('Anonymous sign in error:', error)
  }

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function createProfile(username) {
    if (!session) return
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: session.user.id, username })
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  async function linkEmail(email, password) {
    const { error } = await supabase.auth.updateUser({ email, password })
    return { error }
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, createProfile, linkEmail }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
