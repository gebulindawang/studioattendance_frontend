export const MOCK = {
  mySchedule: true,
  upload: false,
  // 成员端上传次数单独开关:次数已接真实后端(GET /schedule/count),状态/课程仍是 mock
  uploadCount: false,
  // 管理员端:人员列表已接真实接口(GET /api/user/),课表详情/状态仍由 mock 库维护
  admin: true,
  // 管理员端解析/提交单独开关:这两个动作已接真实后端
  adminParse: false,
  adminConfirm: false,
}
