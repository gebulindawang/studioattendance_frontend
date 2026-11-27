<script setup>
defineProps({
  context: { type: String, default: '工作室考勤' },
})
</script>

<template>
  <span class="studio-brand">
    <span class="studio-brand__mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span class="studio-brand__name">{{ context }}</span>
  </span>
</template>

<style scoped>
.studio-brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; white-space: nowrap; }
.studio-brand__mark {
  display: grid; flex: 0 0 auto; grid-template: repeat(2, 7px) / repeat(2, 7px);
  gap: 2px; place-content: center; width: 36px; height: 36px;
  border-radius: 11px; background: #3750f0; box-shadow: inset 0 1px 0 #ffffff55;
  transform: rotate(-5deg);
}
.studio-brand__mark i { background: white; border-radius: 1px; }
.studio-brand__mark i:nth-child(2) { transform: translate(1px, -1px); opacity: .6; }
.studio-brand__name { font-size: 15px; font-weight: 750; letter-spacing: .02em; }
</style>
