<script setup>
import AppIcon from '@/components/AppIcon.vue'
import EmptyState from '@/components/EmptyState.vue'
import SearchField from '@/components/SearchField.vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StatusTag from '@/components/StatusTag.vue'
import { listScheduleUsers, resetSchedule } from '@/api/adminSchedule'
import {
  SCHEDULE_STATUS,
  SCHEDULE_STATUS_LABELS,
  SCHEDULE_STATUS_ORDER,
} from '@/constants/scheduleStatus'
import { formatRelative } from '@/utils/format'

const router = useRouter()

const users = ref([])
const loading = ref(true)
const errorMessage = ref('')
const keyword = ref('')
const tab = ref('all')
const resettingId = ref(null)

const TABS = [
  { value: 'all', label: '全部' },
  { value: SCHEDULE_STATUS.REPARSE, label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.REPARSE] },
  { value: SCHEDULE_STATUS.PENDING, label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.PENDING] },
  { value: SCHEDULE_STATUS.NONE, label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.NONE] },
  { value: SCHEDULE_STATUS.CONFIRMED, label: SCHEDULE_STATUS_LABELS[SCHEDULE_STATUS.CONFIRMED] },
]

const counts = computed(() => {
  const result = { all: users.value.length }
  users.value.forEach((u) => {
    result[u.status] = (result[u.status] || 0) + 1
  })
  return result
})

const todoCount = computed(
  () => (counts.value[SCHEDULE_STATUS.PENDING] || 0) + (counts.value[SCHEDULE_STATUS.REPARSE] || 0),
)

const rows = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return users.value
    .filter((u) => tab.value === 'all' || u.status === tab.value)
    .filter(
      (u) => !kw || u.nickname.toLowerCase().includes(kw) || u.username.toLowerCase().includes(kw),
    )
    .sort((a, b) => {
      const diff = SCHEDULE_STATUS_ORDER[a.status] - SCHEDULE_STATUS_ORDER[b.status]
      if (diff !== 0) return diff
      return (b.last_uploaded_at || '').localeCompare(a.last_uploaded_at || '')
    })
})

function actionLabel(u) {
  if (u.status === SCHEDULE_STATUS.CONFIRMED) return '查看 / 修改'
  return '去解析'
}

function open(u) {
  if (u.status === SCHEDULE_STATUS.NONE) return
  router.push({ name: 'admin-schedule-review', params: { key: u.key } })
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    users.value = await listScheduleUsers()
  } catch (err) {
    errorMessage.value = err?.message || '用户列表加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

async function resetUser(u) {
  if (resettingId.value) return
  if (!window.confirm(`重置会删除 ${u.nickname} 的课表和全部上传记录,不可恢复,确定吗?`)) return
  resettingId.value = u.key
  errorMessage.value = ''
  try {
    await resetSchedule(u.key)
    await load()
  } catch (err) {
    errorMessage.value = err?.message || '重置失败,请稍后重试'
  } finally {
    resettingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <section v-if="todoCount > 0 && !loading" class="queue-note">
    <span class="queue-note__icon"><AppIcon name="calendar" :size="22" /></span>
    <div><strong>{{ todoCount }} 位成员的课表待处理</strong><p>待解析的课表已排在列表前面。</p></div>
  </section>

  <section class="panel">
    <header class="panel__head"><h2 class="panel__title">成员课表</h2><span class="panel__hint">{{ rows.length }} 位成员</span></header>
    <div class="toolbar schedule-filters">
      <div class="tabs" role="group" aria-label="按课表状态筛选">
        <button
          v-for="t in TABS"
          :key="t.value"
          class="tabs__item"
          :class="{ 'is-active': tab === t.value }"
          type="button"
          :aria-pressed="tab === t.value"
          @click="tab = t.value"
        >
          {{ t.label }}
          <span class="tabs__count">{{ counts[t.value] || 0 }}</span>
        </button>
      </div>
      <span class="toolbar__spacer"></span>
      <SearchField v-model="keyword" placeholder="搜索昵称或账号" label="搜索用户" />
    </div>

    <p v-if="errorMessage" class="list-error" role="alert">
      {{ errorMessage }}
      <button class="link-btn" type="button" @click="load">重试</button>
    </p>

    <div class="table-wrap">
      <table class="table table--records" aria-label="成员课表">
        <thead>
          <tr>
            <th>用户</th>
            <th>课表状态</th>
            <th>上传次数</th>
            <th>最近上传</th>
            <th>已生效课程</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="table__empty" colspan="6">加载中…</td>
          </tr>
          <tr v-else-if="rows.length === 0">
            <td class="queue-empty" colspan="6"><EmptyState title="没有符合条件的成员" /></td>
          </tr>
          <template v-else>
            <tr
              v-for="u in rows"
              :key="u.key"
              class="row"
              :class="{ 'is-clickable': u.status !== SCHEDULE_STATUS.NONE }"
              @click="open(u)"
            >
              <td>
                <span class="person">
                  <span class="avatar" aria-hidden="true">{{ u.nickname.slice(0, 1) }}</span>
                  <span><strong class="person__name">{{ u.nickname }}</strong><small class="person__detail">{{ u.username }}</small></span>
                </span>
              </td>
              <td><StatusTag :status="u.status" /></td>
              <td>
                <span :class="u.upload_count >= u.max_uploads ? 'is-full' : 'table__muted'">
                  {{ u.upload_count }} / {{ u.max_uploads }}
                </span>
                <span v-if="u.upload_count >= u.max_uploads" class="tag tag--danger full-tag">已用完</span>
              </td>
              <td class="table__muted">
                <template v-if="u.last_uploaded_at">{{ formatRelative(u.last_uploaded_at) }}</template>
                <span v-else class="no-upload">尚未上传课表</span>
              </td>
              <td class="table__muted">{{ u.course_count ? `${u.course_count} 门` : '—' }}</td>
              <td>
                <div v-if="u.status !== SCHEDULE_STATUS.NONE" class="row__actions">
                  <button class="link-btn row__action" type="button" @click.stop="open(u)">
                    {{ actionLabel(u) }}
                  </button>
                  <button
                    class="link-btn link-btn--danger"
                    type="button"
                    :disabled="resettingId === u.key"
                    @click.stop="resetUser(u)"
                  >
                    {{ resettingId === u.key ? '重置中…' : '重置课表' }}
                  </button>
                </div>
                <span v-else class="table__muted">等待用户上传</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>

</template>

<style scoped>
.queue-note { display: flex; align-items: center; gap: 12px; padding: 15px 19px; background: #eaf0ff; border: 1px solid #d7e1ff; border-radius: var(--radius-lg); color: #233a91; }
.queue-note__icon { display: grid; flex: 0 0 auto; place-items: center; width: 39px; height: 39px; background: #dce5ff; border-radius: 11px; }
.queue-note strong { font-size: 14px; }
.queue-note p { margin: 2px 0 0; font-size: 12px; }
.tabs { display: flex; flex-wrap: wrap; gap: 3px; }
.tabs__item { display: flex; gap: 6px; align-items: center; min-height: 36px; padding: 5px 9px; border: 0; background: transparent; border-radius: 8px; color: var(--color-text-muted); font-size: 12px; font-weight: 650; cursor: pointer; }
.tabs__item:hover, .tabs__item.is-active { background: var(--color-accent-soft); color: var(--color-accent); }
.tabs__count { color: inherit; font-variant-numeric: tabular-nums; }
.row.is-clickable { cursor: pointer; }
.row__actions, .full-tag { white-space: nowrap; }
.row__actions { display: flex; gap: 4px; }
.full-tag { margin-inline-start: 5px; }
.is-full, .list-error { color: var(--color-danger); }
.list-error { display: flex; align-items: center; margin: 0 15px 12px; padding: 8px 12px; border-radius: var(--radius-md); background: var(--color-danger-bg); }
.queue-empty { padding-block: 0; }
@media (max-width: 650px) { .schedule-filters .toolbar__spacer { display: none; } }
</style>
