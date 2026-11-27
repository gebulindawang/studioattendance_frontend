<script setup>
import SearchField from '@/components/SearchField.vue'
import AppIcon from '@/components/AppIcon.vue'
import { computed, onMounted, ref } from 'vue'
import { getCheckinRecords, getMembers } from '@/api/admin'
import { generateWeekAttendance } from '@/api/checkin'
import { CHECKIN_LABELS, CHECKIN_TONES, GENERATION_LABELS, USER_STATUS } from '@/constants/checkin'
import { ROLE } from '@/constants/role'
import { formatAttendanceSection } from '@/utils/checkin'

const records = ref([])
const loading = ref(false)
const errorMessage = ref('')
const keyword = ref('')
const statusFilter = ref('')
const dateFilter = ref('')
const members = ref([])
const selectedIds = ref([])
const generating = ref(false)
const generationError = ref('')
const generation = ref(null)
const selectedMembers = computed(() => new Map(members.value.map((member) => [member.id, member])))
const skipped = computed(() => generation.value?.members.filter((member) => member.state !== 'ready') ?? [])
const statusOptions = computed(() =>
  Object.entries(CHECKIN_LABELS).filter(([value]) => records.value.some((record) => record.status === Number(value))),
)

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

async function loadMembers() {
  try {
    const accounts = await getMembers()
    members.value = accounts.filter((member) => member.role === ROLE.MEMBER && member.status === USER_STATUS.ACTIVE)
    selectedIds.value = members.value.map((member) => member.id)
  } catch (err) {
    generationError.value = err?.message || '成员加载失败'
  }
}

async function generate() {
  if (generating.value || !selectedIds.value.length) return
  generating.value = true
  generationError.value = ''
  generation.value = null
  try {
    generation.value = await generateWeekAttendance(selectedIds.value)
    await load()
  } catch (err) {
    generationError.value = err?.message || '本周签到表生成失败'
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  load()
  loadMembers()
})
</script>

<template>
  <section class="panel generation">
    <header class="panel__head">
      <div class="generation__heading">
        <span class="generation__icon"><AppIcon name="calendarCheck" :size="24" /></span>
        <div><h2 class="panel__title">本周签到表</h2><p>为已确认课表的成员生成本周可签到时段。</p></div>
      </div>
      <button class="btn btn--sm" type="button" :disabled="generating || !selectedIds.length" @click="generate">
        {{ generating ? '生成中…' : '生成所选成员的签到表' }}
      </button>
    </header>
    <details v-if="members.length" class="generation__members">
      <summary>成员范围 <span>已选 {{ selectedIds.length }} / {{ members.length }} 位</span></summary>
      <div class="generation__choices">
        <label v-for="member in members" :key="member.id">
          <input v-model="selectedIds" type="checkbox" :value="member.id" :disabled="generating" />
          {{ member.nickname }}
        </label>
      </div>
    </details>
    <p v-if="generationError" class="state-error" role="alert">{{ generationError }}</p>
    <div v-if="generation" class="generation__result" role="status">
      <p>
        {{ generation.week_start }} 当周新增 {{ generation.added }} 格，
        调整 {{ generation.updated }} 格，移除 {{ generation.removed }} 格。
      </p>
      <ul v-if="skipped.length">
        <li v-for="member in skipped" :key="member.user_id">
          {{ selectedMembers.get(member.user_id)?.nickname || `成员 ${member.user_id}` }} ·
          {{ GENERATION_LABELS[member.state] }}
        </li>
      </ul>
    </div>
  </section>

  <section class="panel">
    <header class="panel__head"><h2 class="panel__title">签到明细</h2><span class="panel__hint">{{ filtered.length }} 条记录</span></header>
    <div class="toolbar">
      <input v-model="dateFilter" class="control" type="date" aria-label="按日期筛选" />
      <SearchField v-model="keyword" placeholder="搜索成员昵称" label="搜索成员" />
      <select v-model="statusFilter" class="control" aria-label="按状态筛选">
        <option value="">全部状态</option>
        <option v-for="[value, label] in statusOptions" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
      <button class="link-btn" type="button" @click="reset">重置</button>

    </div>

    <p v-if="errorMessage" class="notice notice--danger records-error" role="alert">
      <span class="notice__body">{{ errorMessage }}</span><button class="link-btn" type="button" @click="load">重试</button>
    </p>

    <div class="table-wrap">
      <table class="table table--records" aria-label="签到明细">
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
              <td class="table__muted">{{ formatAttendanceSection(r) }}</td>
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
.generation { background: linear-gradient(110deg, #fff 40%, #edf1ff); border-color: #dbe2fc; }
.generation__heading { display: flex; gap: 12px; align-items: center; }
.generation__heading p { margin: 4px 0 0; color: var(--color-text-muted); font-size: 12px; }
.generation__icon { display: grid; flex: 0 0 auto; place-items: center; width: 47px; height: 47px; border-radius: 13px; color: var(--color-accent); background: #e7ecff; }
.generation__members, .generation__result { margin: 0 22px 16px; padding: 10px 12px; background: #fff; border: 1px solid var(--color-border); border-radius: 10px; }
.generation__members summary { cursor: pointer; font-weight: 650; color: var(--color-text); }
.generation__members summary span { color: var(--color-text-muted); margin-inline-start: 5px; font-weight: 400; font-size: 12px; }
.generation__choices { display: flex; flex-wrap: wrap; gap: 7px 13px; max-height: 170px; overflow: auto; padding-top: 12px; }
.generation__choices label { display: inline-flex; align-items: center; gap: 5px; }
.generation__choices input { accent-color: var(--color-accent); }
.generation__result p, .generation__result ul { margin: 4px 0; }
.state-error { margin: 0 22px 12px; color: var(--color-danger); }
.records-error { margin: 0 14px 12px; }
</style>
