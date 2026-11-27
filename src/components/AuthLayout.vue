<script setup>
import StudioBrand from '@/components/StudioBrand.vue'
import fold from '@/assets/studio-fold.webp'

defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
})
</script>

<template>
  <main class="auth">
    <div class="auth__visual" aria-hidden="true">
      <img :src="fold" alt="" width="960" height="1200" fetchpriority="high" />
      <StudioBrand class="auth__visual-brand" />
      <p class="auth__caption"><span>今天也一起</span><span>把想法变成作品。</span></p>
    </div>
    <div class="auth__entry">
      <div class="auth__panel">
        <StudioBrand class="auth__mobile-brand" />
        <header class="auth__header">
          <h1 class="auth__title">{{ title }}</h1>
          <p class="auth__subtitle">{{ description }}</p>
        </header>
        <slot />
        <p v-if="$slots.footer" class="auth__footer"><slot name="footer" /></p>
      </div>
    </div>
  </main>
</template>
