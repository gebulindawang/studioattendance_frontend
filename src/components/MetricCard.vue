<script setup>
import AppIcon from '@/components/AppIcon.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: '—' },
  icon: { type: String, required: true },
  tone: { type: String, default: 'blue' },
})
</script>

<template>
  <article class="panel metric" :class="'metric--' + tone">
    <div class="metric__label">{{ label }}</div>
    <strong class="metric__value">{{ value }}</strong>
    <span class="metric__icon"><AppIcon :name="icon" /></span>
  </article>
</template>

<style scoped>
.metric {
  --metric-bg: #eef0ff;
  --metric-fg: #3e50d4;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px 8px;
  padding: 17px 19px;
}
.metric--green { --metric-bg: #e6f7ee; --metric-fg: #16704b; }
.metric--amber { --metric-bg: #fff3df; --metric-fg: #95570d; }
.metric--slate { --metric-bg: #eef1f8; --metric-fg: #4e6081; }
.metric__label { align-self: center; color: var(--color-text-muted); font-size: 12px; font-weight: 650; }
.metric__value { align-self: end; font: 730 clamp(23px, 4vw, 34px)/1 var(--font-data); letter-spacing: -.055em; font-variant-numeric: tabular-nums; }
.metric__icon { grid-column: 2; grid-row: 1 / 3; align-self: start; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; background: var(--metric-bg); color: var(--metric-fg); }
@media (max-width: 620px) {
  .metric { padding: 12px 11px; gap: 6px 3px; }
  .metric__icon { width: 27px; height: 27px; border-radius: 8px; }
  .metric__icon :deep(svg) { width: 15px; height: 15px; }
}
</style>
