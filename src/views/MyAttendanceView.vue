<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
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
  <main class="my-attendance">
    <MemberTopbar title="我的考勤">
      <template #actions>
        <RouterLink :to="{ name: 'home' }" class="btn btn--sm btn--secondary">工作室签到</RouterLink>
      </template>
    </MemberTopbar>

    <section v-if="attendance" class="panel next-slot">
      <header class="panel__head">
        <h2 class="panel__title">下次签到</h2>
        <RouterLink v-if="attendance.next" :to="{ name: 'home' }" class="link-btn">查看周表</RouterLink>
      </header>
      <p v-if="attendance.next" class="next-slot__detail">
        <strong>{{ attendance.next.checkin_date.slice(0, 10) }} · {{ formatAttendanceSection(attendance.next) }}</strong>
        <span>{{ clock(attendance.next.opens_at) }} 开放，{{ clock(attendance.next.slot_start) }} 截止</span>
      </p>
      <p v-else class="next-slot__detail">{{ nextMessages[attendance.week_state] || '本周暂无后续签到时段。' }}</p>
    </section>

    <form v-if="selectedRecord" class="panel makeup-form" @submit.prevent="submit">
      <header class="panel__head">
        <h2 class="panel__title">申请补签</h2>
        <span class="panel__hint">{{ selectedRecord.checkin_date.slice(0, 10) }} · {{ formatAttendanceSection(selectedRecord) }}</span>
      </header>
      <div class="makeup-form__body">
        <label for="makeup-reason">补签原因</label>
        <textarea id="makeup-reason" ref="reasonInput" v-model.trim="reason" class="control"
          rows="3" maxlength="500" required :disabled="submitting" />
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

    <p v-if="feedback" class="notice notice--ok" role="status">{{ feedback }}</p>
    <p v-if="loadError" class="notice notice--danger" role="alert">
      <span class="notice__body">{{ loadError }}</span>
      <button type="button" class="link-btn" @click="load">重试</button>
    </p>

    <section class="panel">
      <header class="panel__head">
        <h2 class="panel__title">历史考勤</h2>
        <input v-model="month" type="month" class="control" aria-label="查看月份" :disabled="submitting" @change="changeMonth" />
      </header>
      <div v-if="attendance && !loading" class="attendance-total">
        <span>签到 <strong>{{ monthStats.signed }}</strong></span>
        <span>补签 <strong>{{ monthStats.madeUp }}</strong></span>
        <span>未签到 <strong>{{ monthStats.missed }}</strong></span>
      </div>
      <div class="table-wrap">
        <table class="table history-table">
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
              <td>{{ record.checkin_date.slice(0, 10) }}</td>
              <td>{{ formatAttendanceSection(record) }}</td>
              <td><span class="tag" :class="`tag--${CHECKIN_TONES[record.status] || 'muted'}`">{{ CHECKIN_LABELS[record.status] || '未知' }}</span></td>
              <td>{{ clock(record.checkin_time) }}</td>
              <td>
                <template v-if="record.makeup_request">
                  <span class="tag" :class="`tag--${MAKEUP_TONES[record.makeup_request.status]}`">
                    {{ MAKEUP_LABELS[record.makeup_request.status] }}
                  </span>
                  <p v-if="record.makeup_request.review_note" class="review-note">{{ record.makeup_request.review_note }}</p>
                </template>
                <span v-else class="table__muted">—</span>
              </td>
              <td>
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
  </main>
</template>

<style scoped>
.my-attendance {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 20px 48px;
}

.next-slot,
.makeup-form,
.my-attendance > .notice {
  margin-bottom: 16px;
}

.next-slot__detail,
.attendance-total {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  margin: 0;
  padding: 12px 20px;
  color: var(--color-text-muted);
}

.makeup-form__body {
  display: grid;
  gap: 10px;
  padding: 14px 20px;
}

.makeup-form__body textarea {
  height: auto;
  min-height: 80px;
  padding: 8px 12px;
  resize: vertical;
}

.makeup-form__actions {
  display: flex;
  gap: 8px;
}

.history-table {
  min-width: 660px;
}

.review-note {
  max-width: 220px;
  margin: 5px 0 0;
  color: var(--color-text-muted);
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
</style>
