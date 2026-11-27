import { createRouter, createWebHistory } from 'vue-router'
import { clearToken, getToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'
import { ROLE } from '@/constants/role'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { title: '首页', requiresAuth: true },
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('../views/UploadView.vue'),
      meta: { title: '上传课表', requiresAuth: true, roles: [ROLE.MEMBER] },
    },
    {
      path: '/attendance',
      name: 'my-attendance',
      component: () => import('../views/MyAttendanceView.vue'),
      meta: { title: '我的考勤', requiresAuth: true, roles: [ROLE.MEMBER] },
    },
    {
      path: '/admin',
      component: () => import('../views/admin/AdminLayout.vue'),
      meta: { requiresAuth: true, roles: [ROLE.ADMIN] },
      children: [
        {
          path: '',
          name: 'admin-overview',
          component: () => import('../views/admin/OverviewView.vue'),
          meta: { title: '概览' },
        },
        {
          path: 'schedules',
          name: 'admin-schedules',
          component: () => import('../views/admin/ScheduleListView.vue'),
          meta: { title: '课表管理' },
        },
        {
          path: 'schedules/:key',
          name: 'admin-schedule-review',
          component: () => import('../views/admin/ScheduleReviewView.vue'),
          meta: { title: '课表解析', nav: 'admin-schedules' },
        },
        {
          path: 'members',
          name: 'admin-members',
          component: () => import('../views/admin/MembersView.vue'),
          meta: { title: '成员管理' },
        },
        {
          path: 'records',
          name: 'admin-records',
          component: () => import('../views/admin/RecordsView.vue'),
          meta: { title: '考勤记录' },
        },
        {
          path: 'makeup',
          name: 'admin-makeup',
          component: () => import('../views/admin/MakeupReviewView.vue'),
          meta: { title: '补签审批' },
        },
        {
          path: 'config',
          name: 'admin-config',
          component: () => import('../views/admin/ConfigView.vue'),
          meta: { title: '学期配置' },
        },
      ],
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { title: '登录', guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { title: '注册', guestOnly: true },
    },
  ],
})

router.beforeEach(async (to) => {
  const loggedIn = !!getToken()
  const userStore = useUserStore()

  if (to.meta.requiresAuth && !loggedIn) {
    return {
      name: 'login',
      query: to.fullPath === '/' ? {} : { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && loggedIn) {
    return { name: 'home' }
  }

  if (to.meta.requiresAuth && !userStore.isLoaded) {
    try {
      await userStore.fetchProfile()
    } catch {
      clearToken()
      userStore.reset()
      return {
        name: 'login',
        query: to.fullPath === '/' ? { expired: '1' } : { redirect: to.fullPath, expired: '1' },
      }
    }
  }

  if (to.meta.roles && !userStore.hasRole(to.meta.roles)) {
    return { name: 'home' }
  }

  if (to.name === 'home' && userStore.isAdmin) {
    return { name: 'admin-overview' }
  }
})

router.afterEach((to) => {
  const base = '工作室考勤'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
