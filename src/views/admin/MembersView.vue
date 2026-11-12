<script setup>
import { computed, onMounted, ref } from 'vue'
import { getMembers, updateMemberStatus } from '@/api/admin'
import { USER_STATUS } from '@/constants/checkin'
import { ROLE, ROLE_LABELS } from '@/constants/role'

const members = ref([])
const loading = ref(false)
const errorMessage = ref('')
const keyword = ref('')
const statusFilter = ref('')
const pendingId = ref(null)

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
  <section class="panel">
    <div class="toolbar">
      <input
        v-model="keyword"
        class="control"
        type="search"
        placeholder="搜索昵称或账号"
        aria-label="搜索成员"
      />
      <select v-model="statusFilter" class="control" aria-label="按状态筛选">
        <option value="">全部状态</option>
        <option :value="USER_STATUS.ACTIVE">在职</option>
        <option :value="USER_STATUS.DISABLED">已禁用</option>
      </select>
      <span class="toolbar__spacer"></span>
      <span class="panel__hint">共 {{ filtered.length }} 人</span>
    </div>

    <p v-if="errorMessage" class="state-error" role="alert">{{ errorMessage }}</p>

    <div class="table-wrap">
      <table class="table">
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
            <td class="table__empty" colspan="6">没有符合条件的成员</td>
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
.state-error {
  margin: 0;
  padding: 9px 20px;
  font-size: 13px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
}
</style>
