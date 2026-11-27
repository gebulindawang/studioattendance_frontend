<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  placeholder: { type: String, required: true },
  label: { type: String, required: true },
})
const value = defineModel({ type: String, default: '' })
</script>

<template>
  <label class="search-control">
    <AppIcon name="search" :size="16" />
    <input v-model="value" type="search" class="control" :placeholder="placeholder" :aria-label="label" />
  </label>
</template>
