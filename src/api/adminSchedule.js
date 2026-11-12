import { MOCK } from '@/api/mockConfig'
import request from '@/utils/request'
import { sleep } from '@/utils/sleep'
import { getMembers } from '@/api/admin'
import { ROLE } from '@/constants/role'
import * as db from '@/mock/scheduleDb'

function notImplemented(name) {
  return Promise.reject(new Error(`接口尚未实现:${name}`))
}

// mock 库的 key 形如 s-2 / u-11,数字部分即后端 user_id(过渡期的对应关系)
function parseUserId(key) {
  const id = Number(String(key).split('-')[1])
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('无法定位该成员,请刷新后重试')
  }
  return id
}

// 后端课程对象没有 teacher 字段(schedules 表暂无该列),教师列前端可补填但提交后不会持久化
function normalizeCourse(c) {
  return {
    course_name: c.course_name ?? '',
    teacher: '',
    location: c.location ?? '',
    weekday: Number(c.weekday),
    start_section: Number(c.start_section),
    end_section: Number(c.end_section),
    start_week: Number(c.start_week),
    end_week: Number(c.end_week),
    week_type: Number(c.week_type) || 0,
    confidence: typeof c.confidence === 'number' ? c.confidence : undefined,
  }
}

// 人员信息走真实接口(GET /api/user/),只列成员,不含管理员账号;
// 课表状态/上传次数等字段的聚合接口后端还没有,仍由 mock 库按 user_id 维护。
export async function listScheduleUsers() {
  const members = await getMembers()
  return members
    .filter((m) => m.role === ROLE.MEMBER)
    .map((m) => ({
      nickname: m.nickname,
      username: m.username,
      ...db.ensureUserState(m),
    }))
}

export async function getScheduleUserDetail(key) {
  if (MOCK.admin) {
    await sleep(350)
    return db.getUserDetail(key)
  }
  return notImplemented('GET /admin/schedules/:userId')
}

// 解析状态按 user key 缓存在模块层:组件随路由销毁后,进行中的请求继续执行,
// 管理员返回页面时通过 getParseState 接上进度或恢复结果,不会重复发起解析。
// running=进行中;done/error=已结束但页面还没消费(保存/放弃时清除)。
const parseCache = new Map()

export function getParseState(key) {
  return parseCache.get(key) ?? null
}

export function clearParseState(key) {
  parseCache.delete(key)
}

export function startScheduleParse(key) {
  const existing = parseCache.get(key)
  if (existing && existing.status === 'running') return existing

  const userId = parseUserId(key)
  const state = { status: 'running', promise: null, result: null, error: null }
  state.promise = (MOCK.adminParse
    ? (async () => {
        await sleep(1800)
        return db.recognize(key)
      })()
    : request.get('/schedule/parse', {
        params: { user_id: userId },
        timeout: 90000,
      })
  )
    .then((courses) => {
      state.status = 'done'
      state.result = (courses ?? []).map(normalizeCourse)
      return state.result
    })
    .catch((err) => {
      state.status = 'error'
      state.error = err
      throw err
    })
  parseCache.set(key, state)
  return state
}

export async function confirmSchedule(key, courses) {
  if (MOCK.adminConfirm) {
    await sleep(600)
    return db.confirm(key, courses)
  }

  // 契约(2026-11-12 实测):POST /api/schedule/?user_id=<n>,body 为课程数组,
  // 服务端整体替换该成员的课表,成功返回 {code:0, msg:"保存课表成功"}(无 data)。
  // "用户课表详情"接口后端还没有,先同步进 mock 库维持页面状态(过渡做法,同上传)。
  const userId = parseUserId(key)
  await request.post('/schedule/', courses, {
    params: { user_id: userId },
    timeout: 30000,
  })
  return db.confirm(key, courses)
}

export function resetMockData() {
  db.resetDb()
}

// 契约(2026-11-12 联调):DELETE /api/schedule/resove?user_id=<n>,
// 管理员清空该成员的课表与全部课表图片,成功返回 {code:0, msg:"重置课表成功"}。
// 课表状态的聚合接口后端还没有,这里同步重置 mock 库中该成员的状态保持显示一致。
export async function resetSchedule(key) {
  const userId = parseUserId(key)
  await request.delete('/schedule/resove', { params: { user_id: userId } })
  db.resetUserState(key)
}
