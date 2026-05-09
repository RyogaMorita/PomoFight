import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// ── チャンネルセットアップ (Android) ─────────────────────────
export async function setupNotificationChannel() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('pomodoro', {
    name: 'ポモドーロ通知',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 500, 200, 500],
  })
  await Notifications.setNotificationChannelAsync('battle', {
    name: 'バトル通知',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 300, 100, 300],
    showBadge: true,
  })
}

// ── 権限リクエスト ────────────────────────────────────────────
export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

// ── プッシュトークン取得 ──────────────────────────────────────
export async function getExpoPushToken() {
  try {
    const { data } = await Notifications.getExpoPushTokenAsync()
    return data
  } catch {
    return null
  }
}

// ── バトル中マイルストーン通知をまとめてスケジュール ─────────
export async function scheduleBattleNotifications(totalSeconds = 25 * 60, options = {}) {
  const { enabled = true, sound = true } = options
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (!enabled) return

  const channel = Platform.OS === 'android' ? { channelId: 'battle' } : {}

  const milestones = [
    { sec: 0,                    title: '⚔️ バトル開始！',      body: '伏せたまま集中しよう！スマホを置いて！' },
    { sec: totalSeconds - 20*60, title: '🔥 残り20分',         body: 'まだまだいける！集中継続！' },
    { sec: totalSeconds - 15*60, title: '🌿 残り15分',         body: '折り返し過ぎた！もう少し！' },
    { sec: totalSeconds - 10*60, title: '⚡ 残り10分',         body: 'あと少し！ここが踏ん張りどころ！' },
    { sec: totalSeconds - 5*60,  title: '🚨 残り5分！',        body: 'もうすぐ完了！絶対伏せろ！' },
    { sec: totalSeconds - 60,    title: '🔥 残り1分！！',      body: 'ラストスパート！！！' },
    { sec: totalSeconds,         title: '🌳 ポモドーロ完了！', body: 'お疲れさまでした！スマホを持ち上げてログを記録しよう' },
  ].filter(m => m.sec >= 0 && m.sec <= totalSeconds)

  for (const m of milestones) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: m.title,
        body: m.body,
        sound,
        ...channel,
      },
      trigger: m.sec === 0
        ? null  // 即時
        : { type: 'timeInterval', seconds: m.sec, repeats: false },
    })
  }
}

// ── ポモドーロ完了を即時通知 ──────────────────────────────────
export async function notifyPomodoroComplete(options = {}) {
  const { enabled = true, sound = true } = options
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (!enabled) return
  const channel = Platform.OS === 'android' ? { channelId: 'battle' } : {}
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌳 ポモドーロ完了！',
      body: 'お疲れさまでした！スマホを持ち上げてログを記録しよう',
      sound,
      ...channel,
    },
    trigger: null,
  })
}

// ── 休憩終了通知 ─────────────────────────────────────────────
export async function scheduleBreakCompleteNotification(seconds = 5 * 60, options = {}) {
  const { enabled = true, sound = true } = options
  if (!enabled) return
  const channel = Platform.OS === 'android' ? { channelId: 'battle' } : {}
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '☕ 休憩終了',
      body: 'メモと集中度を送って、バトル結果を確認しよう',
      sound,
      ...channel,
    },
    trigger: { type: 'timeInterval', seconds, repeats: false },
  })
}

// ── キャンセル ────────────────────────────────────────────────
export async function cancelPomodorNotification() {
  await Notifications.cancelAllScheduledNotificationsAsync()
}

// 後方互換（FightScreenが直接呼ぶ場合のため残す）
export async function schedulePomodoroDoneNotification(seconds = 25 * 60) {
  return scheduleBattleNotifications(seconds)
}
