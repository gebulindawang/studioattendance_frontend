import request from '@/utils/request'

function parseUserId(key) {
  const id = /^u-(\d+)$/.exec(String(key))?.[1]
  if (!id || Number(id) <= 0) {
    throw new Error('无法定位该成员，请刷新后重试')
  }
  return id
}

export function listScheduleUsers() {
  return request.get('/schedule/members')
}

export function getScheduleUserDetail(key) {
  return request.get('/schedule/me', { params: { user_id: parseUserId(key) } })
}

// 页面跳转后可以恢复当前图片的解析请求。切换图片时使用新请求。
const parseCache = new Map()

export function getParseState(key) {
  return parseCache.get(key) ?? null
}

export function clearParseState(key) {
  parseCache.delete(key)
}

export function startScheduleParse(key, imageId) {
  const existing = parseCache.get(key)
  if (existing?.status === 'running' && existing.imageId === imageId) return existing

  const state = { status: 'running', imageId, promise: null, result: null, error: null }
  state.promise = request.get('/schedule/parse', {
    params: { user_id: parseUserId(key), image_id: imageId },
    timeout: 90000,
  })
    .then((courses) => {
      state.status = 'done'
      state.result = courses ?? []
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

export async function confirmSchedule(key, courses, imageId) {
  await request.post('/schedule/', courses, {
    params: { user_id: parseUserId(key), image_id: imageId },
    timeout: 30000,
  })
  return getScheduleUserDetail(key)
}

export async function resetSchedule(key) {
  await request.delete('/schedule/resove', { params: { user_id: parseUserId(key) } })
  clearParseState(key)
}
