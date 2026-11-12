import request from '@/utils/request'
import { mockRecords } from '@/mock/admin'

const USE_MOCK = true

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms))

// 契约(2026-11-12 实测):GET /api/user/ 返回全部账号(含管理员),
// 字段 id/username/nickname/image/role/status/created_at,密码不出网。
// 注意后端此接口暂未要求登录态,联调期间可直接调用。
export function getMembers() {
  return request.get('/user/')
}

export async function getCheckinRecords() {
  if (USE_MOCK) {
    await delay()
    return mockRecords
  }
  // TODO: 对接考勤记录接口
}

export async function updateMemberStatus(id, status) {
  if (USE_MOCK) {
    await delay(200)
    return { id, status }
  }
  // TODO: 对接成员启用/禁用接口
}
