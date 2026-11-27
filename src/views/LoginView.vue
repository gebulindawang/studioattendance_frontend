<script setup>
import { reactive, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/components/AuthLayout.vue'
import AppIcon from '@/components/AppIcon.vue'
import PasswordField from '@/components/PasswordField.vue'
import { login } from '@/api/auth'
import { setToken } from '@/utils/auth'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const form = reactive({
  username: '',
  password: '',
  remember: true,
})

const loading = ref(false)
const errorMessage = ref('')
const registered = ref(route.query.registered === '1')
const expired = ref(route.query.expired === '1')

watch(form, () => {
  errorMessage.value = ''
  registered.value = false
  expired.value = false
})

function validate() {
  if (!form.username.trim()) return '请输入账号'
  if (!form.password) return '请输入密码'
  return ''
}

function getRedirectTarget() {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') && !target.startsWith('//')
    ? target
    : '/'
}

async function handleSubmit() {
  if (loading.value) return

  errorMessage.value = validate()
  if (errorMessage.value) return

  loading.value = true
  try {
    const token = await login({
      username: form.username.trim(),
      password: form.password,
    })
    userStore.reset()
    setToken(token, form.remember)
    await router.replace(getRedirectTarget())
  } catch (err) {
    errorMessage.value = err?.message || '登录失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout title="登录工作室" description="使用你的账号查看签到安排和考勤记录。">
    <form class="auth__form" novalidate @submit.prevent="handleSubmit">
      <p v-if="registered" class="auth__notice" role="status">注册成功，请登录</p>
      <p v-if="expired" class="auth__notice" role="status">登录状态已失效，请重新登录</p>

      <div class="field">
        <label class="field__label" for="username">账号</label>
        <input
          id="username"
          v-model="form.username"
          class="field__input"
          type="text"
          name="username"
          autocomplete="username"
          placeholder="请输入账号"
          autofocus
        />
      </div>

      <PasswordField
        id="password"
        v-model="form.password"
        label="密码"
        placeholder="请输入密码"
        autocomplete="current-password"
      />

      <div class="auth__options">
        <label class="check">
          <input v-model="form.remember" class="check__input" type="checkbox" />
          <span class="check__box" aria-hidden="true"></span>
          <span>保持登录</span>
        </label>
      </div>

      <p v-if="errorMessage" class="auth__error" role="alert">{{ errorMessage }}</p>

      <button class="btn auth__submit" type="submit" :disabled="loading">
        <span v-if="loading" class="btn__spinner" aria-hidden="true"></span>
        {{ loading ? '登录中…' : '登录' }}
        <AppIcon v-if="!loading" name="arrow" :size="17" />
      </button>
    </form>

    <template #footer>还没有账号？ <RouterLink :to="{ name: 'register' }">立即注册</RouterLink></template>
  </AuthLayout>
</template>
