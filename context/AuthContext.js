import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { isSupabaseConfigured, supabase, supabaseConfigError } from '../lib/supabase'
import { getExpoPushToken, requestNotificationPermission } from '../lib/notifications'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onlineCount, setOnlineCount] = useState(1)
  const presenceChannel = useRef(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user?.id || !profile) return

    const channel = supabase.channel('online-users')
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const count = Object.values(state).reduce((sum, users) => sum + users.length, 0)
        setOnlineCount(Math.max(1, count))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: session.user.id,
            username: profile.username,
            at: Date.now(),
          })
        }
      })

    presenceChannel.current = channel
    return () => {
      presenceChannel.current?.unsubscribe()
      presenceChannel.current = null
    }
  }, [session?.user?.id, profile?.id])

  async function init() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
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
      setProfile(data ?? null)
      if (data) savePushToken(userId)
    } catch (e) {
      console.error('fetchProfile error:', e)
    } finally {
      setLoading(false)
    }
  }

  async function savePushToken(userId) {
    const granted = await requestNotificationPermission()
    if (!granted) return
    const token = await getExpoPushToken()
    if (!token) return
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId)
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

  async function updateHomeTree(stage) {
    if (!session) return
    const { error } = await supabase
      .from('profiles')
      .update({ home_tree: stage })
      .eq('id', session.user.id)
    if (!error) setProfile(prev => prev ? { ...prev, home_tree: stage } : prev)
  }

  async function updateProfileIcon(icon) {
    if (!session) return
    const { error } = await supabase
      .from('profiles')
      .update({ profile_icon: icon })
      .eq('id', session.user.id)
    if (!error) setProfile(prev => prev ? { ...prev, profile_icon: icon } : prev)
  }

  async function updateStatusBadge(statusBadge) {
    if (!session) return
    const { error } = await supabase
      .from('profiles')
      .update({ status_badge: statusBadge })
      .eq('id', session.user.id)
    if (!error) setProfile(prev => prev ? { ...prev, status_badge: statusBadge } : prev)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, onlineCount, configError: supabaseConfigError, createProfile, linkEmail, fetchProfile, updateHomeTree, updateProfileIcon, updateStatusBadge }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
