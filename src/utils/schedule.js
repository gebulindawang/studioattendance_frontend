export const SECTIONS = [
  { index: 1, start: '08:00', end: '08:45' },
  { index: 2, start: '08:55', end: '09:40' },
  { index: 3, start: '10:00', end: '10:40' },
  { index: 4, start: '10:50', end: '11:40' },
  { index: 5, start: '13:00', end: '13:45' },
  { index: 6, start: '13:55', end: '14:40' },
  { index: 7, start: '15:00', end: '15:45' },
  { index: 8, start: '15:55', end: '16:40' },
  { index: 9, start: '16:55', end: '17:40' },
  { index: 10, start: '17:50', end: '18:35' },
  { index: 11, start: '19:10', end: '19:55' },
  { index: 12, start: '20:00', end: '20:45' },
  { index: 13, start: '20:50', end: '21:35' },
]

export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export const WEEK_TYPE = { EVERY: 0, ODD: 1, EVEN: 2 }

export const MAX_WEEK = 25

// TODO: 学期开始日期应由后端提供
export const SEMESTER_START = new Date(2026, 7, 31)

const DAY_MS = 24 * 60 * 60 * 1000

export function getMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + days)
  return d
}

export function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function formatMonthDay(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${m}-${d}`
}

export function getWeekNumber(date) {
  const diff = getMonday(date) - getMonday(SEMESTER_START)
  return Math.round(diff / (7 * DAY_MS)) + 1
}

export function isCourseInWeek(course, week) {
  if (week < course.start_week || week > course.end_week) return false
  if (course.week_type === WEEK_TYPE.ODD) return week % 2 === 1
  if (course.week_type === WEEK_TYPE.EVEN) return week % 2 === 0
  return true
}

const PALETTE = [
  { bg: '#f4e2da', fg: '#85402a' },
  { bg: '#e0e8dc', fg: '#3d5a3a' },
  { bg: '#efe6d1', fg: '#6b5420' },
  { bg: '#dde6ee', fg: '#33506b' },
  { bg: '#ebdde6', fg: '#693555' },
  { bg: '#e6e8d2', fg: '#54582a' },
  { bg: '#e4e3ea', fg: '#48466a' },
  { bg: '#eadfd6', fg: '#5e4332' },
]

export function getCourseColor(name) {
  let hash = 0
  for (const ch of name) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  }
  return PALETTE[hash % PALETTE.length]
}
