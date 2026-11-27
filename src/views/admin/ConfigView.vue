<script setup>
import AppIcon from '@/components/AppIcon.vue'
import { computed, onMounted, ref } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTermStore } from '@/stores/term'
import { ATTENDANCE_BLOCK_COUNT, SECTIONS_PER_BLOCK, formatSectionPair } from '@/utils/schedule'

const term = useTermStore()

const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)

const form = ref({
  startDate: '',
  endDate: '',
  totalWeeks: 0,
  blocks: [],
})

const pad = (n) => String(n).padStart(2, '0')

function toInputDate(date) {
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toDate(value) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''))
  if (!matched) return null
  return new Date(Number(matched[1]), Number(matched[2]) - 1, Number(matched[3]))
}

const sectionCount = ATTENDANCE_BLOCK_COUNT * SECTIONS_PER_BLOCK
const nextBlockIndex = computed(() => {
  const configured = new Set(form.value.blocks.map((block) => block.index))
  return Array.from({ length: ATTENDANCE_BLOCK_COUNT }, (_, i) => i + 1)
    .find((index) => !configured.has(index))
})

function syncFromStore() {
  const info = term.semester
  form.value = {
    startDate: toInputDate(info?.startDate),
    endDate: toInputDate(info?.endDate),
    totalWeeks: info?.totalWeeks ?? 0,
    blocks: term.blocks.map((b) => ({ ...b })),
  }
}

function validate() {
  const { startDate, endDate, totalWeeks, blocks } = form.value
  if (!startDate || !endDate) return '请填写学期起止日期'
  if (endDate < startDate) return '学期结束日期不能早于开始日期'
  const weeks = Number(totalWeeks)
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 30) return '总周数需为 1–30 的整数'
  if (!blocks.length) return '节次时间不能为空'
  for (const b of blocks) {
    if (!b.start || !b.end) return `${formatSectionPair(b.index)}的时间未填写`
    if (b.start >= b.end) return `${formatSectionPair(b.index)}的下课时间需晚于上课时间`
  }
  return ''
}

function addBlock() {
  const index = nextBlockIndex.value
  if (index === undefined) return
  form.value.blocks.push({ id: 0, index, start: '', end: '' })
  form.value.blocks.sort((a, b) => a.index - b.index)
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    await term.reload()
    syncFromStore()
  } catch (err) {
    loadError.value = err?.message || '加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

async function save() {
  if (saving.value) return
  saveError.value = ''
  saved.value = false

  const invalid = validate()
  if (invalid) {
    saveError.value = invalid
    return
  }

  saving.value = true
  try {
    await term.saveConfig({
      semester: {
        id: term.semester?.id ?? 0,
        startDate: toDate(form.value.startDate),
        endDate: toDate(form.value.endDate),
        totalWeeks: Number(form.value.totalWeeks),
      },
      blocks: form.value.blocks,
    })
    syncFromStore()
    saved.value = true
  } catch (err) {
    saveError.value = err?.message || '保存失败,请稍后重试'
  } finally {
    saving.value = false
  }
}

function resetForm() {
  syncFromStore()
  saveError.value = ''
  saved.value = false
}

onMounted(load)
</script>

<template>
  <section v-if="loading" class="panel">
    <p class="loading"><span class="spinner" aria-hidden="true"></span>加载中…</p>
  </section>

  <section v-else-if="loadError" class="panel">
    <EmptyState title="配置加载失败" :description="loadError">
      <button class="btn btn--sm" type="button" @click="load">重新加载</button>
    </EmptyState>
  </section>

  <template v-else>
    <p v-if="saveError" class="notice notice--danger" role="alert">
      <span class="notice__body">{{ saveError }}</span>
    </p>
    <p v-else-if="saved" class="notice notice--ok" role="status">
      <span class="notice__body">学期与节次配置已保存。</span>
    </p>

    <form class="page-stack config-form" novalidate @submit.prevent="save">
      <section class="panel">
        <header class="panel__head">
          <div class="config-heading"><span><AppIcon name="calendar" /></span><div><h2 class="panel__title">学期规则</h2>
            <p class="panel__hint">设定教学周的计算范围。</p></div></div>
        </header>
        <div class="cfg__row">
          <label class="cfg__field">
            <span class="cfg__label">开始日期</span>
            <input v-model="form.startDate" class="control" type="date" />
          </label>
          <label class="cfg__field">
            <span class="cfg__label">结束日期</span>
            <input v-model="form.endDate" class="control" type="date" />
          </label>
          <label class="cfg__field">
            <span class="cfg__label">总周数</span>
            <input v-model.number="form.totalWeeks" class="control" type="number" min="1" max="30" />
          </label>
        </div>
      </section>

      <section class="panel">
        <header class="panel__head">
          <div class="config-heading"><span><AppIcon name="clock" /></span><div><h2 class="panel__title">节次时间</h2>
            <p class="panel__hint">第 1–{{ sectionCount }} 节，每 {{ SECTIONS_PER_BLOCK }} 节共用一组时间。</p></div></div>
        </header>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>节次</th>
                <th>上课时间</th>
                <th>下课时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="form.blocks.length === 0">
                <td class="table__empty" colspan="3">暂无节次数据</td>
              </tr>
              <tr v-for="b in form.blocks" :key="b.index">
                <td class="table__muted">{{ formatSectionPair(b.index) }}</td>
                <td>
                  <input v-model="b.start" class="control cfg__time" type="time" step="60" aria-label="上课时间" />
                </td>
                <td>
                  <input v-model="b.end" class="control cfg__time" type="time" step="60" aria-label="下课时间" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="cfg__block-actions">
          <button class="btn btn--sm btn--secondary" type="button"
            :disabled="saving || nextBlockIndex === undefined" @click="addBlock">
            添加节次
          </button>
        </div>
      </section>

      <footer class="panel cfg__actions">
        <button class="btn btn--secondary" type="button" :disabled="saving" @click="resetForm">撤销修改</button>
        <button class="btn" type="submit" :disabled="saving">
          <span v-if="saving" class="btn__spinner" aria-hidden="true"></span>
          <AppIcon v-else name="check" :size="16" />{{ saving ? '保存中…' : '保存配置' }}
        </button>
      </footer>
    </form>
  </template>
</template>

<style scoped>
.config-form { max-width: 920px; }
.config-heading { display: flex; align-items: center; gap: 12px; }
.config-heading > span { display: grid; place-items: center; width: 37px; height: 37px; border-radius: 10px; background: var(--color-accent-soft); color: var(--color-accent); }
.config-heading p { margin: 3px 0 0; }
.cfg__row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; padding: 0 22px 20px; }
.cfg__field { display: grid; gap: 6px; min-width: 0; }
.cfg__label { color: var(--color-text-muted); font-size: 13px; }
.cfg__time { width: min(110px, 100%); font-variant-numeric: tabular-nums; }
.cfg__block-actions { padding: 13px 22px; border-top: 1px solid var(--color-border); }
.cfg__actions { display: flex; justify-content: end; gap: 8px; padding: 14px 18px; }
.loading { display: flex; align-items: center; justify-content: center; gap: 9px; margin: 0; padding: 52px 0; color: var(--color-text-muted); }
@media (max-width: 680px) { .cfg__row { grid-template-columns: minmax(0, 1fr); padding-inline: 16px; } .cfg__time { width: 100%; max-width: 110px; } .table th, .table td { padding-inline: 7px; } }
</style>
