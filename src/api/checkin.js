import request from '@/utils/request'

export function getWeekAttendance() {
  return request.get('/record/week')
}

export function checkIn(id) {
  return request.post(`/record/${id}/checkin`)
}

export function generateWeekAttendance(userIds) {
  return request.put('/record/record', { user_ids: userIds }, { timeout: 60000 })
}

export function getMyAttendance(month) {
  return request.get('/record/me', { params: { month: month || undefined } })
}

export function submitMakeupRequest(recordId, reason) {
  return request.post(`/record/${recordId}/makeup`, { reason })
}

export function listMakeupRequests() {
  return request.get('/record/makeup')
}

export function reviewMakeupRequest(id, decision, note) {
  return request.patch(`/record/makeup/${id}`, { decision, note })
}
