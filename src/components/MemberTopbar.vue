<script setup>
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import StudioBrand from '@/components/StudioBrand.vue'
import { clearToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const links = [
  { name: 'home', text: '签到周表', icon: 'calendar' },
  { name: 'my-attendance', text: '我的考勤', icon: 'history' },
  { name: 'upload', text: '上传课表', icon: 'upload' },
]

function logout() {
  clearToken()
  userStore.reset()
  router.replace({ name: 'login' })
}
</script>

<template>
  <header class="member-bar">
    <div class="member-bar__inner">
      <RouterLink class="member-bar__brand" :to="{ name: 'home' }"><StudioBrand /></RouterLink>
      <nav class="member-nav" aria-label="成员导航">
        <RouterLink v-for="item in links" :key="item.name" :to="{ name: item.name }"
          :class="{ 'is-current': route.name === item.name }">
          <AppIcon :name="item.icon" :size="17" />{{ item.text }}
        </RouterLink>
      </nav>
      <div class="member-bar__account">
        <span v-if="userStore.displayName" class="member-bar__person">
          <span class="avatar" aria-hidden="true">{{ userStore.displayName.slice(0, 1) }}</span>
          <span class="member-bar__name">{{ userStore.displayName }}</span>
        </span>
        <button type="button" class="text-btn icon-btn" aria-label="退出登录" title="退出登录" @click="logout">
          <AppIcon name="logout" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
.member-bar { background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
.member-bar__inner { width: min(100%, 1320px); min-height: 68px; margin: auto; padding: 0 clamp(16px, 4vw, 40px); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 20px; }
.member-bar__brand { text-decoration: none; width: fit-content; }
.member-nav { display: flex; gap: 5px; align-items: center; }
.member-nav a { display: flex; gap: 7px; align-items: center; justify-content: center; border-radius: 9px; color: var(--color-text-muted); min-height: 38px; padding: 0 13px; white-space: nowrap; text-decoration: none; font-size: 13px; font-weight: 650; }
.member-nav a:hover, .member-nav a.is-current { color: var(--color-accent); background: var(--color-accent-soft); }
.member-bar__account, .member-bar__person { display: flex; min-width: 0; align-items: center; gap: 9px; }
.member-bar__account { justify-content: end; }
.member-bar__person { color: var(--color-text-muted); font-size: 13px; font-weight: 650; }
.member-bar__person .avatar { margin: 0; }
.member-bar__name { max-width: 105px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
@media (max-width: 750px) {
  .member-bar__inner { grid-template-columns: 1fr auto; padding-top: 12px; gap: 8px; }
  .member-bar__account { grid-row: 1; grid-column: 2; }
  .member-nav { grid-row: 2; grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); padding: 4px 0 9px; }
  .member-nav a { min-height: 40px; padding: 0 6px; }
  .member-bar__name { display: none; }
}
</style>
