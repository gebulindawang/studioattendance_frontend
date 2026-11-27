<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import MetricCard from '@/components/MetricCard.vue'
import { getCheckinRecords, getMembers } from '@/api/admin'
import { listScheduleUsers } from '@/api/adminSchedule'
import { listMakeupRequests } from '@/api/checkin'
import { SCHEDULE_STATUS } from '@/constants/scheduleStatus'
import { CHECKIN_LABELS, CHECKIN_STATUS, CHECKIN_TONES, MAKEUP_STATUS, USER_STATUS } from '@/constants/checkin'
import { ROLE } from '@/constants/role'
import { formatAttendanceSection } from '@/utils/checkin'

const members = ref([])
const records = ref([])
const loading = ref(true)
const errorMessage = ref('')
const today = ref('')
const scheduleTodo = ref(null)
const makeupTodo = ref(null)

const todayRecords = computed(() => records.value.filter((record) => record.checkin_date === today.value))

function countBy(list, ...statuses) {
  return list.filter((record) => statuses.includes(record.status)).length
}

function attendedCount(list) {
  return countBy(list, CHECKIN_STATUS.NORMAL, CHECKIN_STATUS.LATE, CHECKIN_STATUS.MADE_UP)
}

const stats = computed(() => [
  { label: '在职成员', icon: 'users', tone: 'blue', value: members.value.filter((member) => member.role === ROLE.MEMBER && member.status === USER_STATUS.ACTIVE).length },
  { label: '今日已签到', icon: 'checkCircle', tone: 'green', value: attendedCount(todayRecords.value) },
  { label: '今日待签到', icon: 'clock', tone: 'slate', value: countBy(todayRecords.value, CHECKIN_STATUS.PENDING) },
  { label: '今日未签到', icon: 'alert', tone: 'amber', value: countBy(todayRecords.value, CHECKIN_STATUS.CLOSED, CHECKIN_STATUS.ABSENT) },
])

const todayList = computed(() => todayRecords.value
  .filter((record) => record.checkin_time || record.status === CHECKIN_STATUS.MADE_UP)
  .sort((a, b) => Date.parse(b.checkin_time || b.updated_at) - Date.parse(a.checkin_time || a.updated_at)))

const weekRates = computed(() => {
  if (!today.value) return []
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today.value + 'T00:00:00Z')
    day.setUTCDate(day.getUTCDate() - 6 + index)
    const key = day.toISOString().slice(0, 10)
    const list = records.value.filter((record) => record.checkin_date === key)
    const attended = attendedCount(list)
    const expected = attended + countBy(list, CHECKIN_STATUS.CLOSED, CHECKIN_STATUS.ABSENT)
    return { date: key.slice(5).replace('-', '/'), rate: expected ? Math.round(attended * 100 / expected) : null, isToday: key === today.value }
  })
})

const tasks = computed(() => [
  { label: '待处理课表', count: scheduleTodo.value, icon: 'calendar', route: 'admin-schedules' },
  { label: '待审批补签', count: makeupTodo.value, icon: 'calendarCheck', route: 'admin-makeup' },
])

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [accounts, attendance] = await Promise.all([getMembers(), getCheckinRecords()])
    members.value = accounts
    records.value = attendance.records
    today.value = attendance.date
  } catch (error) {
    errorMessage.value = error.message || '数据加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadTasks() {
  const [schedules, requests] = await Promise.allSettled([listScheduleUsers(), listMakeupRequests()])
  scheduleTodo.value = schedules.status === 'fulfilled' ? schedules.value.filter(
    (item) => [SCHEDULE_STATUS.PENDING, SCHEDULE_STATUS.REPARSE].includes(item.status),
  ).length : null
  makeupTodo.value = requests.status === 'fulfilled' ? requests.value.filter((item) => item.status === MAKEUP_STATUS.PENDING).length : null
}

onMounted(() => { load(); loadTasks() })
</script>

<template>
  <p v-if="errorMessage" class="notice notice--danger" role="alert">
    <span class="notice__body">{{ errorMessage }}</span><button class="link-btn" type="button" @click="load">重试</button>
  </p>

  <section class="overview-metrics" aria-label="今日考勤统计">
    <MetricCard v-for="stat in stats" :key="stat.label" :label="stat.label" :icon="stat.icon" :tone="stat.tone"
      :value="loading || errorMessage ? '—' : stat.value" />
  </section>

  <div class="overview-grid">
    <section class="panel chart">
      <header class="panel__head">
        <div><h2 class="panel__title">近 7 天签到率</h2><p class="chart__caption">已签到人次占已签到及已截止场次的比例</p></div>
        <span v-if="today" class="chart__date"><AppIcon name="calendar" :size="15" />{{ today }}</span>
      </header>
      <div v-if="weekRates.length" class="chart__body">
        <div class="chart__axis" aria-hidden="true"><span>100%</span><span>50%</span><span>0%</span></div>
        <ul class="chart__days" aria-label="每日签到率">
          <li v-for="day in weekRates" :key="day.date" :class="{ 'is-today': day.isToday }"
            :aria-label="day.date + ' ' + (day.rate === null ? '暂无数据' : day.rate + '%')">
            <div class="chart__track" :style="{ '--rate': (day.rate ?? 0) + '%' }" aria-hidden="true">
              <span v-if="day.rate !== null" class="chart__bar"></span>
              <span class="chart__value">{{ day.rate === null ? '—' : day.rate + '%' }}</span>
            </div>
            <span class="chart__day" aria-hidden="true">{{ day.date }}</span>
          </li>
        </ul>
      </div>
      <p v-else class="chart__empty">{{ loading ? '读取考勤数据…' : '暂无考勤数据' }}</p>
    </section>

    <section class="panel overview-tasks">
      <header class="panel__head"><h2 class="panel__title">待处理事项</h2></header>
      <RouterLink v-for="task in tasks" :key="task.route" class="task" :to="{ name: task.route }">
        <span class="task__icon"><AppIcon :name="task.icon" /></span>
        <strong>{{ task.label }}</strong><span class="task__count">{{ task.count ?? '—' }}</span>
        <AppIcon name="chevron" :size="14" />
      </RouterLink>
    </section>
  </div>

  <section class="panel">
    <header class="panel__head">
      <h2 class="panel__title">今日签到明细</h2>
      <RouterLink class="link-btn" :to="{ name: 'admin-records' }">全部记录 <AppIcon name="arrow" :size="15" /></RouterLink>
    </header>
    <p v-if="loading" class="page-loader"><span class="spinner" aria-hidden="true"></span>加载中…</p>
    <EmptyState v-else-if="!todayList.length" icon="records" title="暂无今日签到记录" />
    <div v-else class="table-wrap">
      <table class="table table--records" aria-label="今日签到明细">
        <thead><tr><th scope="col">成员</th><th scope="col">节次</th><th scope="col">状态</th><th scope="col">签到时间</th></tr></thead>
        <tbody>
          <tr v-for="record in todayList" :key="record.id">
            <td><span class="avatar" aria-hidden="true">{{ record.nickname.slice(0, 1) }}</span>{{ record.nickname }}</td>
            <td class="table__muted">{{ formatAttendanceSection(record) }}</td>
            <td><span class="tag" :class="'tag--' + CHECKIN_TONES[record.status]">{{ CHECKIN_LABELS[record.status] }}</span></td>
            <td class="table__muted">{{ record.checkin_time?.slice(11, 16) || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.overview-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.overview-grid { display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(205px, 1fr); gap: 16px; align-items: start; }
.chart__caption { margin: 4px 0 0; color: var(--color-text-muted); font-size: 12px; }
.chart__date { display: flex; gap: 6px; align-items: center; padding: 5px 9px; border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.chart__body { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 9px; padding: 20px 19px 16px; }
.chart__axis { display: flex; flex-direction: column; justify-content: space-between; text-align: end; padding-bottom: 26px; line-height: 1; font-size: 10px; color: var(--color-text-muted); }
.chart__days { --height: 120px; min-width: 0; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); padding: 0; margin: 0; list-style: none; background: repeating-linear-gradient(to bottom, var(--color-border) 0 1px, transparent 1px 60px) top / 100% calc(var(--height) + 1px) no-repeat; }
.chart__days li { min-width: 0; display: grid; justify-items: center; }
.chart__track { position: relative; width: min(64%, 41px); height: var(--height); display: flex; align-items: end; }
.chart__bar { min-height: 2px; width: 100%; height: var(--rate); background: #a4b0fb; border-radius: 5px 5px 0 0; }
.is-today .chart__bar { background: linear-gradient(180deg, #5e72f5, #3049e8); }
.chart__value { position: absolute; bottom: var(--rate); left: 50%; transform: translateX(-50%); padding-bottom: 3px; color: #35446d; font-size: 10px; font-weight: 650; }
.chart__day { padding-top: 7px; color: var(--color-text-muted); font-size: 11px; }
.is-today .chart__day { color: var(--color-accent); font-weight: 700; }
.chart__empty { min-height: 145px; display: grid; place-items: center; margin: 0; color: var(--color-text-muted); }
.overview-tasks { padding-bottom: 9px; }
.task { display: flex; align-items: center; min-height: 54px; margin: 0 11px; padding: 7px 10px; border-radius: 10px; gap: 9px; color: var(--color-text-muted); text-decoration: none; }
.task:hover { background: var(--color-accent-soft); }
.task strong { flex: 1; color: var(--color-text); font-size: 13px; }
.task__icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: var(--color-accent-soft); color: var(--color-accent); }
.task__count { color: var(--color-accent); font: 700 16px/1 var(--font-data); }
@media (max-width: 1060px) { .overview-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .overview-grid { grid-template-columns: minmax(0, 1fr); } .overview-metrics { gap: 8px; } .chart__body { padding-inline: 12px; } }
</style>
