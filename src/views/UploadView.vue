<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PageHeading from '@/components/PageHeading.vue'
import StatusTag from '@/components/StatusTag.vue'
import MemberTopbar from '@/components/MemberTopbar.vue'
import EmptyState from '@/components/EmptyState.vue'
import UploadMeter from '@/components/UploadMeter.vue'
import { getMySchedule, uploadSchedule } from '@/api/schedule'
import { SCHEDULE_STATUS } from '@/constants/scheduleStatus'
import { formatFileSize } from '@/utils/format'

const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

const router = useRouter()

const info = ref(null)
const loading = ref(true)
const loadError = ref('')

const file = ref(null)
const previewUrl = ref('')
const fileError = ref('')
const dragging = ref(false)
const uploading = ref(false)
const progress = ref(0)
const submitError = ref('')
const done = ref(false)
const fileInput = ref(null)

const remaining = computed(() => (info.value ? info.value.max_uploads - info.value.upload_count : 0))
const exhausted = computed(() => info.value && remaining.value <= 0)
const hasEffective = computed(() => (info.value?.courses.length ?? 0) > 0)

const hint = computed(() => {
  if (!info.value) return ''
  if (info.value.status === SCHEDULE_STATUS.PENDING) {
    return '你之前提交的课表还在等待解析。重新提交后，管理员会以最新的图片为准。'
  }
  if (hasEffective.value) {
    return '提交后管理员需要重新解析。在处理完成前，你仍然会看到当前生效的课表。'
  }
  return ''
})

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    info.value = await getMySchedule()
  } catch (err) {
    loadError.value = err?.message || '加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

function releasePreview() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
}

function clearFile() {
  releasePreview()
  file.value = null
  fileError.value = ''
  submitError.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function pick(selected) {
  if (!selected || uploading.value) return
  fileError.value = ''
  submitError.value = ''

  if (!ACCEPT_TYPES.includes(selected.type)) {
    fileError.value = '仅支持 JPG、PNG、WebP 格式的图片'
    return
  }
  if (selected.size > MAX_SIZE) {
    fileError.value = `图片不能超过 ${formatFileSize(MAX_SIZE)},当前为 ${formatFileSize(selected.size)}`
    return
  }

  releasePreview()
  file.value = selected
  previewUrl.value = URL.createObjectURL(selected)
}

function onInputChange(e) {
  pick(e.target.files?.[0])
}

function onDrop(e) {
  dragging.value = false
  pick(e.dataTransfer?.files?.[0])
}

async function submit() {
  if (!file.value || uploading.value || exhausted.value) return
  uploading.value = true
  progress.value = 0
  submitError.value = ''
  try {
    await uploadSchedule(file.value, (p) => {
      progress.value = p
    })
    done.value = true
    clearFile()
    try {
      info.value = await getMySchedule()
    } catch {
      // 返回首页时会重新读取，此处保留上传成功的状态。
      info.value = { ...info.value, upload_count: info.value.upload_count + 1 }
    }
  } catch (err) {
    submitError.value = err?.message || '上传失败,请稍后重试'
    if (err?.status === 409) await load()
  } finally {
    uploading.value = false
  }
}

function backHome() {
  router.push({ name: 'home' })
}

onMounted(load)
onBeforeUnmount(releasePreview)
</script>

<template>
  <MemberTopbar />
  <main class="member-page">
    <PageHeading title="上传课表" description="提交课表截图，由管理员核对并安排本周签到。" />
    <section v-if="loading" class="panel" aria-busy="true">
      <p class="page-loader"><span class="spinner" aria-hidden="true"></span>读取课表状态…</p>
    </section>
    <section v-else-if="loadError" class="panel">
      <EmptyState title="课表状态加载失败" :description="loadError" icon="alert" tone="danger">
        <button class="btn" type="button" @click="load">重新加载</button>
      </EmptyState>
    </section>
    <div v-else class="upload-grid">
      <section v-if="done" class="panel">
        <EmptyState title="课表已提交" description="管理员确认后，你可以在签到周表查看可签到时段。" icon="checkCircle" tone="green">
          <button class="btn" type="button" @click="backHome">返回签到周表</button>
        </EmptyState>
      </section>
      <section v-else-if="exhausted" class="panel">
        <EmptyState title="上传次数已用完" description="如需更新课表，请联系管理员。" icon="alert" tone="danger">
          <button class="btn btn--secondary" type="button" @click="backHome">返回签到周表</button>
        </EmptyState>
      </section>
      <section v-else class="panel upload-card">
        <header class="panel__head"><h2 class="panel__title">课表图片</h2></header>
        <div class="upload-card__body">
          <p v-if="hint" class="notice notice--info">{{ hint }}</p>
          <div v-if="!file" class="dropzone" :class="{ 'is-dragging': dragging }"
            @dragover.prevent="dragging = true" @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
            <span class="dropzone__icon"><AppIcon name="upload" :size="26" /></span>
            <strong>拖放课表截图到这里</strong>
            <p>JPG、PNG 或 WebP，最大 5 MB</p>
            <button class="btn btn--secondary" type="button" @click="fileInput.click()">选择图片</button>
          </div>
          <div v-else class="upload-preview">
            <img :src="previewUrl" alt="待上传的课表预览" />
            <div>
              <strong>{{ file.name }}</strong>
              <p>{{ formatFileSize(file.size) }}</p>
              <progress v-if="uploading" :value="progress" max="100" aria-label="上传进度">{{ progress }}%</progress>
              <button v-else class="link-btn" type="button" @click="clearFile">更换图片</button>
            </div>
          </div>
          <input ref="fileInput" hidden type="file" accept="image/jpeg,image/png,image/webp" @change="onInputChange" />
          <p v-if="fileError || submitError" class="notice notice--danger" role="alert">{{ fileError || submitError }}</p>
        </div>
        <footer class="upload-card__foot">
          <span>提交将使用 1 次上传机会</span>
          <button class="btn" type="button" :disabled="!file || uploading" @click="submit">
            <span v-if="uploading" class="btn__spinner" aria-hidden="true"></span>
            <AppIcon v-else name="arrow" :size="16" />{{ uploading ? '上传中…' : '提交课表' }}
          </button>
        </footer>
      </section>

      <aside class="panel upload-details" aria-label="上传状态">
        <div class="upload-details__section">
          <h2 class="panel__title"><AppIcon name="calendar" /> 当前课表</h2>
          <StatusTag :status="info.status" />
          <UploadMeter :used="info.upload_count" :max="info.max_uploads" />
        </div>
        <div class="upload-details__section">
          <h2 class="panel__title">截图要求</h2>
          <ul>
            <li>保留星期、节次和教学周信息。</li>
            <li>确保课程名称清晰、图片完整。</li>
          </ul>
        </div>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.upload-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, 300px); gap: 17px; align-items: start; }
.upload-card__body { display: grid; gap: 13px; padding: 0 22px 18px; }
.dropzone { display: grid; justify-items: center; gap: 9px; min-height: 250px; align-content: center; padding: 25px 14px; text-align: center; color: var(--color-text); background: #f7f8ff; border: 1px dashed #b1bdf7; border-radius: 14px; }
.dropzone.is-dragging { background: #e9edff; border-color: var(--color-accent); }
.dropzone__icon { display: grid; place-items: center; width: 55px; height: 55px; margin-bottom: 4px; border-radius: 15px; color: var(--color-accent); background: #e8ecff; }
.dropzone strong { font-size: 16px; }
.dropzone p, .upload-preview p { margin: 0; color: var(--color-text-muted); font-size: 12px; }
.dropzone .btn { margin-top: 4px; }
.upload-card__foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; padding: 15px 22px; border-top: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 12px; }
.upload-preview { display: grid; grid-template-columns: minmax(85px, 145px) minmax(0, 1fr); gap: 14px; align-items: center; min-height: 220px; padding: 13px; border: 1px solid var(--color-border); border-radius: 14px; background: #f7f8fd; }
.upload-preview img { width: 100%; height: 194px; object-fit: contain; background: white; border-radius: 8px; }
.upload-preview strong { overflow-wrap: anywhere; }
.upload-preview progress { accent-color: var(--color-accent); width: min(100%, 220px); }
.upload-details__section { display: grid; gap: 12px; padding: 18px; }
.upload-details__section + .upload-details__section { border-top: 1px solid var(--color-border); }
.upload-details__section h2 { display: flex; align-items: center; gap: 8px; }
.upload-details__section h2 svg { color: var(--color-accent); }
.upload-details__section ul { padding-inline-start: 17px; margin: 0; color: var(--color-text-muted); font-size: 13px; }
.upload-details__section li + li { margin-top: 6px; }
@media (max-width: 830px) { .upload-grid { grid-template-columns: minmax(0, 1fr); } }
@media (max-width: 620px) { .upload-card__body { padding-inline: 15px; } .upload-card__foot { padding-inline: 15px; } }
</style>
