export const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

export const WEEK_TYPE = { EVERY: 0, ODD: 1, EVEN: 2 }

export const WEEK_TYPE_LABELS = { 0: '每周', 1: '单周', 2: '双周' }

// 节次时间(SECTIONS)、周数上限(MAX_WEEK)、学期开始日期(SEMESTER_START)
// 原先写死在本文件,现改为查询 GET /schedule/semester,见 stores/term.js。

// maxWeek 来自后端 semester.TotalWeeks
export function validateCourse(course, maxWeek) {
  const errors = {}
  if (!course.course_name || !course.course_name.trim()) {
    errors.course_name = '请填写课程名称'
  }
  if (course.start_section > course.end_section) {
    errors.sections = '开始节次不能晚于结束节次'
  }
  const { start_week: s, end_week: e } = course
  if (!Number.isInteger(s) || !Number.isInteger(e) || s < 1 || e < 1 || s > maxWeek || e > maxWeek) {
    errors.weeks = `周数需为 1–${maxWeek} 的整数`
  } else if (s > e) {
    errors.weeks = '起始周不能晚于结束周'
  }
  return errors
}

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

// semesterStart 来自后端 semester.StartDate,未就绪时按第 1 周处理
export function getWeekNumber(date, semesterStart) {
  if (!semesterStart) return 1
  const diff = getMonday(date) - getMonday(semesterStart)
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
