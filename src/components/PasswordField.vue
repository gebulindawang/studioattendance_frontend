<script setup>
import { ref } from 'vue'

defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  name: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  autocomplete: { type: String, default: 'current-password' },
  hint: { type: String, default: '' },
})

const model = defineModel({ type: String, default: '' })
const visible = ref(false)
</script>

<template>
  <div class="field">
    <label class="field__label" :for="id">{{ label }}</label>
    <div class="field__control">
      <input
        :id="id"
        v-model="model"
        class="field__input field__input--with-action"
        :type="visible ? 'text' : 'password'"
        :name="name || id"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
      />
      <button
        class="field__action"
        type="button"
        :aria-label="visible ? '隐藏密码' : '显示密码'"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <svg
          v-if="!visible"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1" />
          <path d="M6.6 6.6A16.6 16.6 0 0 0 2 12s3.6 7 10 7c1.8 0 3.4-.5 4.8-1.2" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          <path d="m3 3 18 18" />
        </svg>
      </button>
    </div>
    <span v-if="hint" class="field__hint">{{ hint }}</span>
  </div>
</template>
