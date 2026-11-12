import request from '@/utils/request'

export function getMe() {
  return request.get('/user/me', { skipAuthRedirect: true })
}
