import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.id)
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function init() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log('getSession:', session?.user?.id, error)
      if (session) {
        setSession(session)
        await fetchProfile(session.user.id)
      } else {
        await signInAnonymously()
      }
    } catch (e) {
      console.error('init error:', e)
      setLoading(false)
    }
  }

  async function signInAnonymously() {
    try {
      const { data, error } = await supabase.auth.signInAnonymously()
      console.log('signInAnonymously:', data?.user?.id, error)
      if (error) {
        console.error('Anonymous sign in error:', error)
        setLoading(false)
      }
      // onAuthStateChange が fetchProfile を呼ぶので ここでは何もしない
    } catch (e) {
      console.error('signInAnonymously error:', e)
      setLoading(false)
    }
  }

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      console.log('fetchProfile:', data, error?.code)
      setProfile(data ?? null)
    } catch (e) {
      console.error('fetchProfile error:', e)
    } finally {
      setLoading(false)
    }
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
    <AuthContext.Provider value={{ session, profile, loading, createProfile, linkEmail, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
