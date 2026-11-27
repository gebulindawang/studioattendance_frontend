<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { listMakeupRequests, reviewMakeupRequest } from '@/api/checkin'
import { MAKEUP_LABELS, MAKEUP_STATUS, MAKEUP_TONES } from '@/constants/checkin'
import { formatDateTime } from '@/utils/format'
import { formatSectionPair } from '@/utils/schedule'

const requests = ref([])
const status = ref(MAKEUP_STATUS.PENDING)
const keyword = ref('')
const loading = ref(true)
const loadError = ref('')
const selectedId = ref(null)
const note = ref('')
const noteInput = ref(null)
const reviewing = ref(false)
const reviewError = ref('')
const feedback = ref('')

const selected = computed(() => requests.value.find(
  (item) => item.id === selectedId.value && item.status === MAKEUP_STATUS.PENDING,
))
const rows = computed(() => {
  const name = keyword.value.trim().toLowerCase()
  return requests.value.filter((item) =>
    (!status.value || item.status === status.value) && item.nickname.toLowerCase().includes(name),
  )
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    requests.value = await listMakeupRequests()
  } catch (error) {
    loadError.value = error.message || '补签申请加载失败'
  } finally {
    loading.value = false
  }
}

async function startReview(item) {
  selectedId.value = item.id
  note.value = ''
  reviewError.value = ''
  feedback.value = ''
  await nextTick()
  noteInput.value?.focus()
}

async function review(decision) {
  if (!selected.value || reviewing.value) return
  reviewing.value = true
  reviewError.value = ''
  try {
    await reviewMakeupRequest(selected.value.id, decision, note.value.trim())
    feedback.value = decision === MAKEUP_STATUS.APPROVED ? '已通过，考勤已标记为补签。' : '已驳回，成员可查看原因。'
    selectedId.value = null
    await load()
  } catch (error) {
    reviewError.value = error.message || '审批失败'
    if (error.status === 409) await load()
  } finally {
    reviewing.value = false
  }
}

onMounted(load)
</script>

<template>
  <section v-if="selected" class="panel review-form">
    <header class="panel__head">
      <h2 class="panel__title">审批 {{ selected.nickname || '成员' }} 的申请</h2>
      <span class="panel__hint">{{ selected.checkin_date.slice(0, 10) }} · {{ formatSectionPair(selected.section) }}</span>
    </header>
    <div class="review-form__body">
      <p class="review-text">{{ selected.reason }}</p>
      <label for="review-note">审批意见（驳回时必填）</label>
      <textarea id="review-note" ref="noteInput" v-model.trim="note" class="control" rows="3" maxlength="500" :disabled="reviewing" />
      <div class="review-form__actions">
        <button class="btn btn--sm" type="button" :disabled="reviewing" @click="review(MAKEUP_STATUS.APPROVED)">通过</button>
        <button class="btn btn--sm btn--secondary" type="button" :disabled="reviewing || !note" @click="review(MAKEUP_STATUS.REJECTED)">驳回</button>
        <button class="link-btn" type="button" :disabled="reviewing" @click="selectedId = null">取消</button>
      </div>
    </div>
  </section>

  <p v-if="feedback" class="notice notice--ok" role="status">{{ feedback }}</p>
  <p v-if="reviewError" class="notice notice--danger" role="alert">{{ reviewError }}</p>
  <p v-if="loadError" class="notice notice--danger" role="alert">
    <span class="notice__body">{{ loadError }}</span>
    <button type="button" class="link-btn" @click="load">重试</button>
  </p>

  <section class="panel">
    <div class="toolbar">
      <select v-model="status" class="control" aria-label="审批状态">
        <option value="">全部状态</option>
        <option v-for="(label, value) in MAKEUP_LABELS" :key="value" :value="value">{{ label }}</option>
      </select>
      <input v-model="keyword" type="search" class="control" placeholder="搜索成员" aria-label="搜索成员" />
      <span class="toolbar__spacer"></span>
      <span v-if="!loading && !loadError" class="panel__hint">共 {{ rows.length }} 条</span>
    </div>
    <div class="table-wrap">
      <table class="table makeup-list">
        <thead>
          <tr>
            <th scope="col">成员</th>
            <th scope="col">补签时段</th>
            <th scope="col">申请原因</th>
            <th scope="col">审批状态</th>
            <th scope="col">处理记录</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading"><td colspan="6" class="table__empty">加载中…</td></tr>
          <tr v-else-if="loadError"><td colspan="6" class="table__empty">暂时无法读取申请</td></tr>
          <tr v-else-if="!rows.length"><td colspan="6" class="table__empty">没有符合条件的申请</td></tr>
          <tr v-else v-for="item in rows" :key="item.id">
            <td>{{ item.nickname || '成员' }}</td>
            <td>
              {{ item.checkin_date.slice(0, 10) }} · {{ formatSectionPair(item.section) }}
              <p class="entry-meta">{{ formatDateTime(item.created_at) }} 提交</p>
            </td>
            <td class="review-text">{{ item.reason }}</td>
            <td><span class="tag" :class="`tag--${MAKEUP_TONES[item.status]}`">{{ MAKEUP_LABELS[item.status] }}</span></td>
            <td>
              <template v-if="item.reviewed_at">
                {{ item.reviewer_name || '管理员' }} · {{ formatDateTime(item.reviewed_at) }}
                <p v-if="item.review_note" class="entry-meta review-text">{{ item.review_note }}</p>
              </template>
              <span v-else class="table__muted">—</span>
            </td>
            <td>
              <button v-if="item.status === MAKEUP_STATUS.PENDING" class="link-btn" type="button" :disabled="reviewing" @click="startReview(item)">审核</button>
              <span v-else class="table__muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.review-form,
.notice {
  margin-bottom: 16px;
}

.review-form__body {
  display: grid;
  gap: 10px;
  padding: 14px 20px;
}

.review-form__body textarea {
  height: auto;
  min-height: 80px;
  padding: 8px 12px;
  resize: vertical;
}

.review-form__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.makeup-list {
  min-width: 720px;
}

.review-text {
  max-width: 260px;
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.review-form .review-text {
  max-width: none;
}

.entry-meta {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 12px;
}
</style>
