import { CHECKIN_STATUS } from '@/constants/checkin'

const pad = (n) => String(n).padStart(2, '0')

// 演示数据专用的节次表:真实时间由 GET /schedule/semester 提供,
// mock 模块在接口返回前就要算签到时刻,这里只求时间点看起来合理。
const MOCK_SECTION_START = [
  '08:00', '08:55', '10:00', '10:50', '13:00', '13:55', '15:00',
  '15:55', '16:55', '17:50', '19:10', '20:00', '20:50',
]

function formatDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 考勤记录 mock 专用的私有名单。
// 成员列表已接真实接口(GET /api/user/),这里不再共享 mock 成员数据。
const RECORD_MEMBERS = [
  { id: 2, username: 'zhangwei', nickname: '张伟', status: 1 },
  { id: 3, username: 'liuyang', nickname: '刘洋', status: 1 },
  { id: 4, username: 'chenjing', nickname: '陈静', status: 1 },
  { id: 5, username: 'wangfang', nickname: '王芳', status: 1 },
  { id: 6, username: 'zhaolei', nickname: '赵磊', status: 1 },
  { id: 7, username: 'sunmin', nickname: '孙敏', status: 1 },
  { id: 8, username: 'zhouqiang', nickname: '周强', status: 1 },
  { id: 9, username: 'wujie', nickname: '吴杰', status: 1 },
  { id: 10, username: 'xulin', nickname: '徐琳', status: 1 },
  { id: 11, username: 'mahao', nickname: '马浩', status: 1 },
  { id: 12, username: 'huxue', nickname: '胡雪', status: 0 },
]

const PATTERN = [1, 1, 1, 2, 1, 1, 3, 1, 4, 1, 5, 1, 1, 2]
const SECTION_PICK = [1, 5, 9]

function buildRecords() {
  const records = []
  const today = new Date()
  let id = 1

  for (let d = 0; d < 7; d++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - d)
    const dateStr = formatDate(date)

    RECORD_MEMBERS.filter((m) => m.status === 1).forEach((member, i) => {
      const status = PATTERN[(i * 3 + d * 5) % PATTERN.length]
      const section = SECTION_PICK[(i + d) % SECTION_PICK.length]
      let checkinTime = null

      if (status === CHECKIN_STATUS.NORMAL || status === CHECKIN_STATUS.LATE) {
        const [h, m] = MOCK_SECTION_START[section - 1].split(':').map(Number)
        const offset = status === CHECKIN_STATUS.NORMAL ? -(2 + ((i * 7 + d) % 6)) : 6 + ((i + d) % 9)
        const total = h * 60 + m + offset
        checkinTime = `${dateStr}T${pad(Math.floor(total / 60))}:${pad(total % 60)}:00`
      }

      records.push({
        id: id++,
        user_id: member.id,
        nickname: member.nickname,
        checkin_date: dateStr,
        section,
        status,
        checkin_time: checkinTime,
        remark: status === CHECKIN_STATUS.LEAVE ? '家中有事' : '',
      })
    })
  }

  return records
}

export const mockRecords = buildRecords()
