import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
  NOTIFICATIONS: 'settings_notifications',
  SOUND:         'settings_sound',
}

const DEFAULTS = {
  notifications: true,
  sound:         true,
}

export async function getSettings() {
  try {
    const [notif, sound] = await Promise.all([
      AsyncStorage.getItem(KEYS.NOTIFICATIONS),
      AsyncStorage.getItem(KEYS.SOUND),
    ])
    return {
      notifications: notif !== null ? JSON.parse(notif) : DEFAULTS.notifications,
      sound:         sound !== null ? JSON.parse(sound)  : DEFAULTS.sound,
    }
  } catch {
    return DEFAULTS
  }
}

export async function saveSetting(key, value) {
  const map = { notifications: KEYS.NOTIFICATIONS, sound: KEYS.SOUND }
  await AsyncStorage.setItem(map[key], JSON.stringify(value))
}
