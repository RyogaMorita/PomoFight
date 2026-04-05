import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function schedulePomodoroDoneNotification(seconds = 25 * 60) {
  await Notifications.cancelAllScheduledNotificationsAsync()
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌳 ポモドーロ完了！',
      body: 'お疲れさまでした！スマホを持ち上げてログを記録しよう',
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'pomodoro' }),
    },
    trigger: {
      type: 'timeInterval',
      seconds,
      repeats: false,
    },
  })
}

export async function cancelPomodorNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

export async function setupNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('pomodoro', {
      name: 'ポモドーロ通知',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 500, 200, 500],
    })
  }
}
