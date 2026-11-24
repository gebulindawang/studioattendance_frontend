<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
    return '你之前提交的课表还在等待解析。重新提交后,管理员会以最新的图片为准。'
  }
  if (hasEffective.value) {
    return '提交后管理员需要重新解析。在处理完成前,你仍然会看到当前生效的课表。'
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
  <main class="upload">
    <MemberTopbar title="上传课表">
      <template #actions>
        <button class="text-btn" type="button" @click="backHome">返回课表</button>
      </template>
    </MemberTopbar>

    <section v-if="loading" class="panel upload__card" aria-busy="true">
      <p class="upload__loading"><span class="spinner" aria-hidden="true"></span>加载中…</p>
    </section>

    <section v-else-if="loadError" class="panel">
      <EmptyState title="加载失败" :description="loadError">
        <button class="btn btn--sm" type="button" @click="load">重新加载</button>
      </EmptyState>
    </section>

    <section v-else-if="done" class="panel">
      <EmptyState
        title="课表已提交"
        description="管理员会尽快为你解析课表,解析并确认后会在“我的课表”里显示。"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        </template>
        <UploadMeter :used="info.upload_count" :max="info.max_uploads" />
        <button class="btn btn--sm" type="button" @click="backHome">返回我的课表</button>
      </EmptyState>
    </section>

    <section v-else-if="exhausted" class="panel">
      <EmptyState
        title="上传次数已用完"
        :description="`每位用户最多可上传 ${info.max_uploads} 次课表,你已全部用完。如果课表还有问题,请联系管理员帮你修改。`"
      >
        <template #icon>
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="m6 6 12 12" />
          </svg>
        </template>
        <UploadMeter :used="info.upload_count" :max="info.max_uploads" />
        <button class="btn btn--sm btn--secondary" type="button" @click="backHome">返回我的课表</button>
      </EmptyState>
    </section>

    <section v-else class="panel upload__card">
      <header class="upload__head">
        <div>
          <h2 class="upload__title">选择课表图片</h2>
          <p class="upload__sub">请上传清晰、完整的课表截图,文字越清晰,解析越准确。</p>
        </div>
        <UploadMeter :used="info.upload_count" :max="info.max_uploads" />
      </header>

      <p v-if="hint" class="notice notice--info"><span class="notice__body">{{ hint }}</span></p>

      <div
        v-if="!file"
        class="dropzone"
        :class="{ 'is-dragging': dragging, 'is-error': fileError }"
        role="button"
        tabindex="0"
        @click="fileInput.click()"
        @keydown.enter.prevent="fileInput.click()"
        @keydown.space.prevent="fileInput.click()"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12 16V5m0 0-4 4m4-4 4 4" />
          <path d="M5 15v3.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V15" />
        </svg>
        <p class="dropzone__main">点击选择图片,或将图片拖到这里</p>
        <p class="dropzone__sub">支持 JPG、PNG、WebP,大小不超过 5 MB</p>
      </div>

      <div v-else class="preview">
        <img class="preview__img" :src="previewUrl" alt="待上传的课表预览" />
        <div class="preview__info">
          <p class="preview__name">{{ file.name }}</p>
          <p class="preview__size">{{ formatFileSize(file.size) }}</p>
          <div v-if="uploading" class="progress" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
            <span class="progress__fill" :style="{ width: `${progress}%` }"></span>
          </div>
          <p v-if="uploading" class="preview__size">上传中 {{ progress }}%</p>
          <button v-else class="text-btn" type="button" @click="clearFile">更换图片</button>
        </div>
      </div>

      <input
        ref="fileInput"
        class="upload__input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        @change="onInputChange"
      />

      <p v-if="fileError" class="notice notice--danger" role="alert">
        <span class="notice__body">{{ fileError }}</span>
      </p>
      <p v-if="submitError" class="notice notice--danger" role="alert">
        <span class="notice__body">{{ submitError }}</span>
      </p>

      <footer class="upload__foot">
        <span class="upload__cost">提交将消耗 1 次上传次数</span>
        <button class="btn btn--sm" type="button" :disabled="!file || uploading" @click="submit">
          <span v-if="uploading" class="btn__spinner" aria-hidden="true"></span>
          {{ uploading ? '上传中…' : '提交课表' }}
        </button>
      </footer>
    </section>
  </main>
</template>

<style scoped>
.upload {
  max-width: 680px;
  margin: 0 auto;
  padding: 28px 20px 48px;
}

.upload__card {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.upload__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0;
  padding: 40px 0;
  color: var(--color-text-muted);
}

.upload__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.upload__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 500;
}

.upload__sub {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--color-text-muted);
}

.upload__input {
  display: none;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 16px;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border: 1.5px dashed var(--color-border-strong);
  border-radius: var(--radius-lg);
  cursor: pointer;
  outline: none;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.dropzone:hover,
.dropzone.is-dragging {
  border-color: var(--color-accent);
  background: #fbf3ef;
}

.dropzone:focus-visible {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.dropzone.is-error {
  border-color: var(--color-danger);
}

.dropzone__main {
  margin: 12px 0 0;
  color: var(--color-text);
}

.dropzone__sub {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--color-text-faint);
}

.preview {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.preview__img {
  flex: none;
  width: 120px;
  height: 150px;
  object-fit: cover;
  object-position: top;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.preview__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.preview__name {
  max-width: 100%;
  margin: 0;
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview__size {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
}

.progress {
  width: 100%;
  height: 6px;
  margin-top: 6px;
  overflow: hidden;
  background: var(--color-border);
  border-radius: 999px;
}

.progress__fill {
  display: block;
  height: 100%;
  background: var(--color-accent);
  border-radius: 999px;
  transition: width 0.12s linear;
}

.upload__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.upload__cost {
  font-size: 13px;
  color: var(--color-text-faint);
}

@media (max-width: 520px) {
  .upload {
    padding: 20px 12px 32px;
  }

  .preview {
    flex-direction: column;
  }

  .preview__img {
    width: 100%;
  }
}
</style>
