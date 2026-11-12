import request from '@/utils/request'
import { MOCK } from '@/api/mockConfig'
import { sleep } from '@/utils/sleep'
import { fileToDataUrl } from '@/utils/image'
import * as db from '@/mock/scheduleDb'

function notImplemented(name) {
  return Promise.reject(new Error(`接口尚未实现:${name}`))
}

export async function getMySchedule(user) {
  if (MOCK.mySchedule) {
    await sleep(500)
    return db.getMySchedule(user)
  }
  return notImplemented('GET /schedule/me')
}

// 后端契约(2026-11-12 已实测):GET /api/schedule/count,
// Bearer token,成功返回 {code:0, data:<已上传图片数>}。
export async function getMyUploadCount(user) {
  if (MOCK.uploadCount) {
    return db.getMySchedule(user).upload_count
  }
  return request.get('/schedule/count')
}

export async function uploadSchedule(user, file, onProgress) {
  if (MOCK.upload) {
    const url = await fileToDataUrl(file)
    for (let p = 10; p <= 100; p += 15) {
      onProgress?.(Math.min(p, 100))
      await sleep(120)
    }
    onProgress?.(100)
    await sleep(200)
    return db.addUpload(user, url)
  }

  // 后端契约(2026-11-12 已实测):POST /api/schedule/upload,
  // multipart 字段 file + Bearer token,成功返回 {code:0, data:"<OSS 图片 URL>"}。
  // “我的课表”信息接口后端还没有,页面上的状态/最新图片仍由 mock 库维护,
  // 次数展示已接 GET /schedule/count;这里仍同步 mock 库维持状态一致,补上信息接口后移除。
  const form = new FormData()
  form.append('file', file)
  const url = await request.post('/schedule/upload', form, {
    timeout: 60000,
    onUploadProgress: (e) => {
      if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100))
    },
  })
  return db.addUpload(user, url)
}
