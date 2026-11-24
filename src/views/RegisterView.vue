<script setup>
import { reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import PasswordField from '@/components/PasswordField.vue'
import { register } from '@/api/auth'

const router = useRouter()

const form = reactive({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const errorMessage = ref('')

watch(form, () => {
  errorMessage.value = ''
})

function validate() {
  if (!form.username.trim()) return '请输入账号'
  if (!form.nickname.trim()) return '请输入昵称'
  if (!form.password) return '请输入密码'
  if ([...form.password].length < 6) return '密码至少 6 位'
  if (new TextEncoder().encode(form.password).length > 72) return '密码最多 72 字节'
  if (!form.confirmPassword) return '请再次输入密码'
  if (form.password !== form.confirmPassword) return '两次输入的密码不一致'
  return ''
}

async function handleSubmit() {
  if (loading.value) return

  errorMessage.value = validate()
  if (errorMessage.value) return

  loading.value = true
  try {
    await register({
      username: form.username.trim(),
      nickname: form.nickname.trim(),
      password: form.password,
    })
    await router.replace({ name: 'login', query: { registered: '1' } })
  } catch (err) {
    errorMessage.value = err?.message || '注册失败,请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="auth">
    <div class="auth__panel">
      <header class="auth__header">
        <span class="auth__mark" aria-hidden="true"></span>
        <h1 class="auth__title">创建账号</h1>
        <p class="auth__subtitle">注册后即可使用工作室考勤</p>
      </header>

      <form class="auth__form" novalidate @submit.prevent="handleSubmit">
        <div class="field">
          <label class="field__label" for="username">账号</label>
          <input
            id="username"
            v-model="form.username"
            class="field__input"
            type="text"
            name="username"
            autocomplete="username"
            placeholder="用于登录的账号"
            maxlength="64"
            autofocus
          />
        </div>

        <div class="field">
          <label class="field__label" for="nickname">昵称</label>
          <input
            id="nickname"
            v-model="form.nickname"
            class="field__input"
            type="text"
            name="nickname"
            autocomplete="nickname"
            placeholder="显示给其他人的名字"
            maxlength="64"
          />
        </div>

        <PasswordField
          id="password"
          v-model="form.password"
          label="密码"
          placeholder="请设置密码"
          autocomplete="new-password"
          hint="至少 6 位"
        />

        <PasswordField
          id="confirmPassword"
          v-model="form.confirmPassword"
          label="确认密码"
          placeholder="请再次输入密码"
          autocomplete="new-password"
        />

        <p v-if="errorMessage" class="auth__error" role="alert">{{ errorMessage }}</p>

        <button class="btn" type="submit" :disabled="loading">
          <span v-if="loading" class="btn__spinner" aria-hidden="true"></span>
          {{ loading ? '注册中…' : '注册' }}
        </button>
      </form>

      <p class="auth__footer">已有账号?<RouterLink :to="{ name: 'login' }">去登录</RouterLink></p>
    </div>
  </main>
</template>
