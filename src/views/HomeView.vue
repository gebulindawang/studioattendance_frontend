<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import MemberTopbar from '@/components/MemberTopbar.vue'
import { checkIn, getWeekAttendance } from '@/api/checkin'
import { CHECKIN_STATUS } from '@/constants/checkin'
import { ATTENDANCE_BLOCK_COUNT, WEEKDAY_LABELS, firstSectionOfBlock, formatSectionPair } from '@/utils/schedule'

const attendance = ref(null)
const loading = ref(true)
const loadError = ref('')
const checkinError = ref('')
const signingId = ref(null)
const now = ref(Date.now())
let requestSequence = 0
let clockOffset = 0
let clockTimer
let refreshTimer

const reasons = {
  not_uploaded: ['还没有上传课表', '上传课表后，管理员才能确认你的可签到时段。'],
  waiting_review: ['课表待解析', '管理员确认课表后，本周可签到的时段会自动生成。'],
  no_configuration: ['本周暂无签到安排', '本周没有可用的学期或节次配置。'],
  no_slots: ['本周没有可签到时段', '根据当前课表和节次配置，本周没有空闲时段。'],
  not_generated: ['本周签到表尚未生成', '管理员生成后，签到时段会显示在这里。'],
  needs_regeneration: ['本周签到表需要更新', '管理员重新生成后，缺少的签到时段会显示在这里。'],
}
const reason = computed(() => reasons[attendance.value?.state])
const uploadsAvailable = computed(
  () => !attendance.value || attendance.value.upload_count < attendance.value.max_uploads,
)

const rows = computed(() => {
  if (!attendance.value) return []
  const records = new Map()
  for (const record of attendance.value.records) {
    const date = record.checkin_date.slice(0, 10)
    const section = record.first_section ?? record.section
    records.set(`${date}:${section}`, record)
  }
  const blocks = new Map(attendance.value.blocks.map((block) => [block.section, block]))
  return Array.from({ length: ATTENDANCE_BLOCK_COUNT }, (_, i) => {
    const section = i + 1
    const block = blocks.get(section)
    return {
      section,
      block,
      cells: attendance.value.days.map((date) => ({
        date,
        record: block && records.get(`${date}:${section}`),
      })),
    }
  })
})

function formatClock(timestamp) {
  return timestamp.slice(11, 16)
}

function recordState(record) {
  if (record.status === CHECKIN_STATUS.NORMAL) return 'signed'
  if (record.status === CHECKIN_STATUS.MADE_UP) return 'made-up'
  const start = Date.parse(record.slot_start)
  if (now.value >= start) return 'closed'
  return now.value >= Date.parse(record.opens_at) ? 'open' : 'upcoming'
}

async function loadAttendance() {
  const sequence = ++requestSequence
  try {
    const result = await getWeekAttendance()
    if (sequence !== requestSequence) return
    attendance.value = result
    clockOffset = Date.parse(result.now) - Date.now()
    now.value = Date.now() + clockOffset
    loadError.value = ''
  } catch (error) {
    if (sequence === requestSequence) loadError.value = error.message || '本周签到表加载失败'
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

async function sign(record) {
  if (signingId.value !== null) return
  signingId.value = record.id
  checkinError.value = ''
  try {
    const signed = await checkIn(record.id)
    const current = attendance.value?.records.find((entry) => entry.id === record.id)
    if (current) Object.assign(current, signed)
  } catch (error) {
    checkinError.value = error.message || '签到失败，请稍后重试'
  } finally {
    signingId.value = null
    await loadAttendance()
  }
}

onMounted(() => {
  loadAttendance()
  clockTimer = setInterval(() => { now.value = Date.now() + clockOffset }, 1000)
  refreshTimer = setInterval(() => {
    if (!loading.value && signingId.value === null) loadAttendance()
  }, 30000)
})

onBeforeUnmount(() => {
  ++requestSequence
  clearInterval(clockTimer)
  clearInterval(refreshTimer)
})
</script>

<template>
  <main class="attendance">
    <MemberTopbar title="工作室签到">
      <template #actions>
        <RouterLink :to="{ name: 'my-attendance' }" class="btn btn--sm btn--secondary">
          我的考勤
        </RouterLink>
        <RouterLink v-if="uploadsAvailable" :to="{ name: 'upload' }" class="btn btn--sm btn--secondary">
          上传课表
        </RouterLink>
      </template>
    </MemberTopbar>

    <p v-if="checkinError || (attendance && loadError)" class="notice notice--danger" role="alert">
      {{ checkinError || loadError }}
    </p>

    <section v-if="loading" class="panel">
      <p class="loading"><span class="spinner" aria-hidden="true"></span>加载本周签到表…</p>
    </section>
    <section v-else-if="!attendance" class="panel">
      <EmptyState title="签到表加载失败" :description="loadError">
        <button type="button" class="btn btn--sm" @click="loadAttendance">重试</button>
      </EmptyState>
    </section>

    <template v-else>
      <section v-if="reason" class="panel reason">
        <EmptyState :title="reason[0]" :description="reason[1]" />
      </section>

      <section v-if="attendance.blocks.length && (!reason || attendance.records.length)" class="panel">
        <header class="panel__head">
          <h2 class="panel__title">本周签到</h2>
          <span class="panel__hint">今天也一起把想法变成作品。</span>
        </header>
        <div class="table-wrap">
          <table class="table week-grid">
            <thead>
              <tr>
                <th scope="col">节次 / 时间</th>
                <th v-for="(date, index) in attendance.days" :key="date" scope="col">
                  周{{ WEEKDAY_LABELS[index] }}
                  <small>{{ date.slice(5) }}</small>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.section">
                <th scope="row">
                  {{ formatSectionPair(row.section) }}
                  <small v-if="row.block">{{ row.block.start.slice(0, 5) }}–{{ row.block.end.slice(0, 5) }}</small>
                </th>
                <td v-for="cell in row.cells" :key="cell.date" :class="{ 'is-unavailable': !cell.record }">
                  <template v-if="cell.record">
                    <button
                      v-if="recordState(cell.record) === 'open'"
                      type="button"
                      class="btn btn--sm"
                      :aria-label="`${cell.date} 第 ${firstSectionOfBlock(row.section)} 节签到`"
                      :disabled="signingId !== null"
                      @click="sign(cell.record)"
                    >
                      {{ signingId === cell.record.id ? '签到中…' : '签到' }}
                    </button>
                    <span v-else-if="recordState(cell.record) === 'signed'" class="tag tag--ok">
                      已签到 {{ formatClock(cell.record.checkin_time) }}
                    </span>
                    <span v-else-if="recordState(cell.record) === 'made-up'" class="tag tag--ok">已补签</span>
                    <span v-else class="table__muted">
                      {{ recordState(cell.record) === 'upcoming' ? '未开始' : '签到已截止' }}
                    </span>
                  </template>
                  <span v-else class="table__muted" aria-label="该时段没有签到安排">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.attendance {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 20px 48px;
}

.reason,
.attendance > .notice {
  margin-bottom: 16px;
}

.week-grid {
  min-width: 780px;
  table-layout: fixed;
}

.week-grid th,
.week-grid td {
  border-right: 1px solid var(--color-border);
  text-align: center;
}

.week-grid th:last-child,
.week-grid td:last-child {
  border-right: 0;
}

.week-grid th:first-child {
  width: 118px;
  text-align: left;
}

.week-grid td {
  height: 58px;
}

.week-grid small {
  display: block;
  margin-top: 4px;
  color: var(--color-text-muted);
  font-weight: 400;
}

.week-grid .is-unavailable {
  background: var(--color-bg);
}

@media (max-width: 640px) {
  .attendance {
    padding: 18px 12px 30px;
  }
}
</style>
