<script setup>
import { SCHEDULE_STATUS_LABELS, SCHEDULE_STATUS_TONES } from '@/constants/scheduleStatus'

defineProps({
  status: { type: String, required: true },
})
</script>

<template>
  <span class="tag" :class="`tag--${SCHEDULE_STATUS_TONES[status]}`">
    {{ SCHEDULE_STATUS_LABELS[status] }}
  </span>
</template>
