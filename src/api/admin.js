import request from '@/utils/request'

export function getMembers() {
  return request.get('/user/')
}

export async function getCheckinRecords() {
  const data = await request.get('/record/')
  return {
    date: data.date,
    records: data.records.map((record) => ({
      ...record,
      checkin_date: record.checkin_date.slice(0, 10),
    })),
  }
}

export function updateMemberStatus(id, status) {
  return request.patch(`/user/${id}/status`, { status })
}
