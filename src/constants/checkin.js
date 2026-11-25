export const CHECKIN_STATUS = {
  PENDING: 0,
  NORMAL: 1,
  LATE: 2,
  ABSENT: 3,
  LEAVE: 4,
  EXEMPTED: 5,
  CLOSED: 6,
}

export const CHECKIN_LABELS = {
  [CHECKIN_STATUS.PENDING]: '待签到',
  [CHECKIN_STATUS.NORMAL]: '已签到',
  [CHECKIN_STATUS.LATE]: '迟到',
  [CHECKIN_STATUS.ABSENT]: '缺勤',
  [CHECKIN_STATUS.LEAVE]: '请假',
  [CHECKIN_STATUS.EXEMPTED]: '有课豁免',
  [CHECKIN_STATUS.CLOSED]: '已截止 · 未签到',
}

export const CHECKIN_TONES = {
  [CHECKIN_STATUS.PENDING]: 'muted',
  [CHECKIN_STATUS.NORMAL]: 'ok',
  [CHECKIN_STATUS.LATE]: 'warn',
  [CHECKIN_STATUS.ABSENT]: 'danger',
  [CHECKIN_STATUS.LEAVE]: 'info',
  [CHECKIN_STATUS.EXEMPTED]: 'muted',
  [CHECKIN_STATUS.CLOSED]: 'warn',
}

export const STUDIO_RECORD = 1

export const GENERATION_LABELS = {
  ready: '可签到',
  not_uploaded: '尚未上传课表',
  waiting_review: '课表待解析',
  no_slots: '本周没有可签到时段',
  unavailable: '成员不可用',
}

export const USER_STATUS = {
  DISABLED: 0,
  ACTIVE: 1,
}
