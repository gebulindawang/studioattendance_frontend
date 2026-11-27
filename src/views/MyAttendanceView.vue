<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PageHeading from '@/components/PageHeading.vue'
import MetricCard from '@/components/MetricCard.vue'
import MemberTopbar from '@/components/MemberTopbar.vue'
import { getMyAttendance, submitMakeupRequest } from '@/api/checkin'
import { CHECKIN_LABELS, CHECKIN_STATUS, CHECKIN_TONES, MAKEUP_LABELS, MAKEUP_TONES } from '@/constants/checkin'
import { formatAttendanceSection } from '@/utils/checkin'

const attendance = ref(null)
const month = ref('')
const loading = ref(true)
const loadError = ref('')
const selectedRecord = ref(null)
const reason = ref('')
const reasonInput = ref(null)
const submitting = ref(false)
const submitError = ref('')
const feedback = ref('')
let loadSequence = 0

const monthStats = computed(() => {
  const result = { signed: 0, madeUp: 0, missed: 0 }
  for (const record of attendance.value?.records ?? []) {
    if (record.status === CHECKIN_STATUS.NORMAL || record.status === CHECKIN_STATUS.LATE) result.signed++
    else if (record.status === CHECKIN_STATUS.MADE_UP) result.madeUp++
    else if (record.status === CHECKIN_STATUS.CLOSED || record.status === CHECKIN_STATUS.ABSENT) result.missed++
  }
  return result
})

const nextMessages = {
  not_uploaded: '上传课表后才能安排签到。',
  waiting_review: '课表正在等待管理员确认。',
  no_configuration: '本周还没有可用的学期或节次配置。',
  no_slots: '根据当前课表，本周没有可签到时段。',
  not_generated: '本周签到表还未生成。',
  needs_regeneration: '本周还有待补齐的签到时段。',
}

function clock(value) {
  return value?.slice(11, 16) || '—'
}

async function load() {
  const sequence = ++loadSequence
  loading.value = true
  loadError.value = ''
  try {
    const result = await getMyAttendance(month.value)
    if (sequence !== loadSequence) return
    attendance.value = result
    month.value = result.month
  } catch (error) {
    if (sequence === loadSequence) loadError.value = error.message || '考勤记录加载失败'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

function changeMonth() {
  selectedRecord.value = null
  feedback.value = ''
  load()
}

async function startRequest(record) {
  selectedRecord.value = record
  reason.value = ''
  submitError.value = ''
  feedback.value = ''
  await nextTick()
  reasonInput.value?.focus()
}

async function submit() {
  if (!selectedRecord.value || !reason.value.trim() || submitting.value) return
  submitting.value = true
  submitError.value = ''
  try {
    await submitMakeupRequest(selectedRecord.value.id, reason.value.trim())
    feedback.value = '补签申请已提交，可在下方查看进度。'
    selectedRecord.value = null
    await load()
  } catch (error) {
    submitError.value = error.message || '补签申请提交失败'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => { ++loadSequence })
</script>

<template>
  <MemberTopbar />
  <main class="member-page">
    <PageHeading title="我的考勤" description="查看个人签到记录和补签进度。" />
    <div class="page-stack">
      <div class="attendance-summary">
        <section class="next-card">
          <span class="next-card__label"><AppIcon name="clock" :size="17" /> 下次签到</span>
          <template v-if="attendance?.next">
            <strong>{{ attendance.next.checkin_date.slice(5, 10).replace('-', '/') }} · {{ formatAttendanceSection(attendance.next) }}</strong>
            <div class="next-card__time">{{ clock(attendance.next.opens_at) }} 开放 · {{ clock(attendance.next.slot_start) }} 截止</div>
          </template>
          <p v-else>{{ attendance ? nextMessages[attendance.week_state] || '本周暂无后续签到时段。' : '—' }}</p>
          <RouterLink :to="{ name: 'home' }">查看签到周表 <AppIcon name="arrow" :size="15" /></RouterLink>
        </section>
        <div class="attendance-summary__metrics" aria-label="所选月份统计">
          <MetricCard label="已签到" icon="checkCircle" tone="green" :value="attendance && !loading ? monthStats.signed : '—'" />
          <MetricCard label="已补签" icon="calendarCheck" :value="attendance && !loading ? monthStats.madeUp : '—'" />
          <MetricCard label="未签到" icon="clock" tone="amber" :value="attendance && !loading ? monthStats.missed : '—'" />
        </div>
      </div>

      <form v-if="selectedRecord" class="panel makeup-form" @submit.prevent="submit">
        <header class="panel__head">
          <h2 class="panel__title">申请补签</h2>
          <span class="panel__hint">{{ selectedRecord.checkin_date.slice(0, 10) }} · {{ formatAttendanceSection(selectedRecord) }}</span>
        </header>
        <div class="makeup-form__body">
          <label for="makeup-reason">补签原因</label>
          <textarea id="makeup-reason" ref="reasonInput" v-model.trim="reason" class="control"
            rows="4" placeholder="请简要说明错过签到的原因" maxlength="500" required :disabled="submitting" />
          <p v-if="submitError" class="notice notice--danger" role="alert">{{ submitError }}</p>
          <div class="makeup-form__actions">
            <button type="submit" class="btn btn--sm" :disabled="submitting || !reason">
              {{ submitting ? '提交中…' : '提交申请' }}
            </button>
            <button type="button" class="btn btn--sm btn--secondary" :disabled="submitting" @click="selectedRecord = null">
              取消
            </button>
          </div>
        </div>
      </form>
      <p v-if="feedback" class="notice notice--ok" role="status"><AppIcon name="checkCircle" />{{ feedback }}</p>
      <p v-if="loadError" class="notice notice--danger" role="alert">
        <span class="notice__body">{{ loadError }}</span><button type="button" class="link-btn" @click="load">重试</button>
      </p>

      <section class="panel">
        <header class="panel__head">
          <h2 class="panel__title">历史考勤</h2>
          <input v-model="month" type="month" class="control" aria-label="查看月份" :disabled="submitting" @change="changeMonth" />
        </header>
        <div class="table-wrap">
          <table class="table history-table" aria-label="月度考勤记录">
            <thead>
              <tr>
                <th scope="col">日期</th>
                <th scope="col">节次</th>
                <th scope="col">签到状态</th>
                <th scope="col">签到时间</th>
                <th scope="col">补签进度</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading"><td colspan="6" class="table__empty">加载中…</td></tr>
              <tr v-else-if="loadError"><td colspan="6" class="table__empty">暂时无法读取记录</td></tr>
              <tr v-else-if="!attendance?.records.length"><td colspan="6" class="table__empty">本月暂无考勤记录</td></tr>
              <tr v-else v-for="record in attendance.records" :key="record.id">
                <td class="history-date">{{ record.checkin_date.slice(0, 10) }}</td>
                <td>{{ formatAttendanceSection(record) }}</td>
                <td><span class="tag" :class="`tag--${CHECKIN_TONES[record.status] || 'muted'}`">{{ CHECKIN_LABELS[record.status] || '未知' }}</span></td>
                <td class="history-clock" :class="{ 'is-empty': !record.checkin_time }">{{ clock(record.checkin_time) }}</td>
                <td class="history-review" :class="{ 'is-empty': !record.makeup_request }">
                  <template v-if="record.makeup_request">
                    <span class="tag" :class="`tag--${MAKEUP_TONES[record.makeup_request.status]}`">
                      {{ MAKEUP_LABELS[record.makeup_request.status] }}
                    </span>
                    <p v-if="record.makeup_request.review_note" class="review-note">{{ record.makeup_request.review_note }}</p>
                  </template>
                  <span v-else class="table__muted">—</span>
                </td>
                <td class="history-action" :class="{ 'is-empty': !record.can_request_makeup }">
                  <button v-if="record.can_request_makeup" class="link-btn" type="button" :disabled="submitting" @click="startRequest(record)">
                    {{ record.makeup_request ? '重新申请' : '申请补签' }}
                  </button>
                  <span v-else class="table__muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.attendance-summary { display: grid; grid-template-columns: minmax(240px, 1fr) minmax(0, 2fr); gap: 14px; }
.attendance-summary__metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.next-card { display: grid; align-content: center; gap: 5px; padding: 16px 20px; background: #171f49; color: #fff; border-radius: var(--radius-lg); background-image: radial-gradient(ellipse at 100% 0, #394fbd, transparent 78%); }
.next-card__label, .next-card__time, .next-card p { color: #dce4ff; font-size: 12px; margin: 0; }
.next-card__label, .next-card a { display: flex; align-items: center; gap: 7px; width: fit-content; }
.next-card strong { font-size: 19px; }
.next-card a { font-size: 12px; text-underline-offset: 4px; margin-top: 4px; }
.makeup-form { border-color: #ced6fe; }
.makeup-form__body { display: grid; gap: 10px; padding: 0 22px 20px; }
.makeup-form__body label { font-size: 13px; font-weight: 650; }
.makeup-form__body textarea { width: 100%; resize: vertical; }
.makeup-form__actions { display: flex; gap: 8px; justify-content: end; }
.history-date { font-variant-numeric: tabular-nums; }
.review-note { max-width: 220px; margin: 5px 0 0; color: var(--color-text-muted); overflow-wrap: anywhere; white-space: pre-wrap; }

@media (max-width: 800px) {
  .attendance-summary { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 630px) {
  .attendance-summary__metrics { gap: 7px; }
  .history-table, .history-table tbody { display: block; }
  .history-table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .history-table tbody tr { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 10px 15px; gap: 6px; align-items: center; border-top: 1px solid var(--color-border); }
  .history-table tbody td { padding: 1px 0; border: 0; background: transparent; }
  .history-table tbody td.table__empty { grid-column: 1 / -1; padding: 30px 0; }
  .history-table tbody td:nth-child(3) { justify-self: end; }
  .history-table tbody .history-action { justify-self: end; }
  .history-clock { color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
  .history-review { grid-column: auto / span 1; }
  .history-table .is-empty { display: none; }
}
</style>
