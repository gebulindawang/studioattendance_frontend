<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import PageHeading from '@/components/PageHeading.vue'
import StudioBrand from '@/components/StudioBrand.vue'
import { clearToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import { ROLE_LABELS } from '@/constants/role'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const navigation = [
  { name: 'admin-overview', label: '概览', icon: 'grid', description: '查看今日签到、近期趋势和待处理事项。' },
  { name: 'admin-schedules', label: '课表管理', icon: 'calendar', description: '查看成员的课表提交和解析进度。' },
  { name: 'admin-members', label: '成员管理', icon: 'users', description: '查看成员档案，管理账号启用状态。' },
  { name: 'admin-records', label: '考勤记录', icon: 'records', description: '生成本周签到安排，按条件查询历史记录。' },
  { name: 'admin-makeup', label: '补签审批', icon: 'calendarCheck', description: '处理成员提交的补签申请，查阅审批结果。' },
  { name: 'admin-config', label: '学期配置', icon: 'settings', description: '设置学期日期、教学周数和节次时间。' },
]

const activePage = computed(() => route.meta.nav || route.name)
const description = computed(() => route.meta.nav ? '' : navigation.find((item) => item.name === activePage.value)?.description)

function logout() {
  clearToken()
  userStore.reset()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="admin">
    <aside class="admin__sidebar">
      <RouterLink class="admin__brand" :to="{ name: 'admin-overview' }"><StudioBrand /></RouterLink>
      <nav class="admin__nav" aria-label="管理导航">
        <RouterLink v-for="item in navigation" :key="item.name" :to="{ name: item.name }"
          :class="{ 'is-current': activePage === item.name }"
          :aria-current="activePage === item.name ? 'page' : undefined">
          <AppIcon :name="item.icon" :size="18" /><span>{{ item.label }}</span>
          <AppIcon class="admin__nav-arrow" name="chevron" :size="13" />
        </RouterLink>
      </nav>
      <div class="admin__account">
        <span class="avatar" aria-hidden="true">{{ userStore.displayName.slice(0, 1) || '管' }}</span>
        <div class="admin__account-copy">
          <strong>{{ userStore.displayName }}</strong>
          <small>{{ ROLE_LABELS[userStore.role] }}</small>
        </div>
        <button type="button" class="text-btn icon-btn" aria-label="退出登录" title="退出登录" @click="logout">
          <AppIcon name="logout" :size="17" />
        </button>
      </div>
    </aside>

    <div class="admin__main">
      <div class="admin__bar">
        <AppIcon name="grid" :size="15" />
        <RouterLink :to="{ name: 'admin-overview' }">管理后台</RouterLink>
        <AppIcon name="chevron" :size="13" />
        <span>{{ route.meta.title }}</span>
      </div>
      <main class="admin__content">
        <PageHeading :title="route.meta.title" :description="description" />
        <div class="page-stack"><RouterView :key="route.path" /></div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin { display: grid; grid-template-columns: 222px minmax(0, 1fr); min-height: 100dvh; }
.admin__sidebar {
  position: sticky; top: 0; height: 100dvh; overflow-y: auto;
  display: flex; flex-direction: column; background: #121a35; color: #e9edff;
  padding: 26px 14px 15px;
}
.admin__brand { margin: 0 9px 38px; text-decoration: none; width: fit-content; }
.admin__nav { display: grid; gap: 5px; }
.admin__nav a { position: relative; display: flex; gap: 11px; align-items: center; min-height: 43px; padding: 7px 12px; border-radius: 9px; color: #b6c2e5; font-size: 13px; font-weight: 650; white-space: nowrap; text-decoration: none; }
.admin__nav a:hover { color: #fff; background: #263257; }
.admin__nav a.is-current { color: #fff; background: #3048c9; box-shadow: 0 4px 12px #080f2980; }
.admin__nav-arrow { margin-inline-start: auto; opacity: 0; }
.admin__nav a.is-current .admin__nav-arrow { opacity: .8; }
.admin__account { display: flex; align-items: center; min-width: 0; gap: 8px; margin-top: auto; padding: 16px 3px 3px; border-top: 1px solid #2c375a; }
.admin__account-copy { display: grid; flex: 1; min-width: 0; }
.admin__account-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.admin__account-copy small { color: #b6c2e5; font-size: 11px; }
.admin__account .avatar { margin: 0; background: #303e70; color: #e0e7ff; }
.admin__account .icon-btn { color: #d5def7; }
.admin__account .icon-btn:hover { background: #303e70; }
.admin__main { min-width: 0; }
.admin__bar { display: flex; align-items: center; gap: 9px; min-height: 61px; padding: 0 clamp(17px, 3.3vw, 42px); background: var(--color-surface); border-bottom: 1px solid var(--color-border); color: var(--color-text-muted); font-size: 13px; }
.admin__bar > a { text-decoration: none; }
.admin__bar > a:hover { color: var(--color-accent); text-decoration: underline; }
.admin__bar > span { color: var(--color-text); font-weight: 650; }
.admin__content { max-width: 1580px; margin: auto; padding: clamp(22px, 3vw, 38px) clamp(16px, 3.3vw, 42px) 45px; }
@media (max-width: 850px) {
  .admin { display: block; }
  .admin__sidebar { position: static; height: auto; overflow: visible; display: grid; grid-template-columns: 1fr auto; padding: 12px 16px; gap: 9px 12px; }
  .admin__brand { margin: 0; align-self: center; }
  .admin__account { grid-column: 2; grid-row: 1; margin: 0; padding: 0; border: 0; }
  .admin__account-copy { display: none; }
  .admin__nav { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; }
  .admin__nav a { justify-content: center; gap: 6px; min-height: 38px; padding: 5px 4px; }
  .admin__nav-arrow { display: none; }
  .admin__bar { min-height: 43px; }
}
</style>
