import request from '@/utils/request'

export function login({ username, password }) {
  return request.post('/user/login', { username, password }, { skipAuthRedirect: true })
}

export function register({ username, password, nickname }) {
  return request.post('/user/register', { username, password, nickname })
}
