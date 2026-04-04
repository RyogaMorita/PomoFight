import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

const FOCUS_EMOJI = ['', '😵', '😕', '😐', '😊', '🔥']
const MONTHS = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

function groupByDate(logs) {
  return logs.reduce((acc, log) => {
    const d = new Date(log.created_at)
    const key = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})
}

function CalendarStrip({ logs }) {
  const today = new Date()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (13 - i))
    return d
  })

  const logDates = new Set(logs.map(l => {
    const d = new Date(l.created_at)
    return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
  }))

  return (
    <View style={styles.calendar}>
      <Text style={styles.calendarTitle}>直近14日</Text>
      <View style={styles.calendarRow}>
        {days.map((d, i) => {
          const key = `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`
          const hasLog = logDates.has(key)
          const isToday = key === `${today.getFullYear()}/${today.getMonth()+1}/${today.getDate()}`
          return (
            <View key={i} style={styles.dayItem}>
              <View style={[
                styles.dayDot,
                hasLog && styles.dayDotActive,
                isToday && styles.dayDotToday,
              ]} />
              <Text style={styles.dayNum}>{d.getDate()}</Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

export default function DiaryScreen() {
  const { session } = useAuth()
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, thisWeek: 0, avgFocus: 0 })

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    const { data } = await supabase
      .from('pomodoro_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      setLogs(data)
      calcStats(data)
    }
    setLoading(false)
  }

  function calcStats(data) {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thisWeek = data.filter(l => new Date(l.created_at) > weekAgo)
    const avgFocus = data.length > 0
      ? (data.reduce((s, l) => s + (l.focus_score || 0), 0) / data.length).toFixed(1)
      : 0
    setStats({ total: data.length, thisWeek: thisWeek.length, avgFocus })
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#4CAF50" />
      </View>
    )
  }

  const grouped = groupByDate(logs)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>📖 日記</Text>

      {/* 統計 */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.total}</Text>
          <Text style={styles.statLabel}>総ポモドーロ</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.thisWeek}</Text>
          <Text style={styles.statLabel}>今週</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{stats.avgFocus}</Text>
          <Text style={styles.statLabel}>平均集中度</Text>
        </View>
      </View>

      {/* カレンダーストリップ */}
      <CalendarStrip logs={logs} />

      {/* ログ一覧 */}
      {logs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyText}>まだ記録がありません{'\n'}バトルを始めよう！</Text>
        </View>
      ) : (
        Object.entries(grouped).map(([date, dayLogs]) => (
          <View key={date}>
            <Text style={styles.dateHeader}>{date}</Text>
            {dayLogs.map(log => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logLeft}>
                  <Text style={styles.logTime}>{formatDate(log.created_at)}</Text>
                  <Text style={styles.logText}>{log.log_text || '（記録なし）'}</Text>
                </View>
                <View style={styles.logRight}>
                  <Text style={styles.focusEmoji}>{FOCUS_EMOJI[log.focus_score] || '😐'}</Text>
                  <Text style={styles.logDuration}>{log.duration_minutes}分</Text>
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { padding: 20, paddingTop: 56, paddingBottom: 40 },
  center: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: '#2a2a4a', borderRadius: 12,
    padding: 14, alignItems: 'center',
  },
  statNum: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },

  calendar: {
    backgroundColor: '#2a2a4a', borderRadius: 12,
    padding: 14, marginBottom: 20,
  },
  calendarTitle: { fontSize: 12, color: '#888', marginBottom: 10 },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayItem: { alignItems: 'center', gap: 4 },
  dayDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#3a3a5a',
  },
  dayDotActive: { backgroundColor: '#4CAF50' },
  dayDotToday: { backgroundColor: '#ffd700', width: 10, height: 10, borderRadius: 5 },
  dayNum: { fontSize: 9, color: '#666' },

  dateHeader: {
    fontSize: 13, color: '#888', fontWeight: '600',
    marginBottom: 8, marginTop: 16,
  },
  logCard: {
    backgroundColor: '#2a2a4a', borderRadius: 12,
    padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center',
  },
  logLeft: { flex: 1 },
  logTime: { fontSize: 11, color: '#666', marginBottom: 4 },
  logText: { fontSize: 15, color: '#fff' },
  logRight: { alignItems: 'center', marginLeft: 12 },
  focusEmoji: { fontSize: 24 },
  logDuration: { fontSize: 11, color: '#666', marginTop: 2 },

  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center', lineHeight: 24 },
})
