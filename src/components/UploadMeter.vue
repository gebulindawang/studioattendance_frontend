<script setup>
import { computed } from 'vue'

const props = defineProps({
  used: { type: Number, required: true },
  max: { type: Number, required: true },
})

const remaining = computed(() => Math.max(props.max - props.used, 0))
const exhausted = computed(() => remaining.value === 0)
</script>

<template>
  <div class="meter" :class="{ 'is-exhausted': exhausted }">
    <span class="meter__dots" aria-hidden="true">
      <span v-for="i in max" :key="i" class="meter__dot" :class="{ 'is-used': i <= used }"></span>
    </span>
    <span class="meter__text">
      已上传 {{ used }}/{{ max }} 次<template v-if="exhausted"> · 次数已用完</template
      ><template v-else> · 还可上传 {{ remaining }} 次</template>
    </span>
  </div>
</template>

<style scoped>
.meter {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.meter__dots {
  display: inline-flex;
  gap: 4px;
}

.meter__dot {
  width: 22px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-border);
}

.meter__dot.is-used {
  background: var(--color-accent);
}

.meter.is-exhausted .meter__text {
  color: var(--color-danger);
}

.meter.is-exhausted .meter__dot.is-used {
  background: var(--color-danger);
}
</style>
