import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

const missingEnv = [
  !supabaseUrl && 'EXPO_PUBLIC_SUPABASE_URL',
  !supabaseAnonKey && 'EXPO_PUBLIC_SUPABASE_ANON_KEY',
].filter(Boolean)

export const supabaseConfigError = missingEnv.length
  ? `${missingEnv.join(', ')} が未設定です。.env を作成して Expo を再起動してください。`
  : null

export const isSupabaseConfigured = !supabaseConfigError

function createMissingClient() {
  return new Proxy({}, {
    get() {
      throw new Error(supabaseConfigError)
    },
  })
}

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}) : createMissingClient()
