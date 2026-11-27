<script setup>
import SearchField from '@/components/SearchField.vue'
import MetricCard from '@/components/MetricCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { computed, onMounted, ref } from 'vue'
import { getMembers, updateMemberStatus } from '@/api/admin'
import { USER_STATUS } from '@/constants/checkin'
import { ROLE, ROLE_LABELS } from '@/constants/role'

const members = ref([])
const loading = ref(true)
const errorMessage = ref('')
const keyword = ref('')
const statusFilter = ref('')
const pendingId = ref(null)
const activeCount = computed(() => members.value.filter((member) => member.status === USER_STATUS.ACTIVE).length)
const adminCount = computed(() => members.value.filter((member) => member.role === ROLE.ADMIN).length)

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return members.value.filter((m) => {
    if (statusFilter.value !== '' && m.status !== Number(statusFilter.value)) return false
    if (!kw) return true
    return m.nickname.toLowerCase().includes(kw) || m.username.toLowerCase().includes(kw)
  })
})

function formatDate(value) {
  return value ? value.slice(0, 10) : '—'
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    members.value = await getMembers()
  } catch (err) {
    errorMessage.value = err?.message || '成员加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

async function toggleStatus(member) {
  if (pendingId.value) return
  const next = member.status === USER_STATUS.ACTIVE ? USER_STATUS.DISABLED : USER_STATUS.ACTIVE
  pendingId.value = member.id
  try {
    await updateMemberStatus(member.id, next)
    member.status = next
  } catch (err) {
    errorMessage.value = err?.message || '操作失败,请稍后重试'
  } finally {
    pendingId.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="directory-metrics" aria-label="成员统计">
    <MetricCard label="全部账号" icon="users" :value="loading ? '—' : members.length" />
    <MetricCard label="在职账号" icon="checkCircle" tone="green" :value="loading ? '—' : activeCount" />
    <MetricCard label="管理员" icon="user" tone="slate" :value="loading ? '—' : adminCount" />
  </div>
  <section class="panel">
    <header class="panel__head"><h2 class="panel__title">成员名录</h2><span class="panel__hint">{{ filtered.length }} 个账号</span></header>
    <div class="toolbar">
      <SearchField v-model="keyword" placeholder="搜索昵称或账号" label="搜索成员" />
      <select v-model="statusFilter" class="control" aria-label="按状态筛选">
        <option value="">全部状态</option>
        <option :value="USER_STATUS.ACTIVE">在职</option>
        <option :value="USER_STATUS.DISABLED">已禁用</option>
      </select>
    </div>

    <p v-if="errorMessage" class="notice notice--danger directory-error" role="alert">
      <span class="notice__body">{{ errorMessage }}</span><button class="link-btn" type="button" @click="load">重试</button>
    </p>

    <div class="table-wrap">
      <table class="table table--records" aria-label="成员名录">
        <thead>
          <tr>
            <th>成员</th>
            <th>账号</th>
            <th>角色</th>
            <th>状态</th>
            <th>加入时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="table__empty" colspan="6">加载中…</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td class="directory-empty" colspan="6"><EmptyState icon="users" title="没有符合条件的成员" /></td>
          </tr>
          <template v-else>
            <tr v-for="m in filtered" :key="m.id">
              <td>
                <span class="avatar" aria-hidden="true">{{ m.nickname.slice(0, 1) }}</span>
                {{ m.nickname }}
              </td>
              <td class="table__muted">{{ m.username }}</td>
              <td>
                <span class="tag" :class="m.role === ROLE.ADMIN ? 'tag--accent' : 'tag--muted'">
                  {{ ROLE_LABELS[m.role] }}
                </span>
              </td>
              <td>
                <span class="tag" :class="m.status === USER_STATUS.ACTIVE ? 'tag--ok' : 'tag--danger'">
                  {{ m.status === USER_STATUS.ACTIVE ? '在职' : '已禁用' }}
                </span>
              </td>
              <td class="table__muted">{{ formatDate(m.created_at) }}</td>
              <td>
                <button
                  class="link-btn"
                  :class="{ 'link-btn--danger': m.status === USER_STATUS.ACTIVE }"
                  type="button"
                  :disabled="m.role === ROLE.ADMIN || pendingId === m.id"
                  @click="toggleStatus(m)"
                >
                  {{ m.status === USER_STATUS.ACTIVE ? '禁用' : '启用' }}
                </button>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.directory-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.directory-error { margin: 0 14px 12px; }
.directory-empty { padding-block: 0; }
@media (max-width: 620px) { .directory-metrics { gap: 7px; } }
</style>
