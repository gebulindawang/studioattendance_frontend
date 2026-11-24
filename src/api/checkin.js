import request from '@/utils/request'

export function getTodayAttendance() {
  return request.get('/record/today')
}

export function checkIn(section) {
  return request.post(`/record/checkin/${section}`)
}
