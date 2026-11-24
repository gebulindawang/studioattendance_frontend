import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getSemesterConfig, updateSemesterConfig } from '@/api/schedule'

// 后端 StartDate 是 RFC3339(2026-08-31T00:00:00+08:00),只取前 10 位按本地时区构造,
// 避免被当作 UTC 解析后整体差一天。
function toDate(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!matched) return null
  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]))
}

// 回写时把本地日期拼成带时区偏移的 RFC3339,后端 time.Time 才解析得了
function toRFC3339(date) {
  const pad = (n) => String(n).padStart(2, '0')
  const offset = -date.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T00:00:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

// TIME 列返回 "08:00:00",网格里只展示时:分
function toClock(value) {
  const matched = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ''))
  return matched ? `${matched[1].padStart(2, '0')}:${matched[2]}` : ''
}

// 回写时补成 "HH:MM:SS"
function toFullClock(value) {
  const matched = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value ?? ''))
  if (!matched) return ''
  return `${matched[1].padStart(2, '0')}:${matched[2]}:${matched[3] ?? '00'}`
}

// 后端 section_time 按"大节"维护(1 条 = 2 个小节,如 08:00-09:40 覆盖第 1、2 节),
// 而课表 schedules.start_section / end_section 用的是小节编号(1~13)。
// 这里按 2 小节/大节展开成小节行,页面统一按"第几小节"取值,不再各页面各算一套。
// 若后端改为按小节存整表,只需把下面常量改成 1。
const SECTIONS_PER_BLOCK = 2

/**
 * 学期与节次配置,数据全部来自 GET /schedule/semester,保存走 POST /schedule/updateConfig。
 * - semester:{ id, startDate, endDate, totalWeeks }
 * - blocks:[{ id, index, start, end }] 后端原始的大节,保存时按这个回写
 * - sections:[{ index, start, end, block }] 大节展开后的小节,页面展示用
 */
export const useTermStore = defineStore('term', () => {
  const semester = ref(null)
  const blocks = ref([])
  const sections = ref([])
  const loading = ref(false)
  const error = ref('')

  let pending = null

  const maxWeek = computed(() => semester.value?.totalWeeks ?? 0)
  const semesterStart = computed(() => semester.value?.startDate ?? null)

  const problem = computed(() => {
    if (!semester.value) return '本学期尚未配置，请联系管理员。'
    if (!semester.value.startDate || !semester.value.endDate || !semester.value.totalWeeks) {
      return '学期起止日期或周数缺失，请联系管理员。'
    }
    if (!sections.value.length) return '节次时间缺失,请联系管理员'
    return ''
  })

  const ready = computed(() => !problem.value)

  function apply(raw) {
    const info = raw?.semester ?? {}
    const total = Number(info.TotalWeeks)
    semester.value = raw?.semester ? {
      id: Number(info.ID) || 0,
      startDate: toDate(info.StartDate),
      endDate: toDate(info.EndDate),
      totalWeeks: Number.isFinite(total) && total > 0 ? total : 0,
    } : null

    blocks.value = (raw?.section_time ?? [])
      .map((row) => ({
        id: Number(row.ID) || 0,
        index: Number(row.SectionNumber),
        start: toClock(row.StartTime),
        end: toClock(row.EndTime),
      }))
      // 序号非法或时间缺失的大节无法渲染,直接剔除
      .filter((b) => Number.isInteger(b.index) && b.index > 0 && b.start && b.end)
      .sort((a, b) => a.index - b.index)

    // 大节 → 小节:第 N 大节覆盖第 (N-1)*2+1 和 (N-1)*2+2 小节,共用同一时段
    sections.value = blocks.value.flatMap((block) =>
      Array.from({ length: SECTIONS_PER_BLOCK }, (_, i) => ({
        index: (block.index - 1) * SECTIONS_PER_BLOCK + i + 1,
        start: block.start,
        end: block.end,
        block: block.index,
      })),
    )
  }

  function fetchConfig() {
    if (pending) return pending
    loading.value = true
    error.value = ''
    pending = getSemesterConfig()
      .then((raw) => {
        apply(raw)
      })
      .catch((err) => {
        error.value = err?.message || '学期配置加载失败,请稍后重试'
        throw err
      })
      .finally(() => {
        pending = null
        loading.value = false
      })
    return pending
  }

  // 并发调用共享同一个请求;失败清空 pending,允许重试
  async function ensureLoaded() {
    if (!ready.value) await fetchConfig()
    if (problem.value) throw new Error(problem.value)
  }

  function reload() {
    return fetchConfig()
  }

  /**
   * 保存配置。只传需要改的部分:semester 与 blocks 都可省略。
   * 保存后重新读取服务器配置。
   */
  async function saveConfig({ semester: nextSemester, blocks: nextBlocks } = {}) {
    const payload = {}

    if (nextSemester) {
      payload.semester = {
        ID: nextSemester.id,
        StartDate: toRFC3339(nextSemester.startDate),
        EndDate: toRFC3339(nextSemester.endDate),
        TotalWeeks: Number(nextSemester.totalWeeks),
      }
    }

    if (nextBlocks?.length) {
      payload.section_time = nextBlocks.map((b) => ({
        ID: b.id,
        // 后端该字段是 string,传数字会绑定失败
        SectionNumber: String(b.index),
        StartTime: toFullClock(b.start),
        EndTime: toFullClock(b.end),
      }))
    }

    await updateSemesterConfig(payload)
    await reload()
  }

  return {
    semester,
    blocks,
    sections,
    loading,
    error,
    ready,
    problem,
    maxWeek,
    semesterStart,
    ensureLoaded,
    reload,
    saveConfig,
  }
})
