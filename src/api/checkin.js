import request from '@/utils/request'

// 契约(2026-11-12 联调):GET /api/record/checkIn/:id/:section/:week,
// id 为当前登录用户的 id,week 为当前周次(后端按自然日判断窗口与去重,week 仅透传)。
// 签到窗口:开课前 20 分钟至开课后 5 分钟;重复签到由后端业务错误拒绝。
export function checkIn(userId, section, week) {
  return request.get(`/record/checkIn/${userId}/${section}/${week}`)
}
