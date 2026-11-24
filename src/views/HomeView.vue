<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MemberTopbar from '@/components/MemberTopbar.vue'
import ScheduleTable from '@/components/ScheduleTable.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import UploadMeter from '@/components/UploadMeter.vue'
import { getMySchedule } from '@/api/schedule'
import { checkIn, getTodayAttendance } from '@/api/checkin'
import { CHECKIN_LABELS, CHECKIN_TONES } from '@/constants/checkin'
import { useTermStore } from '@/stores/term'
import { SCHEDULE_STATUS } from '@/constants/scheduleStatus'
import { formatDateTime } from '@/utils/format'
import {
  addDays,
  getMonday,
  getWeekNumber,
  isCourseInWeek,
} from '@/utils/schedule'

const router = useRouter()
const term = useTermStore()

const info = ref(null)
const loading = ref(true)
const errorMessage = ref('')

const attendance = ref(null)
const currentMonday = computed(() => {
  const date = attendance.value?.date
  const today = date ? new Date(`${date}T00:00:00`) : new Date()
  return getMonday(today)
})
const weekOffset = ref(0)
const monday = computed(() => {
  if (!term.semesterStart) return currentMonday.value
  const currentWeek = getWeekNumber(currentMonday.value, term.semesterStart)
  const initialWeek = Math.min(Math.max(currentWeek, 1), term.maxWeek)
  return addDays(getMonday(term.semesterStart), (initialWeek - 1 + weekOffset.value) * 7)
})
const week = computed(() => getWeekNumber(monday.value, term.semesterStart))
const canPrev = computed(() => week.value > 1)
const canNext = computed(() => week.value < term.maxWeek)

const status = computed(() => info.value?.status ?? SCHEDULE_STATUS.NONE)
const hasCourses = computed(() => (info.value?.courses.length ?? 0) > 0)
const exhausted = computed(() => info.value && info.value.upload_count >= info.value.max_uploads)
const visibleCourses = computed(() =>
  (info.value?.courses ?? []).filter((c) => isCourseInWeek(c, week.value)),
)

const STEPS = ['提交课表', '管理员解析', '课表生效']
const currentStep = computed(() => (status.value === SCHEDULE_STATUS.CONFIRMED ? 3 : 2))

const now = ref(Date.now())
const clockOffset = ref(0)
const signingSection = ref(null)
const checkinError = ref('')
const checkinLoadError = ref('')
let attendanceRequest = 0
let clockTimer = null
let refreshTimer = null

function sectionState(item) {
  const serverTime = now.value + clockOffset.value
  if (serverTime < Date.parse(item.opens_at)) return 'upcoming'
  return serverTime <= Date.parse(item.closes_at) ? 'open' : 'over'
}

async function loadAttendance() {
  const requestId = ++attendanceRequest
  try {
    const result = await getTodayAttendance()
    if (requestId !== attendanceRequest) return
    attendance.value = result
    now.value = Date.now()
    clockOffset.value = Date.parse(result.now) - now.value
    checkinLoadError.value = ''
  } catch (err) {
    if (requestId !== attendanceRequest) return
    checkinLoadError.value = err?.message || '签到状态加载失败'
  }
}

async function sign(item) {
  if (signingSection.value) return
  signingSection.value = item.section
  checkinError.value = ''
  try {
    const record = await checkIn(item.section)
    item.status = record.status
  } catch (err) {
    checkinError.value = err?.message || '签到失败,请稍后重试'
  } finally {
    signingSection.value = null
    await loadAttendance()
  }
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [, scheduleInfo] = await Promise.all([term.reload(), getMySchedule(), loadAttendance()])
    info.value = scheduleInfo
  } catch (err) {
    errorMessage.value = err?.message || '课表加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

function goUpload() {
  router.push({ name: 'upload' })
}

onMounted(() => {
  load()
  clockTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
  refreshTimer = setInterval(() => {
    if (!loading.value && !signingSection.value) loadAttendance()
  }, 30000)
})

onBeforeUnmount(() => {
  ++attendanceRequest
  clearInterval(clockTimer)
  clearInterval(refreshTimer)
})
</script>

<template>
  <main class="home">
    <MemberTopbar title="我的课表">
      <template v-if="hasCourses && term.ready" #actions>
        <button v-if="weekOffset !== 0" class="text-btn" type="button" @click="weekOffset = 0">
          回到本周
        </button>
        <div class="stepper" role="group" aria-label="切换周次">
          <button class="stepper__btn" type="button" aria-label="上一周" :disabled="!canPrev" @click="weekOffset--">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span class="stepper__label">第 {{ week }} 周</span>
          <button class="stepper__btn" type="button" aria-label="下一周" :disabled="!canNext" @click="weekOffset++">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </template>
    </MemberTopbar>

    <section v-if="loading" class="panel skeleton" aria-busy="true" aria-label="课表加载中">
      <div class="skeleton__bar skeleton__bar--head"></div>
      <div class="skeleton__grid">
        <div v-for="i in 14" :key="i" class="skeleton__cell"></div>
      </div>
    </section>

    <section v-else-if="errorMessage" class="panel">
      <EmptyState title="课表加载失败" :description="errorMessage">
        <template #icon>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
          </svg>
        </template>
        <button class="btn btn--sm" type="button" @click="load">重新加载</button>
      </EmptyState>
    </section>

    <template v-else-if="hasCourses">
      <section class="panel summary">
        <div class="summary__main">
          <StatusTag :status="status" />
          <span class="summary__text">
            <template v-if="status === SCHEDULE_STATUS.REPARSE">
              新课表已提交<span v-if="info.last_uploaded_at">于 {{ formatDateTime(info.last_uploaded_at) }}</span>
            </template>
            <template v-else>管理员已于 {{ formatDateTime(info.confirmed_at) }} 确认课表</template>
          </span>
        </div>
        <div class="summary__side">
          <UploadMeter :used="info.upload_count" :max="info.max_uploads" />
          <button class="btn btn--sm btn--secondary" type="button" :disabled="exhausted" @click="goUpload">
            重新上传
          </button>
        </div>
      </section>

      <section class="panel checkin">
        <header class="panel__head">
          <h2 class="panel__title">今日签到</h2>
          <span class="panel__hint">{{ attendance?.date }}</span>
        </header>
        <p v-if="checkinError || checkinLoadError" class="notice notice--danger checkin__error" role="alert">
          <span class="notice__body">{{ checkinError || checkinLoadError }}</span>
        </p>
        <p v-if="attendance && !attendance.sections.length" class="checkin__error">今日暂无签到安排。</p>
        <ul v-else-if="attendance" class="checkin__list">
          <li v-for="item in attendance.sections" :key="item.section" class="checkin__item">
            <div class="checkin__info">
              <p class="checkin__course">{{ item.course_name || '工作室考勤' }}</p>
              <p class="checkin__meta">
                第 {{ item.section }} 节 · {{ item.start_time.slice(11, 16) }}
              </p>
            </div>
            <button
              v-if="!item.status && sectionState(item) === 'open'"
              class="btn btn--sm"
              type="button"
              :disabled="signingSection !== null"
              @click="sign(item)"
            >
              <span v-if="signingSection === item.section" class="btn__spinner" aria-hidden="true"></span>
              {{ signingSection === item.section ? '签到中…' : '签到' }}
            </button>
            <span v-else-if="item.status" class="tag" :class="`tag--${CHECKIN_TONES[item.status] || 'muted'}`">
              {{ CHECKIN_LABELS[item.status] || '已记录' }}
            </span>
            <span v-else class="checkin__state">
              {{ sectionState(item) === 'upcoming' ? '未开始' : '已结束' }}
            </span>
          </li>
        </ul>
      </section>

      <p v-if="status === SCHEDULE_STATUS.REPARSE" class="notice notice--warn">
        <span class="notice__body">
          管理员正在等待处理新课表。当前课表和签到规则会沿用已生效的版本。
        </span>
      </p>
      <p v-else-if="exhausted" class="notice notice--info">
        <span class="notice__body">上传次数已用完。如果课表有变动,请联系管理员帮你修改。</span>
      </p>

      <ScheduleTable v-if="term.ready" :courses="visibleCourses" :sections="term.sections" :monday="monday" :week="week" />
      <p v-else class="notice notice--info">{{ term.problem }}</p>
    </template>

    <section v-else-if="status === SCHEDULE_STATUS.NONE" class="panel">
      <EmptyState
        title="你还没有上传课表"
        :description="`上传一张课表截图，管理员会帮你解析成可查看的课表。每人最多可上传 ${info.max_uploads} 次。`"
      >
        <button class="btn btn--sm" type="button" @click="goUpload">上传课表</button>
      </EmptyState>
    </section>

    <section v-else class="panel pending">
      <div class="pending__image">
        <img :src="info.latest_image" alt="已上传的课表图片" />
      </div>
      <div class="pending__body">
        <StatusTag :status="status" />
        <h2 class="pending__title">课表已提交,等待管理员解析</h2>
        <p class="pending__desc">
          <span v-if="info.last_uploaded_at">提交于 {{ formatDateTime(info.last_uploaded_at) }}。</span>
          管理员确认后，课表会显示在这里。
        </p>

        <ol class="steps">
          <li
            v-for="(label, i) in STEPS"
            :key="label"
            class="steps__item"
            :class="{ 'is-done': i + 1 < currentStep, 'is-current': i + 1 === currentStep }"
          >
            <span class="steps__index">{{ i + 1 }}</span>
            {{ label }}
          </li>
        </ol>

        <div class="pending__foot">
          <UploadMeter :used="info.upload_count" :max="info.max_uploads" />
          <button class="btn btn--sm btn--secondary" type="button" :disabled="exhausted" @click="goUpload">
            重新上传
          </button>
        </div>
        <p v-if="exhausted" class="notice notice--info">上传次数已用完,如需修改请联系管理员。</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
.home {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 20px 48px;
}

.home > .panel,
.home > .notice {
  margin-bottom: 16px;
}

.stepper {
  display: inline-flex;
  align-items: center;
  height: 36px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
}

.stepper__btn {
  width: 34px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: 0;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.stepper__btn:hover:not(:disabled) {
  color: var(--color-accent);
}

.stepper__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.stepper__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.stepper__label {
  min-width: 64px;
  text-align: center;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 20px;
}

.summary__main,
.summary__side {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.summary__side {
  gap: 18px;
}

.summary__text {
  font-size: 14px;
  color: var(--color-text-muted);
}

.checkin__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.checkin__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 20px;
}

.checkin__item + .checkin__item {
  border-top: 1px solid var(--color-border);
}

.checkin__info {
  min-width: 0;
}

.checkin__course {
  margin: 0;
  font-weight: 500;
}

.checkin__meta {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.checkin__state {
  font-size: 13px;
  color: var(--color-text-faint);
}

.checkin__error {
  margin: 0 20px 12px;
}

.pending {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  padding: 24px;
}

.pending__image {
  height: 300px;
  overflow: hidden;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.pending__image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.pending__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 0;
}

.pending__title {
  margin: 12px 0 0;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 500;
}

.pending__desc {
  margin: 8px 0 0;
  color: var(--color-text-muted);
}

.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin: 22px 0 0;
  padding: 0;
  list-style: none;
}

.steps__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--color-text-faint);
}

.steps__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: 50%;
}

.steps__item.is-done {
  color: var(--color-text-muted);
}

.steps__item.is-done .steps__index {
  background: var(--color-text-muted);
  border-color: var(--color-text-muted);
  color: #fff;
}

.steps__item.is-current {
  color: var(--color-text);
  font-weight: 500;
}

.steps__item.is-current .steps__index {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: #fff;
}

.pending__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  margin-top: auto;
  padding-top: 24px;
}

.pending .notice {
  margin-top: 14px;
}

.skeleton {
  padding: 20px;
}

.skeleton__bar,
.skeleton__cell {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  animation: pulse 1.3s ease-in-out infinite;
}

.skeleton__bar--head {
  height: 36px;
  margin-bottom: 14px;
}

.skeleton__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}

.skeleton__cell {
  height: 74px;
}

@keyframes pulse {
  50% {
    opacity: 0.45;
  }
}

@media (max-width: 720px) {
  .home {
    padding: 20px 12px 32px;
  }

  .pending {
    grid-template-columns: 1fr;
  }

  .pending__image {
    height: 200px;
  }
}
</style>
