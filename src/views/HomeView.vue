<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import AppIcon from '@/components/AppIcon.vue'
import WeekCheckin from '@/components/WeekCheckin.vue'
import MemberTopbar from '@/components/MemberTopbar.vue'
import { checkIn, getWeekAttendance } from '@/api/checkin'
import { CHECKIN_STATUS } from '@/constants/checkin'
import { ATTENDANCE_BLOCK_COUNT, WEEKDAY_LABELS, firstSectionOfBlock, formatSectionPair } from '@/utils/schedule'

const attendance = ref(null)
const loading = ref(true)
const loadError = ref('')
const checkinError = ref('')
const signingCredit = ref('')
const selectedDay = ref('')
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
const dataDays = computed(() => attendance.value?.days ?? [])
const today = computed(() => attendance.value?.now.slice(0, 10) ?? '')
const todayIndex = computed(() => dataDays.value.indexOf(today.value))
const selectedDayIndex = computed(() => Math.max(0, dataDays.value.indexOf(selectedDay.value)))
const weekRange = computed(() => dataDays.value.length
  ? dataDays.value[0].slice(0, 10).replaceAll('-', '.') + ' – ' + dataDays.value.at(-1).slice(5).replace('-', '.')
  : '')
const nextSlot = computed(() => (attendance.value?.records ?? [])
  .filter((record) => record.status === CHECKIN_STATUS.PENDING && Date.parse(record.slot_start) > now.value)
  .sort((a, b) => Date.parse(a.slot_start) - Date.parse(b.slot_start))[0])
const completed = computed(() => (attendance.value?.records ?? []).filter(
  (record) => [CHECKIN_STATUS.NORMAL, CHECKIN_STATUS.MADE_UP].includes(record.status),
).length)

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
  return timestamp?.slice(11, 16) || '—'
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
    const previousToday = today.value
    attendance.value = result
    if (!dataDays.value.includes(selectedDay.value) || (selectedDay.value === previousToday && today.value !== previousToday)) {
      selectedDay.value = dataDays.value.includes(today.value) ? today.value : dataDays.value[0]
    }
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
  signingCredit.value = ''
  try {
    const signed = await checkIn(record.id)
    const current = attendance.value?.records.find((entry) => entry.id === record.id)
    if (current) Object.assign(current, signed)
    signingCredit.value = signed.status === CHECKIN_STATUS.MADE_UP ? '这个时段已补签。' : '签到成功。'
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
  <MemberTopbar />
  <main class="member-page page-stack">
    <header class="week-hero">
      <div class="week-hero__intro">
        <div class="week-hero__date"><AppIcon name="calendar" :size="16" />{{ weekRange || '本周' }}</div>
        <h1>工作室签到</h1>
        <p>今天也一起把想法变成作品。</p>
      </div>
      <div v-if="attendance" class="week-hero__next">
        <div class="week-hero__label"><AppIcon name="clock" :size="15" />{{ nextSlot && recordState(nextSlot) === 'open' ? '当前可签到' : '接下来' }}</div>
        <template v-if="nextSlot">
          <strong>{{ nextSlot.checkin_date.slice(5, 10).replace('-', '/') }} · {{ formatSectionPair(nextSlot.first_section ?? nextSlot.section) }}</strong>
          <span>签到窗口 {{ formatClock(nextSlot.opens_at) }}–{{ formatClock(nextSlot.slot_start) }}</span>
          <button v-if="recordState(nextSlot) === 'open'" class="btn btn--sm" type="button" :disabled="signingId !== null" @click="sign(nextSlot)">
            {{ signingId === nextSlot.id ? '签到中…' : '立即签到' }}<AppIcon name="arrow" :size="15" />
          </button>
        </template>
        <template v-else>
          <strong v-if="reason">{{ reason[0] }}</strong>
          <strong v-else>本周暂无后续时段</strong>
          <RouterLink v-if="attendance.state === 'not_uploaded'" :to="{ name: 'upload' }">上传课表 <AppIcon name="arrow" :size="14" /></RouterLink>
          <RouterLink v-else :to="{ name: 'my-attendance' }">查看我的考勤 <AppIcon name="arrow" :size="14" /></RouterLink>
        </template>
      </div>
    </header>

    <p v-if="signingCredit" class="notice notice--ok" role="status"><AppIcon name="checkCircle" />{{ signingCredit }}</p>
    <p v-if="checkinError || (attendance && loadError)" class="notice notice--danger" role="alert">{{ checkinError || loadError }}</p>

    <section v-if="loading" class="panel" aria-busy="true">
      <p class="page-loader"><span class="spinner" aria-hidden="true"></span>加载本周签到表…</p>
    </section>
    <section v-else-if="!attendance" class="panel">
      <EmptyState title="签到表加载失败" :description="loadError" icon="alert" tone="danger">
        <button type="button" class="btn btn--sm" @click="loadAttendance">重试</button>
      </EmptyState>
    </section>
    <template v-else>
      <section v-if="reason && !attendance.records.length" class="panel">
        <EmptyState :title="reason[0]" :description="reason[1]">
          <RouterLink v-if="attendance.state === 'not_uploaded'" class="btn btn--sm" :to="{ name: 'upload' }">
            <AppIcon name="upload" :size="16" />上传课表
          </RouterLink>
        </EmptyState>
      </section>
      <p v-else-if="reason" class="notice notice--info">{{ reason[1] }}</p>

      <section v-if="attendance.blocks.length && (!reason || attendance.records.length)" class="panel week-panel">
        <header class="panel__head">
          <div class="week-panel__heading">
            <span class="week-panel__icon"><AppIcon name="calendar" /></span>
            <h2 class="panel__title">本周签到</h2>
          </div>
          <span class="week-panel__total">已完成 <strong>{{ completed }}</strong> / {{ attendance.records.length }} 次</span>
        </header>

        <div class="table-wrap week-desktop">
          <table class="table week-grid" aria-label="本周签到">
            <thead>
              <tr>
                <th scope="col">节次 / 时间</th>
                <th v-for="(date, index) in dataDays" :key="date" scope="col" :class="{ 'is-today': index === todayIndex }">
                  周{{ WEEKDAY_LABELS[index] }}<small>{{ date.slice(5).replace('-', '/') }}</small>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.section">
                <th scope="row">{{ formatSectionPair(row.section) }}
                  <small v-if="row.block">{{ row.block.start.slice(0, 5) }}–{{ row.block.end.slice(0, 5) }}</small>
                </th>
                <td v-for="cell in row.cells" :key="cell.date" :class="{ 'is-today': cell.date === today }">
                  <WeekCheckin v-if="cell.record" :record="cell.record" :state="recordState(cell.record)"
                    :section="firstSectionOfBlock(row.section)" :date="cell.date" :signing-id="signingId" @sign="sign" />
                  <span v-else class="week-grid__dash" aria-label="该时段没有签到安排">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="week-mobile">
          <div class="week-days" role="group" aria-label="选择日期">
            <button v-for="(date, index) in dataDays" :key="date" type="button" :aria-pressed="index === selectedDayIndex"
              :aria-label="date + ' 周' + WEEKDAY_LABELS[index]" @click="selectedDay = date">
              <span>{{ WEEKDAY_LABELS[index] }}</span><strong>{{ Number(date.slice(-2)) }}</strong>
            </button>
          </div>
          <ul class="week-list">
            <li v-for="row in rows" :key="row.section">
              <div><strong>{{ formatSectionPair(row.section) }}</strong>
                <small v-if="row.block">{{ row.block.start.slice(0, 5) }}–{{ row.block.end.slice(0, 5) }}</small>
              </div>
              <WeekCheckin v-if="row.cells[selectedDayIndex]?.record" :record="row.cells[selectedDayIndex].record"
                :state="recordState(row.cells[selectedDayIndex].record)" :section="firstSectionOfBlock(row.section)"
                :date="row.cells[selectedDayIndex].date" :signing-id="signingId" @sign="sign" />
              <span v-else class="week-grid__dash" aria-label="该时段没有签到安排">—</span>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.week-hero {
  position: relative; isolation: isolate; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(235px, 290px); align-items: center;
  gap: 24px; padding: clamp(24px, 4vw, 44px); min-height: 204px; color: white;
  background: linear-gradient(105deg, #1d2a94 0%, #304be2 56%, #2038bd 100%); border-radius: var(--radius-xl);
}
.week-hero::before {
  content: ''; z-index: -1; position: absolute; width: 640px; aspect-ratio: 1; right: -25px; top: -190px;
  background: repeating-radial-gradient(ellipse at center, transparent 0 20px, #a0acfa37 21px 22px, transparent 23px 29px);
  transform: rotate(-19deg) scaleY(.65); opacity: .75; pointer-events: none;
}
.week-hero__date, .week-hero__label { display: flex; align-items: center; gap: 8px; color: #e1e7ff; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; }
.week-hero h1 { margin: 11px 0 7px; font-size: clamp(30px, 4.7vw, 51px); font-weight: 750; line-height: 1.13; letter-spacing: -.04em; }
.week-hero p { margin: 0; color: #e1e7ff; }
.week-hero__next { display: grid; justify-items: start; gap: 7px; padding: 15px 17px; border-radius: 14px; background: #101b78cf; border: 1px solid #9bacf77a; }
.week-hero__next strong { font-size: 17px; line-height: 1.35; }
.week-hero__next > span, .week-hero__next > a { font-size: 12px; }
.week-hero__next > a { display: inline-flex; align-items: center; gap: 6px; text-underline-offset: 4px; }
.week-hero__next .btn { margin-top: 3px; min-height: 33px; background: #fff; color: #2137ad; }
.week-panel__heading { display: flex; gap: 10px; align-items: center; }
.week-panel__icon { display: grid; place-items: center; width: 35px; height: 35px; border-radius: 10px; background: var(--color-accent-soft); color: var(--color-accent); }
.week-panel__total { color: var(--color-text-muted); font-size: 13px; }
.week-panel__total strong { color: var(--color-accent); }
.week-grid { table-layout: fixed; }
.week-grid tr > * { padding-inline: 6px; text-align: center; }
.week-grid tr > :first-child { width: 126px; padding-inline-start: 22px; text-align: start; }
.week-grid thead th { padding-block: 11px; }
.week-grid tbody td, .week-grid tbody th { height: 65px; }
.week-grid tbody th { font-size: 13px; font-weight: 650; }
.week-grid small, .week-list small { display: block; color: var(--color-text-muted); font: 500 11px/1.5 var(--font-data); margin-top: 2px; }
.week-grid .is-today, .week-grid tbody tr:hover td.is-today { background: #f0f3ff; }
.week-grid thead .is-today { color: #2841bb; box-shadow: inset 0 -2px 0 #5268ef; }
.week-grid__dash { color: #7b86a0; }
.week-mobile { display: none; }
@media (max-width: 890px) {
  .week-desktop { display: none; }
  .week-mobile { display: block; }
  .week-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; padding: 10px 14px; background: #f7f8fd; border-block: 1px solid var(--color-border); }
  .week-days button { display: grid; justify-items: center; gap: 1px; min-width: 0; padding: 5px 0; border-radius: 9px; border: 1px solid transparent; background: transparent; color: var(--color-text-muted); font-size: 11px; cursor: pointer; }
  .week-days button strong { font: 700 16px/1.4 var(--font-data); }
  .week-days button[aria-pressed="true"] { background: var(--color-accent); color: white; }
  .week-list { list-style: none; padding: 0 16px; margin: 0; }
  .week-list li { display: flex; justify-content: space-between; align-items: center; min-height: 57px; padding: 8px 0; border-bottom: 1px solid var(--color-border); }
  .week-list li:last-child { border: 0; }
}
@media (max-width: 620px) {
  .week-hero { grid-template-columns: minmax(0, 1fr); gap: 17px; border-radius: 17px; }
  .week-hero::before { right: -290px; }
}
</style>
