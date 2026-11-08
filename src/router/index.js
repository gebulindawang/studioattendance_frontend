import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'

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

router.beforeEach((to) => {
  const loggedIn = !!getToken()

  if (to.meta.requiresAuth && !loggedIn) {
    return {
      name: 'login',
      query: to.fullPath === '/' ? {} : { redirect: to.fullPath },
    }
  }

  if (to.meta.guestOnly && loggedIn) {
    return { name: 'home' }
  }
})

router.afterEach((to) => {
  const base = '工作室考勤'
  document.title = to.meta.title ? `${to.meta.title} · ${base}` : base
})

export default router
