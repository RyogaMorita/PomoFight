import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, useWindowDimensions
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { colors, radius, shadow } from '../../lib/theme'

const FOCUS_EMOJI  = ['', '😵', '😕', '😐', '😊', '🔥']
const FOCUS_LABEL  = ['', 'ひどい', '微妙', '普通', '良い', '最高']
const WEEK_LABELS  = ['日', '月', '火', '水', '木', '金', '土']

function toDateKey(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function formatTime(dateStr) {
  const d = new Date(dateStr)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

function groupByDate(logs) {
  return logs.reduce((acc, log) => {
    const key = toDateKey(new Date(log.created_at))
    if (!acc[key]) acc[key] = []
    acc[key].push(log)
    return acc
  }, {})
}

const CELL_SIZE = 14
const CELL_GAP  = 3

// ── ヒートマップ（全期間・横スクロール）──
function Heatmap({ logs }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const countMap = {}
  logs.forEach(l => {
    const key = toDateKey(new Date(l.created_at))
    countMap[key] = (countMap[key] || 0) + 1
  })

  // 最初の記録日 or 12週前の日曜日から今日まで
  const oldestLog = logs.length > 0 ? new Date(logs[logs.length - 1].created_at) : today
  const weeksBack = Math.max(12, Math.ceil((today - oldestLog) / (7 * 24 * 60 * 60 * 1000)) + 1)

  // 今日の曜日(0=日)に合わせて週の終わりを今週土曜に
  const endSunday = new Date(today)
  endSunday.setDate(today.getDate() + (6 - today.getDay()))

  const startDay = new Date(endSunday)
  startDay.setDate(endSunday.getDate() - weeksBack * 7 + 1)

  const totalDays = weeksBack * 7
  const allDays = Array.from({ length: totalDays }, (_, i) => {
    const d = new Date(startDay)
    d.setDate(startDay.getDate() + i)
    return d
  })

  // 週単位に分割（7日ずつ）
  const weeks = []
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7))
  }

  const maxCount = Math.max(...Object.values(countMap), 1)

  function cellColor(count) {
    if (!count) return colors.border
    const ratio = count / maxCount
    if (ratio < 0.25) return '#b7d9b7'
    if (ratio < 0.5)  return '#7eba7e'
    if (ratio < 0.75) return '#4a9e4a'
    return colors.primary
  }

  // 月ラベル（週の最初の日が月変わりなら表示）
  function monthLabel(week) {
    const first = week[0]
    if (first.getDate() <= 7) {
      return `${first.getMonth() + 1}月`
    }
    return ''
  }

  return (
    <View style={styles.hmCard}>
      <Text style={styles.hmTitle}>📅 全期間の記録</Text>
      <View style={styles.hmOuter}>
        {/* 曜日ラベル */}
        <View style={styles.hmDayLabels}>
          {WEEK_LABELS.map((l, i) => (
            <Text key={i} style={styles.hmDayLabel}>{l}</Text>
          ))}
        </View>
        {/* 週グリッド（横スクロール） */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} ref={ref => ref?.scrollToEnd?.({ animated: false })}>
          <View>
            {/* 月ラベル行 */}
            <View style={styles.hmMonthRow}>
              {weeks.map((week, wi) => (
                <Text key={wi} style={styles.hmMonthLabel}>{monthLabel(week)}</Text>
              ))}
            </View>
            {/* セルグリッド */}
            <View style={styles.hmGrid}>
              {weeks.map((week, wi) => (
                <View key={wi} style={styles.hmWeekCol}>
                  {week.map((d, di) => {
                    const key = toDateKey(d)
                    const count = countMap[key] || 0
                    const isToday = key === toDateKey(today)
                    const isFuture = d > today
                    return (
                      <View
                        key={di}
                        style={[
                          styles.hmCell,
                          { backgroundColor: isFuture ? 'transparent' : cellColor(count) },
                          isToday && styles.hmCellToday,
                        ]}
                      />
                    )
                  })}
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
      <View style={styles.hmLegend}>
        <Text style={styles.hmLegendLabel}>少ない</Text>
        {['#e0ede0', '#b7d9b7', '#7eba7e', '#4a9e4a', colors.primary].map((c, i) => (
          <View key={i} style={[styles.hmLegendCell, { backgroundColor: c }]} />
        ))}
        <Text style={styles.hmLegendLabel}>多い</Text>
      </View>
    </View>
  )
}

export default function DiaryScreen() {
  const { session } = useAuth()
  const [logs, setLogs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    const { data } = await supabase
      .from('pomodoro_logs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(1000)
    if (data) setLogs(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  const today    = new Date()
  const todayKey = toDateKey(today)
  const weekAgo  = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const todayLogs   = logs.filter(l => toDateKey(new Date(l.created_at)) === todayKey)
  const weekLogs    = logs.filter(l => new Date(l.created_at) > weekAgo)
  const avgFocus    = logs.length > 0
    ? (logs.reduce((s, l) => s + (l.focus_score || 3), 0) / logs.length).toFixed(1)
    : '---'
  const todayFocus  = todayLogs.length > 0
    ? Math.round(todayLogs.reduce((s, l) => s + (l.focus_score || 3), 0) / todayLogs.length)
    : null

  const grouped = groupByDate(logs)

  return (
    <View style={styles.container}>
      {/* ── ヘッダー ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📖 日記</Text>
        <Text style={styles.headerSub}>
          {today.getMonth() + 1}月{today.getDate()}日
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* ── 今日のサマリー ── */}
        <View style={styles.todayCard}>
          <Text style={styles.todayTitle}>今日</Text>
          <View style={styles.todayRow}>
            <View style={styles.todayItem}>
              <Text style={styles.todayNum}>{todayLogs.length}</Text>
              <Text style={styles.todayLabel}>ポモドーロ</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayItem}>
              <Text style={styles.todayNum}>
                {todayLogs.reduce((s, l) => s + (l.duration_minutes || 25), 0)}
              </Text>
              <Text style={styles.todayLabel}>分</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayItem}>
              <Text style={styles.todayNum}>
                {todayFocus ? FOCUS_EMOJI[todayFocus] : '---'}
              </Text>
              <Text style={styles.todayLabel}>集中度</Text>
            </View>
          </View>
        </View>

        {/* ── 累計統計 ── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{logs.length}</Text>
            <Text style={styles.statLabel}>累計</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{weekLogs.length}</Text>
            <Text style={styles.statLabel}>今週</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{avgFocus}</Text>
            <Text style={styles.statLabel}>平均集中度</Text>
          </View>
        </View>

        {/* ── ヒートマップ ── */}
        <Heatmap logs={logs} />

        {/* ── ログ一覧 ── */}
        {logs.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyText}>まだ記録がありません{'\n'}バトルを始めよう！</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, dayLogs]) => (
            <View key={date}>
              <View style={styles.dateHeaderRow}>
                <Text style={styles.dateHeader}>{date}</Text>
                <Text style={styles.dateCount}>{dayLogs.length}回</Text>
              </View>
              {dayLogs.map(log => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logFocusBar}>
                    <Text style={styles.logFocusEmoji}>
                      {FOCUS_EMOJI[log.focus_score] || '😐'}
                    </Text>
                    <Text style={styles.logFocusLabelSmall}>
                      {FOCUS_LABEL[log.focus_score] || '普通'}
                    </Text>
                  </View>
                  <View style={styles.logBody}>
                    <View style={styles.logMeta}>
                      <Text style={styles.logTime}>{formatTime(log.created_at)}</Text>
                      <View style={styles.logDurationBadge}>
                        <Text style={styles.logDurationNum}>{log.duration_minutes ?? 25}</Text>
                        <Text style={styles.logDurationUnit}>分</Text>
                      </View>
                    </View>
                    <Text style={log.log_text ? styles.logText : styles.logTextEmpty}>
                      {log.log_text || '一言メモなし'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },

  // ヘッダー
  header: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.text },
  headerSub:   { fontSize: 13, color: colors.textSub, paddingBottom: 2 },

  content: { padding: 16, paddingBottom: 40 },

  // 今日のサマリー
  todayCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 12, ...shadow,
  },
  todayTitle: { fontSize: 12, color: colors.textLight, fontWeight: '600', marginBottom: 12 },
  todayRow: { flexDirection: 'row', alignItems: 'center' },
  todayItem: { flex: 1, alignItems: 'center' },
  todayNum: { fontSize: 28, fontWeight: '800', color: colors.text },
  todayLabel: { fontSize: 11, color: colors.textLight, marginTop: 2 },
  todayDivider: { width: 1, height: 36, backgroundColor: colors.border },

  // 累計統計
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md,
    padding: 14, alignItems: 'center', ...shadow,
  },
  statNum:   { fontSize: 22, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  // ヒートマップ
  hmCard: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginBottom: 20, ...shadow,
  },
  hmTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 10 },
  hmOuter: { flexDirection: 'row', gap: 4 },
  hmDayLabels: { gap: CELL_GAP, paddingTop: 16 },
  hmDayLabel: {
    fontSize: 9, color: colors.textLight,
    height: CELL_SIZE, lineHeight: CELL_SIZE,
    textAlign: 'right', width: 14,
  },
  hmMonthRow: { flexDirection: 'row', gap: CELL_GAP, height: 16, marginBottom: 2 },
  hmMonthLabel: { fontSize: 9, color: colors.textSub, width: CELL_SIZE, textAlign: 'left' },
  hmGrid: { flexDirection: 'row', gap: CELL_GAP },
  hmWeekCol: { gap: CELL_GAP },
  hmCell: {
    width: CELL_SIZE, height: CELL_SIZE,
    borderRadius: 3,
  },
  hmCellToday: {
    borderWidth: 1.5, borderColor: colors.accent,
  },
  hmLegend: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, justifyContent: 'flex-end',
  },
  hmLegendLabel: { fontSize: 9, color: colors.textLight },
  hmLegendCell:  { width: 12, height: 12, borderRadius: 2 },

  // ログ一覧
  dateHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 20, marginBottom: 8,
  },
  dateHeader: { fontSize: 13, color: colors.textSub, fontWeight: '700' },
  dateCount:  { fontSize: 12, color: colors.primary, fontWeight: '600' },

  logCard: {
    backgroundColor: colors.card, borderRadius: radius.md,
    flexDirection: 'row', marginBottom: 8, overflow: 'hidden', ...shadow,
  },
  logFocusBar: {
    width: 52, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.cardSub,
    borderRightWidth: 1, borderRightColor: colors.border,
    gap: 4,
  },
  logFocusEmoji: { fontSize: 24 },
  logFocusLabelSmall: { fontSize: 9, color: colors.textSub, fontWeight: '600' },
  logBody: { flex: 1, padding: 12 },
  logMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  logTime: { fontSize: 12, color: colors.textSub, fontWeight: '600' },
  logDurationBadge: {
    flexDirection: 'row', alignItems: 'baseline', gap: 2,
    backgroundColor: colors.primaryLight, borderRadius: radius.full,
    paddingVertical: 2, paddingHorizontal: 8,
  },
  logDurationNum:  { fontSize: 16, fontWeight: '800', color: colors.primary },
  logDurationUnit: { fontSize: 11, fontWeight: '600', color: colors.primary },
  logText:      { fontSize: 14, color: colors.text, lineHeight: 20 },
  logTextEmpty: { fontSize: 13, color: colors.textLight, lineHeight: 20, fontStyle: 'italic' },

  // 空
  empty: { alignItems: 'center', marginTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: colors.textSub, fontSize: 16, textAlign: 'center', lineHeight: 24 },
})
