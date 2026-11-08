<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ScheduleTable from '@/components/ScheduleTable.vue'
import { getSchedules } from '@/api/schedule'
import { clearToken } from '@/utils/auth'
import { MAX_WEEK, addDays, getMonday, getWeekNumber, isCourseInWeek } from '@/utils/schedule'

const router = useRouter()

const currentMonday = getMonday(new Date())
const weekOffset = ref(0)

const monday = computed(() => addDays(currentMonday, weekOffset.value * 7))
const week = computed(() => getWeekNumber(monday.value))

const schedules = ref([])
const loading = ref(false)
const errorMessage = ref('')

const visibleCourses = computed(() => schedules.value.filter((c) => isCourseInWeek(c, week.value)))

const canPrev = computed(() => week.value > 1)
const canNext = computed(() => week.value < MAX_WEEK)

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    schedules.value = await getSchedules()
  } catch (err) {
    errorMessage.value = err?.message || '课表加载失败,请稍后重试'
  } finally {
    loading.value = false
  }
}

function logout() {
  clearToken()
  router.replace({ name: 'login' })
}

onMounted(load)
</script>

<template>
  <main class="home">
    <header class="home__bar">
      <div class="home__heading">
        <span class="home__mark" aria-hidden="true"></span>
        <h1 class="home__title">我的课表</h1>
      </div>

      <div class="home__actions">
        <button
          v-if="weekOffset !== 0"
          class="text-btn"
          type="button"
          @click="weekOffset = 0"
        >
          回到本周
        </button>

        <div class="stepper" role="group" aria-label="切换周次">
          <button
            class="stepper__btn"
            type="button"
            aria-label="上一周"
            :disabled="!canPrev"
            @click="weekOffset--"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <span class="stepper__label">第 {{ week }} 周</span>
          <button
            class="stepper__btn"
            type="button"
            aria-label="下一周"
            :disabled="!canNext"
            @click="weekOffset++"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <button class="text-btn" type="button" @click="logout">退出登录</button>
      </div>
    </header>

    <p v-if="errorMessage" class="home__error" role="alert">
      {{ errorMessage }}
      <button class="text-btn" type="button" @click="load">重试</button>
    </p>

    <div class="home__body" :class="{ 'is-loading': loading }">
      <ScheduleTable :courses="visibleCourses" :monday="monday" :week="week" />
      <p v-if="loading" class="home__loading">加载中…</p>
    </div>
  </main>
</template>

<style scoped>
.home {
  max-width: 1120px;
  margin: 0 auto;
  padding: 28px 20px 48px;
}

.home__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.home__heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.home__mark {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-accent);
}

.home__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.home__actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stepper {
  display: inline-flex;
  align-items: center;
  height: 36px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
}

.stepper__btn {
  width: 34px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: none;
  border: 0;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 0.15s ease;
}

.stepper__btn:hover:not(:disabled) {
  color: var(--color-accent);
}

.stepper__btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.stepper__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.stepper__label {
  min-width: 64px;
  text-align: center;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.text-btn {
  padding: 4px 2px;
  background: none;
  border: 0;
  color: var(--color-text-muted);
  font-size: 14px;
  cursor: pointer;
  transition: color 0.15s ease;
}

.text-btn:hover {
  color: var(--color-accent);
}

.text-btn:focus-visible {
  outline: none;
  border-radius: 4px;
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.home__error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 16px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--color-danger);
  background: var(--color-danger-bg);
  border-radius: var(--radius-md);
}

.home__body {
  position: relative;
}

.home__body.is-loading :deep(.course) {
  opacity: 0.4;
}

.home__loading {
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 6px 14px;
  font-size: 13px;
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  z-index: 2;
}

@media (max-width: 640px) {
  .home {
    padding: 20px 12px 32px;
  }

  .home__actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
