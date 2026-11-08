import axios from 'axios'
import router from '@/router'
import { clearToken, getToken } from '@/utils/auth'

const STATUS_MESSAGES = {
  400: '请求参数错误',
  401: '登录已过期,请重新登录',
  403: '没有权限执行此操作',
  404: '请求的资源不存在',
  408: '请求超时,请稍后重试',
  429: '请求过于频繁,请稍后再试',
  500: '服务器开小差了,请稍后重试',
  502: '网关错误,请稍后重试',
  503: '服务暂不可用,请稍后重试',
  504: '网关超时,请稍后重试',
}

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

request.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

request.interceptors.response.use(
  (response) => {
    const body = response.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0) {
        return body.data
      }
      const err = new Error(body.msg || '请求失败')
      err.status = response.status
      err.code = body.code
      return Promise.reject(err)
    }
    return body
  },
  (error) => {
    if (axios.isCancel(error)) {
      return Promise.reject(error)
    }

    const { response } = error
    let message

    if (response) {
      message =
        response.data?.msg ||
        response.data?.message ||
        STATUS_MESSAGES[response.status] ||
        `请求失败(${response.status})`

      if (response.status === 401 && !error.config?.skipAuthRedirect) {
        clearToken()
        if (router.currentRoute.value.name !== 'login') {
          router.replace({
            name: 'login',
            query: { redirect: router.currentRoute.value.fullPath },
          })
        }
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时,请稍后重试'
    } else {
      message = '网络异常,请检查网络连接'
    }

    const normalized = new Error(message)
    normalized.status = response?.status
    normalized.code = response?.data?.code
    normalized.data = response?.data
    normalized.raw = error
    return Promise.reject(normalized)
  },
)

export default request
