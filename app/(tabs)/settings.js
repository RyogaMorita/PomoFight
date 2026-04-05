import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { getSettings, saveSetting } from '../../lib/settings'
import { colors, radius, shadow } from '../../lib/theme'

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    notifications: true,
    sound: true,
  })

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const s = await getSettings()
    setSettings(s)
  }

  async function toggle(key) {
    const next = { ...settings, [key]: !settings[key] }
    setSettings(next)
    await saveSetting(key, next[key])
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ 設定</Text>
      </View>

      {/* ── バトル設定 ── */}
      <Text style={styles.sectionLabel}>バトル</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>ポモドーロ時間</Text>
          <Text style={styles.infoValue}>25分（固定）</Text>
        </View>
        <Text style={styles.itemDesc}>全プレイヤー共通のため変更不可</Text>
      </View>

      {/* ── 通知設定 ── */}
      <Text style={styles.sectionLabel}>通知・サウンド</Text>
      <View style={styles.card}>
        <SettingRow
          label="🔔 バトル通知"
          desc="残り時間・完了などの通知"
          value={settings.notifications}
          onToggle={() => toggle('notifications')}
        />
        <View style={styles.divider} />
        <SettingRow
          label="🔊 サウンド"
          desc="バトル中のアラート音"
          value={settings.sound}
          onToggle={() => toggle('sound')}
        />
      </View>

      {/* ── アプリについて ── */}
      <Text style={styles.sectionLabel}>アプリについて</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>バージョン</Text>
          <Text style={styles.infoValue}>1.0.0 (build 2)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>開発者</Text>
          <Text style={styles.infoValue}>Ryoga Morita</Text>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  )
}

function SettingRow({ label, desc, value, onToggle }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Text style={styles.itemTitle}>{label}</Text>
        <Text style={styles.itemDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { paddingBottom: 40 },

  header: {
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textLight,
    letterSpacing: 1, marginTop: 20, marginBottom: 8, paddingHorizontal: 16,
  },

  card: {
    backgroundColor: colors.card, marginHorizontal: 0,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 14,
  },

  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  itemDesc:  { fontSize: 12, color: colors.textSub, marginTop: 2 },

  pomoBtns: { flexDirection: 'row', gap: 8, marginTop: 14 },
  pomoBtn: {
    flex: 1, paddingVertical: 10, borderRadius: radius.md,
    backgroundColor: colors.cardSub, alignItems: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  pomoBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pomoBtnText:       { fontSize: 13, fontWeight: '600', color: colors.textSub },
  pomoBtnTextActive: { color: '#fff', fontWeight: '800' },

  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 6,
  },
  settingLeft: { flex: 1, marginRight: 12 },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: 10 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: { fontSize: 15, color: colors.text },
  infoValue: { fontSize: 14, color: colors.textSub },
})
