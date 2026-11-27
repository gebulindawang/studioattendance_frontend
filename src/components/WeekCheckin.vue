<script setup>
defineProps({
  record: { type: Object, required: true },
  state: { type: String, required: true },
  date: { type: String, required: true },
  section: { type: Number, required: true },
  signingId: { type: Number, default: null },
})
const emit = defineEmits(['sign'])
</script>

<template>
  <button v-if="state === 'open'" type="button" class="btn btn--sm" :aria-label="date + ' 第 ' + section + ' 节签到'"
    :disabled="signingId !== null" @click="emit('sign', record)">
    {{ signingId === record.id ? '签到中…' : '签到' }}
  </button>
  <span v-else-if="state === 'signed' || state === 'made-up'" class="checkin-result">
    <span class="tag tag--ok">{{ state === 'signed' ? '已签到' : '已补签' }}</span>
    <small v-if="record.checkin_time">{{ record.checkin_time.slice(11, 16) }}</small>
  </span>
  <span v-else class="tag" :class="state === 'closed' ? 'tag--warn' : 'tag--muted'">
    {{ state === 'closed' ? '已截止' : '未开始' }}
  </span>
</template>

<style scoped>
.checkin-result { display: inline-grid; justify-items: center; gap: 2px; }
.checkin-result small { font: 500 11px/1.2 var(--font-data); color: var(--color-text-muted); }
</style>
