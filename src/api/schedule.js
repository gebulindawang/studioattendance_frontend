import request from '@/utils/request'

export function getSemesterConfig() {
  return request.get('/schedule/semester')
}

export function updateSemesterConfig(config) {
  return request.post('/schedule/updateConfig', config)
}

export function getMySchedule() {
  return request.get('/schedule/me')
}

export function uploadSchedule(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  return request.post('/schedule/upload', form, {
    timeout: 60000,
    onUploadProgress: (event) => {
      if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100))
    },
  })
}
