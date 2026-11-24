<script setup>
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { clearToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import { ROLE_LABELS } from '@/constants/role'


const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const NAV_ITEMS = [
  { name: 'admin-overview', label: '概览' },
  { name: 'admin-schedules', label: '课表管理' },
  { name: 'admin-members', label: '成员管理' },
  { name: 'admin-records', label: '考勤记录' },
  { name: 'admin-config', label: '学期配置' },
]

function logout() {
  clearToken()
  userStore.reset()
  router.replace({ name: 'login' })
}
</script>

<template>
  <div class="admin">
    <aside class="admin__side">
      <div class="admin__brand">
        <span class="admin__mark" aria-hidden="true"></span>
        <div>
          <p class="admin__brand-name">工作室考勤</p>
          <p class="admin__brand-sub">管理后台</p>
        </div>
      </div>

      <nav class="admin__nav" aria-label="管理导航">
        <RouterLink
          v-for="item in NAV_ITEMS"
          :key="item.name"
          :to="{ name: item.name }"
          class="admin__nav-item"
          :class="{ 'is-active': route.name === item.name || route.meta.nav === item.name }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="admin__user">
        <div class="admin__user-info">
          <span class="admin__user-name">{{ userStore.displayName || '—' }}</span>
          <span class="admin__user-role">{{ ROLE_LABELS[userStore.role] }}</span>
        </div>
        <button class="admin__logout" type="button" @click="logout">退出登录</button>
      </div>
    </aside>

    <div class="admin__main">
      <header class="admin__header">
        <h1 class="admin__title">{{ route.meta.title }}</h1>
      </header>
      <div class="admin__content">
        <RouterView :key="$route.path" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin {
  display: grid;
  grid-template-columns: 224px 1fr;
  min-height: 100%;
}

.admin__side {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 24px 16px 20px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}

.admin__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 24px;
}

.admin__mark {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-accent);
}

.admin__brand-name {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.3;
}

.admin__brand-sub {
  margin: 0;
  font-size: 12px;
  color: var(--color-text-faint);
}

.admin__nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin__nav-item {
  display: block;
  padding: 9px 12px;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  text-decoration: none;
  transition:
    background-color 0.15s ease,
    color 0.15s ease;
}

.admin__nav-item:hover {
  background: var(--color-bg);
  color: var(--color-text);
}

.admin__nav-item.is-active {
  background: #f4e2da;
  color: #85402a;
  font-weight: 500;
}

.admin__user {
  margin-top: auto;
  padding: 14px 8px 0;
  border-top: 1px solid var(--color-border);
}

.admin__user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.admin__user-name {
  font-size: 14px;
  font-weight: 500;
}

.admin__user-role {
  padding: 0 8px;
  font-size: 12px;
  line-height: 20px;
  color: var(--color-text-muted);
  border: 1px solid var(--color-border-strong);
  border-radius: 999px;
}

.admin__logout {
  padding: 2px 0;
  background: none;
  border: 0;
  font-size: 13px;
  color: var(--color-text-faint);
  cursor: pointer;
  transition: color 0.15s ease;
}

.admin__logout:hover {
  color: var(--color-accent);
}

.admin__main {
  min-width: 0;
}

.admin__header {
  padding: 28px 32px 0;
}

.admin__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.admin__content {
  max-width: 1080px;
  padding: 20px 32px 48px;
}

@media (max-width: 860px) {
  .admin {
    grid-template-columns: 1fr;
  }

  .admin__side {
    position: static;
    height: auto;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-right: 0;
    border-bottom: 1px solid var(--color-border);
  }

  .admin__brand {
    padding: 0;
  }

  .admin__nav {
    flex-direction: row;
    order: 3;
    width: 100%;
    overflow-x: auto;
  }

  .admin__nav-item {
    white-space: nowrap;
  }

  .admin__user {
    margin: 0 0 0 auto;
    padding: 0;
    border-top: 0;
    text-align: right;
  }

  .admin__user-info {
    margin-bottom: 0;
  }

  .admin__logout {
    display: none;
  }

  .admin__header {
    padding: 20px 16px 0;
  }

  .admin__content {
    padding: 16px 16px 32px;
  }
}
</style>
