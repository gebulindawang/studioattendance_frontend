<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getCheckinRecords, getMembers } from '@/api/admin'
import { listScheduleUsers } from '@/api/adminSchedule'
import { SCHEDULE_STATUS } from '@/constants/scheduleStatus'
import { CHECKIN_LABELS, CHECKIN_STATUS, CHECKIN_TONES, STUDIO_RECORD, USER_STATUS } from '@/constants/checkin'
import { ROLE } from '@/constants/role'

const members = ref([])
const records = ref([])
const loading = ref(false)
const errorMessage = ref('')
const scheduleTodo = ref(0)

const today = ref('')

const shouldAttend = computed(
  () => members.value.filter((m) => m.role === ROLE.MEMBER && m.status === USER_STATUS.ACTIVE).length,
)

const todayRecords = computed(() => records.value.filter((r) => r.checkin_date === today.value))

function countBy(list, status) {
  return list.filter((r) => r.status === status).length
}

const stats = computed(() => [
  { label: '在职成员', value: shouldAttend.value, tone: 'plain' },
  {
    label: '已签到',
    value: countBy(todayRecords.value, CHECKIN_STATUS.NORMAL) + countBy(todayRecords.value, CHECKIN_STATUS.LATE),
    tone: 'ok',
  },
  { label: '待签到', value: countBy(todayRecords.value, CHECKIN_STATUS.PENDING), tone: 'info' },
  { label: '已截止 · 未签到', value: countBy(todayRecords.value, CHECKIN_STATUS.CLOSED), tone: 'warn' },
])

const todayList = computed(() =>
  todayRecords.value
    .filter((r) => r.checkin_time)
    .sort((a, b) => Date.parse(b.checkin_time) - Date.parse(a.checkin_time)),
)

const weekRates = computed(() => {
  if (!today.value) return []
  const firstDay = new Date(`${today.value}T00:00:00Z`)
  firstDay.setUTCDate(firstDay.getUTCDate() - 6)
  const start = firstDay.toISOString().slice(0, 10)
  const recent = records.value.filter((r) => r.checkin_date >= start && r.checkin_date <= today.value)
  const days = [...new Set(recent.map((r) => r.checkin_date))].sort()
  return days.map((date) => {
    const list = recent.filter((r) => r.checkin_date === date)
    const attended = countBy(list, CHECKIN_STATUS.NORMAL) + countBy(list, CHECKIN_STATUS.LATE)
    const expected = attended + countBy(list, CHECKIN_STATUS.CLOSED) + countBy(list, CHECKIN_STATUS.ABSENT)
    const rate = expected ? Math.round((attended / expected) * 100) : null
    return { date: date.slice(5), rate, isToday: date === today.value }
  })
})

function formatTime(value) {
  return value ? value.slice(11, 16) : '—'
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [accounts, attendance] = await Promise.all([getMembers(), getCheckinRecords()])
    members.value = accounts
    records.value = attendance.records
    today.value = attendance.date
  } catch (err) {
    errorMessage.value = err?.message || '数据加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadScheduleTodo() {
  try {
    const list = await listScheduleUsers()
    scheduleTodo.value = list.filter(
      (u) => u.status === SCHEDULE_STATUS.PENDING || u.status === SCHEDULE_STATUS.REPARSE,
    ).length
  } catch {
    scheduleTodo.value = 0
  }
}

onMounted(() => {
  load()
  loadScheduleTodo()
})
</script>

<template>
  <p v-if="errorMessage" class="state-error" role="alert">
    {{ errorMessage }}
    <button class="link-btn" type="button" @click="load">重试</button>
  </p>

  <p v-if="scheduleTodo > 0" class="notice notice--warn todo">
    <span class="notice__body">
      有 <strong>{{ scheduleTodo }}</strong> 位用户的课表等待解析。
      <RouterLink :to="{ name: 'admin-schedules' }">去处理</RouterLink>
    </span>
  </p>

  <section class="stats" :class="{ 'is-loading': loading }">
    <article v-for="s in stats" :key="s.label" class="stat" :class="`stat--${s.tone}`">
      <p class="stat__label">{{ s.label }}</p>
      <p class="stat__value">{{ loading ? '–' : s.value }}</p>
    </article>
  </section>

  <div class="grid">
    <section class="panel">
      <header class="panel__head">
        <h2 class="panel__title">今日签到</h2>
        <span class="panel__hint">共 {{ todayList.length }} 条</span>
      </header>
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>成员</th>
              <th>节次</th>
              <th>状态</th>
              <th>签到时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!loading && todayList.length === 0">
              <td class="table__empty" colspan="4">
                今天还没有成员签到
              </td>
            </tr>
            <tr v-for="r in todayList" :key="r.id">
              <td>
                <span class="avatar" aria-hidden="true">{{ r.nickname.slice(0, 1) }}</span>
                {{ r.nickname }}
              </td>
              <td class="table__muted">第 {{ r.section }} {{ r.record_kind === STUDIO_RECORD ? '大节' : '节' }}</td>
              <td>
                <span class="tag" :class="`tag--${CHECKIN_TONES[r.status]}`">
                  {{ CHECKIN_LABELS[r.status] }}
                </span>
              </td>
              <td class="table__muted">{{ formatTime(r.checkin_time) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <header class="panel__head">
        <h2 class="panel__title">近 7 天签到率</h2>
      </header>
      <ul class="rates">
        <li v-for="d in weekRates" :key="d.date" class="rate" :class="{ 'is-today': d.isToday }">
          <span class="rate__date">{{ d.date }}</span>
          <span class="rate__track">
            <span class="rate__fill" :style="{ width: `${d.rate ?? 0}%` }"></span>
          </span>
          <span class="rate__value">{{ d.rate === null ? '—' : `${d.rate}%` }}</span>
        </li>
      </ul>
      <p class="rates__note">已签到人次占已签到及已截止场次的比例</p>
    </section>
  </div>
</template>

<style scoped>
.state-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 16px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border-radius: var(--radius-md);
}

.todo {
  margin-bottom: 16px;
}

.todo a {
  margin-left: 6px;
  color: inherit;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.stats.is-loading {
  opacity: 0.6;
}

.stat {
  padding: 16px 18px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stat__label {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.stat__value {
  margin: 6px 0 0;
  font-family: var(--font-serif);
  font-size: 32px;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.stat--ok .stat__value {
  color: #2f6b45;
}

.stat--warn .stat__value {
  color: #8a6414;
}

.stat--info .stat__value {
  color: #35597a;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
  gap: 16px;
  align-items: start;
}

.rates {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 0;
  padding: 20px;
  list-style: none;
}

.rate {
  display: grid;
  grid-template-columns: 44px 1fr 40px;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.rate.is-today {
  color: var(--color-text);
  font-weight: 500;
}

.rate__track {
  height: 8px;
  overflow: hidden;
  background: var(--color-bg);
  border-radius: 999px;
}

.rate__fill {
  display: block;
  height: 100%;
  background: var(--color-accent);
  border-radius: 999px;
}

.rate__value {
  text-align: right;
}

.rates__note {
  margin: 0;
  padding: 0 20px 16px;
  font-size: 12px;
  color: var(--color-text-faint);
}

@media (max-width: 960px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
