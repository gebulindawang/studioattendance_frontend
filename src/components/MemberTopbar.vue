<script setup>
import { useRouter } from 'vue-router'
import { clearToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import { ROLE_LABELS } from '@/constants/role'

defineProps({
  title: { type: String, required: true },
})

const router = useRouter()
const userStore = useUserStore()

function logout() {
  clearToken()
  userStore.reset()
  router.replace({ name: 'login' })
}
</script>

<template>
  <header class="topbar">
    <div class="topbar__heading">
      <span class="topbar__mark" aria-hidden="true"></span>
      <h1 class="topbar__title">{{ title }}</h1>
    </div>

    <div class="topbar__actions">
      <slot name="actions" />
      <span v-if="userStore.isLoaded" class="topbar__user">
        {{ userStore.displayName }}
        <span class="topbar__role">{{ ROLE_LABELS[userStore.role] }}</span>
      </span>
      <button class="text-btn" type="button" @click="logout">退出登录</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.topbar__heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topbar__mark {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-accent);
}

.topbar__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.topbar__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.topbar__user {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.topbar__role {
  padding: 1px 8px;
  font-size: 12px;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
}

@media (max-width: 640px) {
  .topbar__actions {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
