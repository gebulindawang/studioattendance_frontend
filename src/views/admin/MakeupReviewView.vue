<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import SearchField from '@/components/SearchField.vue'
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
const reviewDialog = ref(null)
const pendingCount = computed(() => requests.value.filter((item) => item.status === MAKEUP_STATUS.PENDING).length)
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
  reviewDialog.value?.showModal()
  noteInput.value?.focus()
}

function closeReview() {
  reviewDialog.value?.close()
  selectedId.value = null
}

async function review(decision) {
  if (!selected.value || reviewing.value) return
  reviewing.value = true
  reviewError.value = ''
  try {
    await reviewMakeupRequest(selected.value.id, decision, note.value.trim())
    feedback.value = decision === MAKEUP_STATUS.APPROVED ? '已通过，考勤已标记为补签。' : '已驳回，成员可查看原因。'
    closeReview()
    await load()
  } catch (error) {
    reviewError.value = error.message || '审批失败'
    if (error.status === 409) {
      await load()
      if (!selected.value) closeReview()
    }
  } finally {
    reviewing.value = false
  }
}

onMounted(load)
</script>

<template>
  <dialog v-if="selectedId !== null" ref="reviewDialog" class="review-drawer" aria-labelledby="review-title"
    @cancel.prevent="!reviewing && closeReview()">
    <template v-if="selected">
      <header class="review-drawer__header">
        <div><h2 id="review-title">审核补签申请</h2>
          <p>{{ selected.nickname || '成员' }} · {{ selected.checkin_date.slice(0, 10) }} · {{ formatSectionPair(selected.section) }}</p>
        </div>
        <button type="button" class="text-btn icon-btn" aria-label="关闭审批" :disabled="reviewing" @click="closeReview">
          <AppIcon name="close" />
        </button>
      </header>
      <div class="review-drawer__body">
        <div class="review-drawer__reason"><strong>申请原因</strong><p>{{ selected.reason }}</p></div>
        <label for="review-note">审批意见（驳回时必填）</label>
        <textarea id="review-note" ref="noteInput" v-model.trim="note" class="control" placeholder="填写审批意见"
          rows="5" maxlength="500" :disabled="reviewing" />
        <p v-if="reviewError" class="notice notice--danger" role="alert">{{ reviewError }}</p>
      </div>
      <footer class="review-drawer__actions">
        <button class="btn btn--secondary" type="button" :disabled="reviewing || !note" @click="review(MAKEUP_STATUS.REJECTED)">驳回</button>
        <button class="btn" type="button" :disabled="reviewing" @click="review(MAKEUP_STATUS.APPROVED)"><AppIcon name="check" :size="16" />通过</button>
      </footer>
    </template>
  </dialog>

  <p v-if="feedback" class="notice notice--ok" role="status">{{ feedback }}</p>
  <p v-if="reviewError && selectedId === null" class="notice notice--danger" role="alert">{{ reviewError }}</p>
  <p v-if="loadError" class="notice notice--danger" role="alert">
    <span class="notice__body">{{ loadError }}</span>
    <button type="button" class="link-btn" @click="load">重试</button>
  </p>

  <section class="panel">
    <header class="panel__head">
      <h2 class="panel__title">补签申请</h2>
      <span v-if="!loading && !loadError" class="tag" :class="pendingCount ? 'tag--warn' : 'tag--muted'">{{ pendingCount }} 条待审批</span>
    </header>
    <div class="toolbar">
      <select v-model="status" class="control" aria-label="审批状态">
        <option value="">全部状态</option>
        <option v-for="(label, value) in MAKEUP_LABELS" :key="value" :value="value">{{ label }}</option>
      </select>
      <SearchField v-model="keyword" placeholder="搜索成员昵称" label="搜索成员" />
      <span class="toolbar__spacer"></span>
      <span v-if="!loading && !loadError" class="panel__hint">共 {{ rows.length }} 条</span>
    </div>
    <div class="table-wrap">
      <table class="table makeup-list" aria-label="补签申请列表">
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
          <tr v-else-if="!rows.length"><td colspan="6" class="makeup-list__empty"><EmptyState icon="calendarCheck"
            :title="status === MAKEUP_STATUS.PENDING && !keyword.trim() ? '暂无待审批的申请' : '没有符合条件的申请'" /></td></tr>
          <tr v-else v-for="item in rows" :key="item.id">
            <td><span class="avatar" aria-hidden="true">{{ item.nickname.slice(0, 1) || '成' }}</span>{{ item.nickname || '成员' }}</td>
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
              <button v-if="item.status === MAKEUP_STATUS.PENDING" class="link-btn" type="button" aria-haspopup="dialog" :disabled="reviewing" @click="startReview(item)">审核</button>
              <span v-else class="table__muted">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.makeup-list { min-width: 745px; }
.makeup-list__empty { padding-block: 0; }
.review-text { min-width: 135px; max-width: 260px; overflow-wrap: anywhere; white-space: pre-wrap; }
.entry-meta { margin: 4px 0 0; color: var(--color-text-muted); font-size: 12px; }
.review-drawer { position: fixed; inset: 0 0 0 auto; width: min(100%, 480px); height: 100dvh; max-width: 100%; max-height: 100dvh; padding: 0; margin: 0; color: var(--color-text); background: var(--color-surface); border: 0; box-shadow: -12px 0 50px #111a3c40; }
.review-drawer[open] { display: flex; flex-direction: column; }
.review-drawer::backdrop { background: #0b133e68; }
.review-drawer__header, .review-drawer__actions { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; padding: 21px; border-bottom: 1px solid var(--color-border); }
.review-drawer__header h2 { margin: 0; font-size: 21px; }
.review-drawer__header p { margin: 5px 0 0; color: var(--color-text-muted); font-size: 13px; }
.review-drawer__body { display: grid; align-content: start; flex: 1; gap: 11px; padding: 20px 21px; overflow-y: auto; }
.review-drawer__body label { font-size: 13px; font-weight: 650; }
.review-drawer__body textarea { resize: vertical; width: 100%; }
.review-drawer__reason { padding: 13px 15px; margin-bottom: 8px; border-radius: 12px; background: #f3f5fc; }
.review-drawer__reason p { margin: 6px 0 0; white-space: pre-wrap; overflow-wrap: anywhere; }
.review-drawer__actions { justify-content: end; border-bottom: 0; border-top: 1px solid var(--color-border); }
</style>
