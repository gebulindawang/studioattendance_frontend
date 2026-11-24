<script setup>
import { computed, onMounted, ref } from 'vue'
import { getCheckinRecords } from '@/api/admin'
import { CHECKIN_LABELS, CHECKIN_TONES } from '@/constants/checkin'

const records = ref([])
const loading = ref(false)
const errorMessage = ref('')
const keyword = ref('')
const statusFilter = ref('')
const dateFilter = ref('')

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return records.value
    .filter((r) => {
      if (dateFilter.value && r.checkin_date !== dateFilter.value) return false
      if (statusFilter.value !== '' && r.status !== Number(statusFilter.value)) return false
      if (kw && !r.nickname.toLowerCase().includes(kw)) return false
      return true
    })
    .sort((a, b) => b.checkin_date.localeCompare(a.checkin_date) || a.section - b.section)
})

function formatTime(value) {
  return value ? value.slice(11, 16) : '—'
}

function reset() {
  keyword.value = ''
  statusFilter.value = ''
  dateFilter.value = ''
}

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const data = await getCheckinRecords()
    records.value = data.records
  } catch (err) {
    errorMessage.value = err?.message || '记录加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <section class="panel">
    <div class="toolbar">
      <input v-model="dateFilter" class="control" type="date" aria-label="按日期筛选" />
      <input
        v-model="keyword"
        class="control"
        type="search"
        placeholder="搜索成员昵称"
        aria-label="搜索成员"
      />
      <select v-model="statusFilter" class="control" aria-label="按状态筛选">
        <option value="">全部状态</option>
        <option v-for="(label, value) in CHECKIN_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
      <button class="link-btn" type="button" @click="reset">重置</button>
      <span class="toolbar__spacer"></span>
      <span class="panel__hint">共 {{ filtered.length }} 条</span>
    </div>

    <p v-if="errorMessage" class="state-error" role="alert">{{ errorMessage }}</p>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>日期</th>
            <th>成员</th>
            <th>节次</th>
            <th>状态</th>
            <th>签到时间</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="table__empty" colspan="6">加载中…</td>
          </tr>
          <tr v-else-if="filtered.length === 0">
            <td class="table__empty" colspan="6">没有符合条件的记录</td>
          </tr>
          <template v-else>
            <tr v-for="r in filtered" :key="r.id">
              <td class="table__muted">{{ r.checkin_date }}</td>
              <td>
                <span class="avatar" aria-hidden="true">{{ r.nickname.slice(0, 1) }}</span>
                {{ r.nickname }}
              </td>
              <td class="table__muted">第 {{ r.section }} 节</td>
              <td>
                <span class="tag" :class="`tag--${CHECKIN_TONES[r.status]}`">
                  {{ CHECKIN_LABELS[r.status] }}
                </span>
              </td>
              <td class="table__muted">{{ formatTime(r.checkin_time) }}</td>
              <td class="table__muted">{{ r.remark || '—' }}</td>
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
