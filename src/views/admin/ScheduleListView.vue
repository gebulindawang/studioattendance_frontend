<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import StatusTag from '@/components/StatusTag.vue'
import { listScheduleUsers, resetMockData, resetSchedule } from '@/api/adminSchedule'
import { MOCK } from '@/api/mockConfig'
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

function resetDemo() {
  if (!window.confirm('这会清除所有演示数据并恢复到初始状态,确定吗?')) return
  resetMockData()
  load()
}

onMounted(load)
</script>

<template>
  <section v-if="todoCount > 0 && !loading" class="notice notice--warn todo">
    <span class="notice__body">
      有 <strong>{{ todoCount }}</strong> 位用户的课表等待你处理,已排在列表最前面。
    </span>
  </section>

  <section class="panel">
    <div class="toolbar">
      <div class="tabs" role="tablist" aria-label="按课表状态筛选">
        <button
          v-for="t in TABS"
          :key="t.value"
          class="tabs__item"
          :class="{ 'is-active': tab === t.value }"
          type="button"
          role="tab"
          :aria-selected="tab === t.value"
          @click="tab = t.value"
        >
          {{ t.label }}
          <span class="tabs__count">{{ counts[t.value] || 0 }}</span>
        </button>
      </div>
      <span class="toolbar__spacer"></span>
      <input
        v-model="keyword"
        class="control"
        type="search"
        placeholder="搜索昵称或账号"
        aria-label="搜索用户"
      />
    </div>

    <p v-if="errorMessage" class="list-error" role="alert">
      {{ errorMessage }}
      <button class="link-btn" type="button" @click="load">重试</button>
    </p>

    <div class="table-wrap">
      <table class="table">
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
            <td class="table__empty" colspan="6">没有符合条件的用户</td>
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
                <span class="avatar" aria-hidden="true">{{ u.nickname.slice(0, 1) }}</span>
                {{ u.nickname }}
                <span class="table__muted username">{{ u.username }}</span>
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

  <p v-if="MOCK.admin" class="demo">
    人员为真实数据,课表状态为演示数据,保存在浏览器本地。
    <button class="link-btn" type="button" @click="resetDemo">重置演示数据</button>
  </p>
</template>

<style scoped>
.todo {
  margin-bottom: 16px;
}

.tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
}

.tabs__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--color-text-muted);
  background: none;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.tabs__item:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.tabs__item.is-active {
  background: #f4e2da;
  color: #85402a;
  font-weight: 500;
}

.tabs__item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.tabs__count {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
}

.list-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 9px 20px;
  font-size: 13px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

.username {
  margin-left: 8px;
  font-size: 12px;
}

.row.is-clickable {
  cursor: pointer;
}

.is-full {
  color: var(--color-danger);
  font-weight: 500;
}

.full-tag {
  margin-left: 8px;
}

.no-upload {
  color: var(--color-text-faint);
}

.row__action {
  color: var(--color-accent);
  font-weight: 500;
}

.row__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}

.demo {
  margin: 14px 4px 0;
  font-size: 13px;
  color: var(--color-text-faint);
}
</style>
