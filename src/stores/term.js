import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getSemesterConfig } from '@/api/schedule'

// 后端 StartDate 是 RFC3339(2026-08-31T00:00:00+08:00),只取前 10 位按本地时区构造,
// 避免被当作 UTC 解析后整体差一天。
function toDate(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''))
  if (!matched) return null
  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]))
}

// TIME 列返回 "08:00:00",网格里只展示时:分
function toClock(value) {
  const matched = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ''))
  return matched ? `${matched[1].padStart(2, '0')}:${matched[2]}` : ''
}

// 后端 section_time 按"大节"维护(1 条 = 2 个小节,如 08:00-09:40 覆盖第 1、2 节),
// 而课表 schedules.start_section / end_section 用的是小节编号(1~13)。
// 这里按 2 小节/大节展开成小节行,页面统一按"第几小节"取值,不再各页面各算一套。
// 若后端改为按小节存整表,只需把下面常量改成 1。
const SECTIONS_PER_BLOCK = 2

/**
 * 学期与节次配置,数据全部来自 GET /schedule/semester,前端不再写死。
 * - semester:{ startDate, endDate, totalWeeks }
 * - sections:[{ index, start, end, block }] 按小节升序,index 即"第几节",
 *   block 是它所属的大节序号
 */
export const useTermStore = defineStore('term', () => {
  const semester = ref(null)
  const sections = ref([])
  const loading = ref(false)
  const error = ref('')

  let pending = null

  const maxWeek = computed(() => semester.value?.totalWeeks ?? 0)
  const semesterStart = computed(() => semester.value?.startDate ?? null)

  const problem = computed(() => {
    if (!semester.value) return '学期配置未加载'
    if (!semester.value.startDate || !semester.value.totalWeeks) return '学期起止日期或周数缺失,请联系管理员'
    if (!sections.value.length) return '节次时间缺失,请联系管理员'
    return ''
  })

  const ready = computed(() => !problem.value)

  function apply(raw) {
    const info = raw?.semester ?? {}
    const total = Number(info.TotalWeeks)
    semester.value = {
      startDate: toDate(info.StartDate),
      endDate: toDate(info.EndDate),
      totalWeeks: Number.isFinite(total) && total > 0 ? total : 0,
    }

    const blocks = (raw?.section_time ?? [])
      .map((row) => ({
        index: Number(row.SectionNumber),
        start: toClock(row.StartTime),
        end: toClock(row.EndTime),
      }))
      // 序号非法或时间缺失的大节无法渲染,直接剔除
      .filter((b) => Number.isInteger(b.index) && b.index > 0 && b.start && b.end)
      .sort((a, b) => a.index - b.index)

    // 大节 → 小节:第 N 大节覆盖第 (N-1)*2+1 和 (N-1)*2+2 小节,共用同一时段
    sections.value = blocks.flatMap((block) =>
      Array.from({ length: SECTIONS_PER_BLOCK }, (_, i) => ({
        index: (block.index - 1) * SECTIONS_PER_BLOCK + i + 1,
        start: block.start,
        end: block.end,
        block: block.index,
      })),
    )
  }

  function sectionAt(index) {
    return sections.value.find((s) => s.index === index) ?? null
  }

  function sectionStart(index) {
    return sectionAt(index)?.start ?? ''
  }

  // 并发调用共享同一个请求;失败清空 pending,允许重试
  function ensureLoaded() {
    if (ready.value) return Promise.resolve()
    if (pending) return pending

    loading.value = true
    error.value = ''

    pending = getSemesterConfig()
      .then((raw) => {
        apply(raw)
        if (problem.value) throw new Error(problem.value)
      })
      .catch((err) => {
        error.value = err?.message || '学期配置加载失败,请稍后重试'
        pending = null
        throw err
      })
      .finally(() => {
        loading.value = false
      })

    return pending
  }

  return {
    semester,
    sections,
    loading,
    error,
    ready,
    problem,
    maxWeek,
    semesterStart,
    sectionAt,
    sectionStart,
    ensureLoaded,
  }
})
