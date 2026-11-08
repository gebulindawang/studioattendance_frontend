import { mockSchedules } from '@/mock/schedule'

const USE_MOCK = true

export async function getSchedules() {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return mockSchedules
  }
  // TODO: 对接后端课表接口
}
