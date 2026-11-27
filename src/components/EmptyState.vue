<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: 'calendar' },
  tone: { type: String, default: 'blue' },
})
</script>

<template>
  <div class="empty" :class="'empty--' + tone">
    <div class="empty__icon" aria-hidden="true">
      <slot name="icon"><AppIcon :name="icon" :size="25" /></slot>
    </div>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
    <div v-if="$slots.default" class="empty__actions"><slot /></div>
  </div>
</template>

<style scoped>
.empty { display: grid; justify-items: center; padding: clamp(30px, 6vw, 62px) 20px; text-align: center; }
.empty__icon { display: grid; place-items: center; width: 57px; height: 57px; margin-bottom: 15px; color: var(--color-accent); background: var(--color-accent-soft); border-radius: 17px; }
.empty--green .empty__icon { color: #196344; background: #e5f6ed; }
.empty--danger .empty__icon { color: var(--color-danger); background: var(--color-danger-bg); }
.empty h2 { margin: 0; font-size: 19px; font-weight: 730; }
.empty p { max-width: 420px; margin: 7px 0 0; color: var(--color-text-muted); }
.empty__actions { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px; margin-top: 19px; }
</style>
