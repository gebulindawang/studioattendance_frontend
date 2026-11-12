import { mockSchedules } from '@/mock/schedule'
import { MAX_UPLOADS, SCHEDULE_STATUS } from '@/constants/scheduleStatus'

const STORAGE_KEY = 'studio-attendance:mock-schedule-db:v1'

// 课表演示数据的私有种子名单,与真实用户无关(成员列表已接真实接口)。
// key 中的数字仍约定为后端 user_id,便于识别/提交接口按 id 定位成员。
const SEED_MEMBERS = [
  { id: 2, username: 'zhangwei', nickname: '张伟' },
  { id: 3, username: 'liuyang', nickname: '刘洋' },
  { id: 4, username: 'chenjing', nickname: '陈静' },
  { id: 5, username: 'wangfang', nickname: '王芳' },
  { id: 6, username: 'zhaolei', nickname: '赵磊' },
  { id: 7, username: 'sunmin', nickname: '孙敏' },
  { id: 8, username: 'zhouqiang', nickname: '周强' },
  { id: 9, username: 'wujie', nickname: '吴杰' },
  { id: 10, username: 'xulin', nickname: '徐琳' },
  { id: 11, username: 'mahao', nickname: '马浩' },
  { id: 12, username: 'huxue', nickname: '胡雪' },
]

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString()

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function placeholderImage(nickname, round) {
  const palette = ['#f4e2da', '#e0e8dc', '#efe6d1', '#dde6ee', '#ebdde6']
  const seed = nickname.length * 7 + round * 3
  let blocks = ''
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 6; row++) {
      if ((col * 5 + row * 3 + seed) % 4 === 0) {
        const x = 70 + col * 126
        const y = 120 + row * 130
        const color = palette[(col + row + seed) % palette.length]
        blocks += `<rect x="${x}" y="${y}" width="118" height="122" rx="8" fill="${color}"/>`
        blocks += `<rect x="${x + 10}" y="${y + 14}" width="70" height="8" rx="4" fill="#85402a" opacity="0.55"/>`
        blocks += `<rect x="${x + 10}" y="${y + 34}" width="52" height="6" rx="3" fill="#85402a" opacity="0.3"/>`
        blocks += `<rect x="${x + 10}" y="${y + 50}" width="82" height="6" rx="3" fill="#85402a" opacity="0.3"/>`
      }
    }
  }
  let lines = ''
  for (let i = 0; i <= 5; i++) {
    lines += `<line x1="${70 + i * 126}" y1="90" x2="${70 + i * 126}" y2="900" stroke="#e5e3da"/>`
  }
  for (let i = 0; i <= 6; i++) {
    lines += `<line x1="70" y1="${120 + i * 130}" x2="700" y2="${120 + i * 130}" stroke="#e5e3da"/>`
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="960" viewBox="0 0 760 960">` +
    `<rect width="760" height="960" fill="#ffffff"/>` +
    `<text x="70" y="62" font-size="26" font-family="sans-serif" fill="#141413">课表截图示例 · ${nickname}</text>` +
    `<text x="70" y="86" font-size="14" font-family="sans-serif" fill="#9a988f">第 ${round} 次上传(演示用占位图)</text>` +
    lines +
    blocks +
    `</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

function pickCourses(indexes) {
  return indexes.map((i, n) => {
    const c = mockSchedules[i]
    return {
      id: 1000 + n,
      course_name: c.course_name,
      teacher: c.teacher,
      location: c.location,
      weekday: c.weekday,
      start_section: c.start_section,
      end_section: c.end_section,
      start_week: c.start_week,
      end_week: c.end_week,
      week_type: c.week_type,
    }
  })
}

function makeUser(key, userId, username, nickname, overrides = {}) {
  return {
    key,
    user_id: userId,
    username,
    nickname,
    status: SCHEDULE_STATUS.NONE,
    uploads: [],
    upload_count: 0,
    courses: [],
    confirmed_at: null,
    last_uploaded_at: null,
    fail_once: false,
    ...overrides,
  }
}

function makeUploads(nickname, count, lastMinutesAgo) {
  return Array.from({ length: count }, (_, i) => ({
    id: `up-${nickname}-${i + 1}`,
    url: placeholderImage(nickname, i + 1),
    uploaded_at: minutesAgo(lastMinutesAgo + (count - 1 - i) * 1440),
  }))
}

function seed() {
  const members = SEED_MEMBERS
  const plan = {
    2: { status: 'confirmed', uploads: 1, courses: [0, 1, 3, 4, 5, 7], ago: 4300 },
    3: { status: 'pending', uploads: 1, ago: 35 },
    4: { status: 'none' },
    5: { status: 'reparse', uploads: 2, courses: [0, 2, 4, 6, 8], ago: 90 },
    6: { status: 'pending', uploads: 3, ago: 640 },
    7: { status: 'none' },
    8: { status: 'confirmed', uploads: 2, courses: [1, 3, 5, 7, 8, 9], ago: 7200 },
    9: { status: 'pending', uploads: 1, ago: 12, failOnce: true },
    10: { status: 'none' },
    11: { status: 'none' },
    12: { status: 'confirmed', uploads: 1, courses: [2, 4, 6, 8], ago: 10080 },
  }

  const users = {}
  members.forEach((m) => {
    const p = plan[m.id] || { status: 'none' }
    const uploads = p.uploads ? makeUploads(m.nickname, p.uploads, p.ago) : []
    users[`s-${m.id}`] = makeUser(`s-${m.id}`, m.id, m.username, m.nickname, {
      status: p.status,
      uploads,
      upload_count: uploads.length,
      courses: p.courses ? pickCourses(p.courses) : [],
      confirmed_at: p.status === 'confirmed' || p.status === 'reparse' ? minutesAgo(p.ago + 600) : null,
      last_uploaded_at: uploads.length ? uploads[uploads.length - 1].uploaded_at : null,
      fail_once: !!p.failOnce,
    })
  })
  return { users }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

let db = load() || seed()

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    console.warn('[mock] 本地存储空间不足,演示数据仅保留在内存中')
  }
}

function fail(message, status = 400) {
  const err = new Error(message)
  err.status = status
  return err
}

function ensureUser(user) {
  const key = `u-${user.id}`
  if (!db.users[key]) {
    db.users[key] = makeUser(key, user.id, user.username || '', user.nickname || user.username || `用户${user.id}`)
    save()
  }
  return db.users[key]
}

function getByKey(key) {
  const u = db.users[key]
  if (!u) throw fail('该用户不存在', 404)
  return u
}

function listItem(u) {
  return {
    key: u.key,
    nickname: u.nickname,
    username: u.username,
    status: u.status,
    upload_count: u.upload_count,
    max_uploads: MAX_UPLOADS,
    last_uploaded_at: u.last_uploaded_at,
    confirmed_at: u.confirmed_at,
    course_count: u.courses.length,
  }
}

export function resetDb() {
  db = seed()
  save()
}

export function getMySchedule(user) {
  const u = ensureUser(user)
  const latest = u.uploads[u.uploads.length - 1]
  return clone({
    status: u.status,
    upload_count: u.upload_count,
    max_uploads: MAX_UPLOADS,
    last_uploaded_at: u.last_uploaded_at,
    confirmed_at: u.confirmed_at,
    latest_image: latest ? latest.url : '',
    courses: u.courses,
  })
}

export function addUpload(user, url) {
  const u = ensureUser(user)
  if (u.upload_count >= MAX_UPLOADS) {
    throw fail(`最多只能上传 ${MAX_UPLOADS} 次课表,你的次数已用完`, 403)
  }
  const now = new Date().toISOString()
  u.uploads.push({ id: `up-${u.key}-${Date.now()}`, url, uploaded_at: now })
  u.upload_count += 1
  u.last_uploaded_at = now
  u.status = u.courses.length > 0 ? SCHEDULE_STATUS.REPARSE : SCHEDULE_STATUS.PENDING
  save()
  return getMySchedule(user)
}

export function listUsers() {
  return clone(Object.values(db.users).map(listItem))
}

export function getUserDetail(key) {
  const u = getByKey(key)
  return clone({ ...listItem(u), uploads: u.uploads, courses: u.courses })
}

// 管理员重置某成员的课表:清空上传记录与课表,状态回到未上传(与后端 DELETE /schedule/resove 对齐)
export function resetUserState(key) {
  const u = getByKey(key)
  u.uploads = []
  u.upload_count = 0
  u.status = SCHEDULE_STATUS.NONE
  u.courses = []
  u.confirmed_at = null
  u.last_uploaded_at = null
  save()
}

// 为真实成员取课表状态字段(没有则建空档),身份信息(nickname/username)由真实接口提供
export function ensureUserState(user) {
  const u = ensureUser(user)
  return {
    key: u.key,
    status: u.status,
    upload_count: u.upload_count,
    max_uploads: MAX_UPLOADS,
    last_uploaded_at: u.last_uploaded_at,
    confirmed_at: u.confirmed_at,
    course_count: u.courses.length,
  }
}

function buildRecognized() {
  const base = pickCourses([0, 1, 2, 3, 4, 5, 6, 7, 8])
  const confidence = [0.97, 0.95, 0.64, 0.93, 0.96, 0.41, 0.92, 0.94, 0.58]
  const result = base.map((c, i) => ({ ...c, id: `r-${i + 1}`, confidence: confidence[i] }))
  result[2].location = ''
  result[5].start_section = 8
  result[5].end_section = 7
  result[8].course_name = '计算机网路'
  return result
}

export function recognize(key) {
  const u = getByKey(key)
  if (u.upload_count === 0) throw fail('该用户尚未上传课表图片')
  if (u.fail_once) {
    u.fail_once = false
    save()
    throw fail('OCR 识别失败:图片不够清晰,请重试,或联系用户重新上传', 422)
  }
  return buildRecognized()
}

export function confirm(key, courses) {
  const u = getByKey(key)
  if (!Array.isArray(courses) || courses.length === 0) throw fail('课程列表不能为空')
  u.courses = courses.map((c, i) => ({
    id: 2000 + i,
    course_name: c.course_name.trim(),
    teacher: (c.teacher || '').trim(),
    location: (c.location || '').trim(),
    weekday: c.weekday,
    start_section: c.start_section,
    end_section: c.end_section,
    start_week: c.start_week,
    end_week: c.end_week,
    week_type: c.week_type,
  }))
  u.status = SCHEDULE_STATUS.CONFIRMED
  u.confirmed_at = new Date().toISOString()
  save()
  return getUserDetail(key)
}
