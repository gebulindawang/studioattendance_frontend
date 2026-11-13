<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ScheduleTable from '@/components/ScheduleTable.vue'
import StatusTag from '@/components/StatusTag.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  clearParseState,
  confirmSchedule,
  getParseState,
  getScheduleUserDetail,
  startScheduleParse,
} from '@/api/adminSchedule'
import { SCHEDULE_STATUS } from '@/constants/scheduleStatus'
import { formatDateTime } from '@/utils/format'
import {
  MAX_WEEK,
  SECTIONS,
  SEMESTER_START,
  WEEKDAY_LABELS,
  WEEK_TYPE_LABELS,
  addDays,
  getMonday,
  getWeekNumber,
  isCourseInWeek,
  validateCourse,
} from '@/utils/schedule'

const LOW_CONFIDENCE = 0.8

const route = useRoute()
const userKey = route.params.key

const detail = ref(null)
const loading = ref(true)
const loadError = ref('')

const phase = ref('idle')
const recognizeError = ref('')
const draft = ref([])
const viewMode = ref('edit')
const confirmChecked = ref(false)
const saving = ref(false)
const saveError = ref('')
const savedNow = ref(false)

const uploadIndex = ref(0)
const lightbox = ref(false)

const previewWeek = ref(Math.min(Math.max(getWeekNumber(new Date()), 1), MAX_WEEK))

let keyCounter = 0
let alive = true

const uploads = computed(() => detail.value?.uploads ?? [])
const currentUpload = computed(() => uploads.value[uploadIndex.value])
const rowErrors = computed(() => draft.value.map(validateCourse))
const errorCount = computed(() => rowErrors.value.filter((e) => Object.keys(e).length > 0).length)
const lowCount = computed(() => draft.value.filter(needsCheck).length)
const canConfirm = computed(
  () => confirmChecked.value && errorCount.value === 0 && draft.value.length > 0 && !saving.value,
)
const hasEffective = computed(() => (detail.value?.courses.length ?? 0) > 0)

const previewMonday = computed(() =>
  addDays(getMonday(SEMESTER_START), (previewWeek.value - 1) * 7),
)

const previewCourses = computed(() => {
  const source =
    phase.value === 'saved'
      ? detail.value.courses.map((c) => ({ ...c }))
      : draft.value.filter((_, i) => Object.keys(rowErrors.value[i]).length === 0).map((c) => ({ ...c, id: c._k }))
  return source
    .filter((c) => isCourseInWeek(c, previewWeek.value))
    .map((c) => ({ ...c, course_name: c.course_name || '(未命名)' }))
})

function needsCheck(c) {
  return c.confidence !== undefined && c.confidence < LOW_CONFIDENCE && !c._touched
}

function toDraft(c) {
  return { ...c, _k: ++keyCounter, _touched: false }
}

function touch(c) {
  c._touched = true
}

function initPhase() {
  phase.value = detail.value.status === SCHEDULE_STATUS.CONFIRMED ? 'saved' : 'idle'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    detail.value = await getScheduleUserDetail(userKey)
    uploadIndex.value = Math.max(detail.value.uploads.length - 1, 0)
    initPhase()
    restoreParse()
  } catch (err) {
    loadError.value = err?.message || '加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

function applyParseResult(courses) {
  draft.value = courses.map(toDraft)
  confirmChecked.value = false
  viewMode.value = 'edit'
  phase.value = 'review'
}

// 页面切换后再回来:接上仍在进行的解析,或直接恢复已完成/失败的结果
function restoreParse() {
  const state = getParseState(userKey)
  if (!state) return
  if (state.status === 'done') {
    applyParseResult(state.result)
    return
  }
  if (state.status === 'error') {
    recognizeError.value = state.error?.message || '解析失败,请稍后重试'
    phase.value = 'failed'
    return
  }
  phase.value = 'recognizing'
  state.promise.then((result) => {
    if (!alive) return
    applyParseResult(result)
  }).catch((err) => {
    if (!alive) return
    recognizeError.value = err?.message || '解析失败,请稍后重试'
    phase.value = 'failed'
  })
}

async function recognize() {
  phase.value = 'recognizing'
  recognizeError.value = ''
  saveError.value = ''
  savedNow.value = false
  const state = startScheduleParse(userKey)
  try {
    const result = await state.promise
    if (!alive) return
    applyParseResult(result)
  } catch (err) {
    if (!alive) return
    recognizeError.value = err?.message || '解析失败,请稍后重试'
    phase.value = 'failed'
  }
}

function editExisting() {
  draft.value = detail.value.courses.map(toDraft)
  confirmChecked.value = false
  viewMode.value = 'edit'
  saveError.value = ''
  savedNow.value = false
  phase.value = 'review'
}

function discard() {
  if (!window.confirm('放弃当前的解析和修改结果吗?')) return
  clearParseState(userKey)
  draft.value = []
  saveError.value = ''
  initPhase()
}

function addCourse() {
  draft.value.push({
    course_name: '',
    location: '',
    weekday: 1,
    start_section: 1,
    end_section: 2,
    start_week: 1,
    end_week: 16,
    week_type: 0,
    _k: ++keyCounter,
    _touched: true,
  })
  confirmChecked.value = false
}

function removeCourse(index) {
  draft.value.splice(index, 1)
  confirmChecked.value = false
}

async function save() {
  if (!canConfirm.value) return
  saving.value = true
  saveError.value = ''
  try {
    const payload = draft.value.map((c) => ({
      course_name: c.course_name,
      location: c.location,
      weekday: c.weekday,
      start_section: c.start_section,
      end_section: c.end_section,
      start_week: c.start_week,
      end_week: c.end_week,
      week_type: c.week_type,
    }))
    detail.value = await confirmSchedule(userKey, payload)
    clearParseState(userKey)
    draft.value = []
    savedNow.value = true
    phase.value = 'saved'
  } catch (err) {
    saveError.value = err?.message || '保存失败,请稍后重试'
  } finally {
    saving.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') lightbox.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  load()
})

onBeforeUnmount(() => {
  alive = false
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <RouterLink class="back" :to="{ name: 'admin-schedules' }">
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m15 18-6-6 6-6" />
    </svg>
    返回课表管理
  </RouterLink>

  <section v-if="loading" class="panel">
    <p class="loading"><span class="spinner" aria-hidden="true"></span>加载中…</p>
  </section>

  <section v-else-if="loadError" class="panel">
    <EmptyState title="加载失败" :description="loadError">
      <button class="btn btn--sm" type="button" @click="load">重新加载</button>
    </EmptyState>
  </section>

  <template v-else>
    <section class="panel user">
      <div class="user__main">
        <span class="avatar avatar--lg" aria-hidden="true">{{ detail.nickname.slice(0, 1) }}</span>
        <div>
          <p class="user__name">{{ detail.nickname }}</p>
          <p class="user__sub">{{ detail.username }}</p>
        </div>
        <StatusTag :status="detail.status" />
      </div>
      <dl class="user__meta">
        <div>
          <dt>上传次数</dt>
          <dd :class="{ 'is-full': detail.upload_count >= detail.max_uploads }">
            {{ detail.upload_count }} / {{ detail.max_uploads }}
          </dd>
        </div>
        <div>
          <dt>最近上传</dt>
          <dd>{{ formatDateTime(detail.last_uploaded_at) }}</dd>
        </div>
        <div>
          <dt>上次确认</dt>
          <dd>{{ formatDateTime(detail.confirmed_at) }}</dd>
        </div>
      </dl>
    </section>

    <div class="top">
      <section class="panel viewer">
        <header class="panel__head">
          <h2 class="panel__title">用户上传的课表图片</h2>
          <span v-if="uploads.length" class="panel__hint">第 {{ uploadIndex + 1 }} / {{ uploads.length }} 次</span>
        </header>

        <div v-if="currentUpload" class="viewer__body">
          <button class="viewer__stage" type="button" aria-label="查看大图" @click="lightbox = true">
            <img :src="currentUpload.url" alt="用户上传的课表" />
            <span class="viewer__zoom">点击查看大图</span>
          </button>
          <p class="viewer__time">上传于 {{ formatDateTime(currentUpload.uploaded_at) }}</p>

          <div v-if="uploads.length > 1" class="viewer__thumbs">
            <button
              v-for="(u, i) in uploads"
              :key="u.id"
              class="thumb"
              :class="{ 'is-active': i === uploadIndex }"
              type="button"
              :aria-label="`查看第 ${i + 1} 次上传`"
              @click="uploadIndex = i"
            >
              <img :src="u.url" alt="" />
              <span v-if="i === uploads.length - 1" class="thumb__latest">最新</span>
            </button>
          </div>
        </div>
        <p v-else class="viewer__empty">该用户还没有上传课表图片</p>
      </section>

      <section class="panel flow">
        <header class="panel__head">
          <h2 class="panel__title">课表解析</h2>
          <span class="panel__hint">AI 解析</span>
        </header>

        <div class="flow__body">
          <template v-if="phase === 'idle'">
            <p class="flow__text">
              点击开始后,AI 会读取课表图片并整理成结构化的课程数据。
              解析结果<strong>不会直接生效</strong>,需要你逐条核对并确认后才会保存。
            </p>
            <p v-if="hasEffective" class="notice notice--warn">
              <span class="notice__body">
                该用户已有 {{ detail.courses.length }} 门生效课程,确认新的解析结果后会被覆盖。
              </span>
            </p>
            <button class="btn btn--sm flow__btn" type="button" @click="recognize">开始解析</button>
          </template>

          <template v-else-if="phase === 'recognizing'">
            <p class="flow__parsing" aria-live="polite">
              <span class="spinner" aria-hidden="true"></span>
              AI 正在解析课表图片…
            </p>
            <p class="flow__hint">AI 解析通常需要十几秒,请稍候…</p>
          </template>

          <template v-else-if="phase === 'failed'">
            <p class="notice notice--danger" role="alert">
              <span class="notice__body"><strong>解析失败</strong><br />{{ recognizeError }}</span>
            </p>
            <button class="btn btn--sm flow__btn" type="button" @click="recognize">重新解析</button>
          </template>

          <template v-else-if="phase === 'review'">
            <p class="flow__text">
              共解析出 <strong>{{ draft.length }}</strong> 门课程。请对照左侧图片逐条核对,可直接修改、删除或补充课程。
            </p>
            <p v-if="lowCount > 0" class="notice notice--warn">
              <span class="notice__body">
                有 <strong>{{ lowCount }}</strong> 条课程置信度较低,已在下方标出,请重点核对。
              </span>
            </p>
            <p v-if="errorCount > 0" class="notice notice--danger">
              <span class="notice__body">有 {{ errorCount }} 条课程信息不合法,修正后才能确认。</span>
            </p>
          </template>

          <template v-else-if="phase === 'saved'">
            <p v-if="savedNow" class="notice notice--ok" role="status">
              <span class="notice__body">已确认并保存。用户现在可以在“我的课表”中查看这份课表。</span>
            </p>
            <p v-else class="flow__text">
              该课表已于 {{ formatDateTime(detail.confirmed_at) }} 确认生效,共 {{ detail.courses.length }} 门课程。
            </p>
            <div class="flow__row">
              <button class="btn btn--sm btn--secondary" type="button" @click="editExisting">编辑当前课表</button>
              <button class="btn btn--sm btn--secondary" type="button" @click="recognize">重新解析</button>
            </div>
          </template>
        </div>
      </section>
    </div>

    <section v-if="phase === 'review' || phase === 'saved'" class="panel courses">
      <header class="panel__head">
        <h2 class="panel__title">
          {{ phase === 'review' ? '解析结果 · 人工校对' : '当前生效的课表' }}
        </h2>
        <div class="courses__tools">
          <div v-if="phase === 'review'" class="seg" role="tablist">
            <button class="seg__item" :class="{ 'is-active': viewMode === 'edit' }" type="button" role="tab" :aria-selected="viewMode === 'edit'" @click="viewMode = 'edit'">校对</button>
            <button class="seg__item" :class="{ 'is-active': viewMode === 'preview' }" type="button" role="tab" :aria-selected="viewMode === 'preview'" @click="viewMode = 'preview'">课表预览</button>
          </div>
          <label v-if="phase === 'saved' || viewMode === 'preview'" class="week-pick">
            预览周次
            <select v-model.number="previewWeek" class="control">
              <option v-for="w in MAX_WEEK" :key="w" :value="w">第 {{ w }} 周</option>
            </select>
          </label>
        </div>
      </header>

      <div v-if="phase === 'saved' || viewMode === 'preview'" class="courses__preview">
        <ScheduleTable :courses="previewCourses" :monday="previewMonday" :week="previewWeek" />
        <p v-if="phase === 'review' && errorCount > 0" class="flow__hint">
          预览中不包含信息不合法的课程,请先在“校对”里修正。
        </p>
      </div>

      <template v-else>
        <div class="table-wrap">
          <table class="table edit">
            <thead>
              <tr>
                <th>#</th>
                <th>课程名称</th>
                <th>上课地点</th>
                <th>星期</th>
                <th>节次</th>
                <th>周数</th>
                <th>周类型</th>
                <th><span class="sr-only">操作</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="draft.length === 0">
                <td class="table__empty" colspan="8">暂无课程,请点击下方“添加课程”</td>
              </tr>
              <template v-for="(c, i) in draft" :key="c._k">
                <tr :class="{ 'is-flag': needsCheck(c), 'is-invalid': Object.keys(rowErrors[i]).length }">
                  <td class="table__muted">{{ i + 1 }}</td>
                  <td class="col-name">
                    <input
                      v-model="c.course_name"
                      class="control cell"
                      :class="{ 'has-error': rowErrors[i].course_name }"
                      type="text"
                      placeholder="课程名称"
                      aria-label="课程名称"
                      @input="touch(c)"
                    />
                    <span v-if="needsCheck(c)" class="flag">待核对 · 置信度 {{ Math.round(c.confidence * 100) }}%</span>
                  </td>
                  <td class="col-loc">
                    <input v-model="c.location" class="control cell" type="text" placeholder="未识别到地点" aria-label="上课地点" @input="touch(c)" />
                  </td>
                  <td>
                    <select v-model.number="c.weekday" class="control cell" aria-label="星期" @change="touch(c)">
                      <option v-for="(label, d) in WEEKDAY_LABELS" :key="label" :value="d + 1">周{{ label }}</option>
                    </select>
                  </td>
                  <td>
                    <span class="range" :class="{ 'has-error': rowErrors[i].sections }">
                      <select v-model.number="c.start_section" class="control cell" aria-label="开始节次" @change="touch(c)">
                        <option v-for="s in SECTIONS" :key="s.index" :value="s.index">{{ s.index }}</option>
                      </select>
                      <span class="range__sep">–</span>
                      <select v-model.number="c.end_section" class="control cell" aria-label="结束节次" @change="touch(c)">
                        <option v-for="s in SECTIONS" :key="s.index" :value="s.index">{{ s.index }}</option>
                      </select>
                    </span>
                  </td>
                  <td>
                    <span class="range" :class="{ 'has-error': rowErrors[i].weeks }">
                      <input v-model.number="c.start_week" class="control cell cell--num" type="number" min="1" :max="MAX_WEEK" aria-label="起始周" @input="touch(c)" />
                      <span class="range__sep">–</span>
                      <input v-model.number="c.end_week" class="control cell cell--num" type="number" min="1" :max="MAX_WEEK" aria-label="结束周" @input="touch(c)" />
                    </span>
                  </td>
                  <td>
                    <select v-model.number="c.week_type" class="control cell" aria-label="周类型" @change="touch(c)">
                      <option v-for="(label, v) in WEEK_TYPE_LABELS" :key="v" :value="Number(v)">{{ label }}</option>
                    </select>
                  </td>
                  <td>
                    <button class="link-btn link-btn--danger" type="button" @click="removeCourse(i)">删除</button>
                  </td>
                </tr>
                <tr v-if="Object.keys(rowErrors[i]).length" class="err-row">
                  <td></td>
                  <td colspan="7">第 {{ i + 1 }} 条:{{ Object.values(rowErrors[i]).join(';') }}</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="courses__add">
          <button class="btn btn--sm btn--secondary" type="button" @click="addCourse">+ 添加课程</button>
        </div>
      </template>

      <footer v-if="phase === 'review'" class="confirm">
        <p v-if="saveError" class="notice notice--danger" role="alert">
          <span class="notice__body">{{ saveError }}</span>
        </p>
        <label class="check confirm__check">
          <input v-model="confirmChecked" class="check__input" type="checkbox" />
          <span class="check__box" aria-hidden="true"></span>
          <span>我已对照原图逐条核对,以上课程信息准确无误</span>
        </label>
        <div class="confirm__actions">
          <button class="btn btn--sm btn--secondary" type="button" :disabled="saving" @click="discard">放弃本次结果</button>
          <button class="btn btn--sm" type="button" :disabled="!canConfirm" @click="save">
            <span v-if="saving" class="btn__spinner" aria-hidden="true"></span>
            {{ saving ? '保存中…' : '确认并保存' }}
          </button>
        </div>
      </footer>
    </section>
  </template>

  <div v-if="lightbox && currentUpload" class="lightbox" role="dialog" aria-modal="true" aria-label="课表大图" @click="lightbox = false">
    <img :src="currentUpload.url" alt="用户上传的课表大图" @click.stop />
    <button class="lightbox__close" type="button" aria-label="关闭" @click="lightbox = false">×</button>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 14px;
  font-size: 14px;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 0.15s ease;
}

.back:hover {
  color: var(--color-accent);
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
  padding: 48px 0;
  color: var(--color-text-muted);
}

.panel + .panel,
.top,
.top + .panel {
  margin-top: 16px;
}

.user {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding: 16px 20px;
}

.user__main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar--lg {
  width: 40px;
  height: 40px;
  margin-right: 0;
  font-size: 16px;
}

.user__name {
  margin: 0;
  font-weight: 500;
}

.user__sub {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-faint);
}

.user__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 32px;
  margin: 0;
}

.user__meta dt {
  font-size: 12px;
  color: var(--color-text-faint);
}

.user__meta dd {
  margin: 2px 0 0;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.user__meta dd.is-full {
  color: var(--color-danger);
  font-weight: 500;
}

.top {
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  gap: 16px;
  align-items: start;
}

.top > .panel {
  margin-top: 0;
}

.viewer__body {
  padding: 16px 20px 20px;
}

.viewer__stage {
  position: relative;
  display: block;
  width: 100%;
  height: 360px;
  padding: 0;
  overflow: hidden;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: zoom-in;
}

.viewer__stage img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.viewer__zoom {
  position: absolute;
  right: 10px;
  bottom: 10px;
  padding: 3px 10px;
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.viewer__time {
  margin: 10px 0 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.viewer__thumbs {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.thumb {
  position: relative;
  width: 56px;
  height: 72px;
  padding: 0;
  overflow: hidden;
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  opacity: 0.7;
  transition:
    opacity 0.15s ease,
    border-color 0.15s ease;
}

.thumb:hover {
  opacity: 1;
}

.thumb.is-active {
  border-color: var(--color-accent);
  opacity: 1;
}

.thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}

.thumb__latest {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  font-size: 10px;
  line-height: 16px;
  color: #fff;
  text-align: center;
  background: var(--color-accent);
}

.viewer__empty {
  margin: 0;
  padding: 48px 20px;
  text-align: center;
  color: var(--color-text-faint);
}

.flow__body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 20px;
}

.flow__body .notice {
  width: 100%;
}

.flow__text {
  margin: 0;
  color: var(--color-text-muted);
}

.flow__text strong {
  color: var(--color-text);
}

.flow__hint {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-faint);
}

.flow__row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.flow__parsing {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--color-text);
  font-weight: 500;
}

.courses__tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.seg {
  display: inline-flex;
  padding: 2px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.seg__item {
  height: 28px;
  padding: 0 14px;
  font-size: 13px;
  color: var(--color-text-muted);
  background: none;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
}

.seg__item.is-active {
  color: var(--color-text);
  font-weight: 500;
  background: var(--color-surface);
  box-shadow: 0 0 0 1px var(--color-border);
}

.seg__item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.week-pick {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.week-pick .control {
  height: 30px;
}

.courses__preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px 20px;
}

.edit {
  min-width: 1020px;
}

.edit th,
.edit td {
  padding: 8px 8px;
}

.edit th:first-child,
.edit td:first-child {
  padding-left: 20px;
}

.edit tr.is-flag td {
  background: #fdf8ec;
}

.edit tr.is-flag td:first-child {
  box-shadow: inset 3px 0 0 #d9a93a;
}

.edit tr.is-invalid td:first-child {
  box-shadow: inset 3px 0 0 var(--color-danger);
}

.cell {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  font-size: 13px;
}

.cell.has-error,
.range.has-error .cell {
  border-color: var(--color-danger);
}

.cell--num {
  width: 58px;
}

.col-name {
  min-width: 170px;
}

.col-loc {
  min-width: 190px;
}

.flag {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #8a6414;
}

.range {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.range .cell {
  width: auto;
  min-width: 54px;
}

.range .cell--num {
  width: 58px;
}

.range__sep {
  color: var(--color-text-faint);
}

.err-row td {
  padding: 0 8px 10px;
  font-size: 12px;
  color: var(--color-danger);
  border-bottom: 1px solid var(--color-border);
  background: var(--color-danger-bg);
}

.courses__add {
  padding: 14px 20px;
  border-top: 1px solid var(--color-border);
}

.confirm {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.confirm__check {
  font-size: 14px;
  color: var(--color-text);
}

.confirm__actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

.lightbox {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(20, 20, 19, 0.78);
  cursor: zoom-out;
}

.lightbox img {
  max-width: 100%;
  max-height: 100%;
  background: #fff;
  border-radius: var(--radius-md);
  cursor: default;
}

.lightbox__close {
  position: absolute;
  top: 16px;
  right: 20px;
  width: 36px;
  height: 36px;
  font-size: 24px;
  line-height: 1;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.lightbox__close:hover {
  background: rgba(255, 255, 255, 0.26);
}

@media (max-width: 960px) {
  .top {
    grid-template-columns: 1fr;
  }
}
</style>
