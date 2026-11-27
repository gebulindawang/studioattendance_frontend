<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 18 },
})

const paths = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  calendar: 'M8 3v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  history: 'M8 5h12M8 12h12M8 19h12M4 5h.01M4 12h.01M4 19h.01',
  clock: 'M22 12a10 10 0 1 0-20 0 10 10 0 1 0 20 0ZM12 7v5l3 2',
  upload: 'M12 16V4m-4 4 4-4 4 4M4 16v4h16v-4',
  user: 'M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2',
  users: 'M15 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM3 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2m-1-17a4 4 0 0 1 0 8m4 9v-2a4 4 0 0 0-2-3.5',
  logout: 'M11 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h6m-1-8h11m-4-4 4 4-4 4',
  arrow: 'M4 12h15m-6-6 6 6-6 6',
  back: 'M20 12H5m6-6-6 6 6 6',
  chevron: 'm9 5 7 7-7 7',
  check: 'm5 12 4 4L19 6',
  checkCircle: 'M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0Zm-13 0 3 3 5-6',
  records: 'M8 4H5a1 1 0 0 0-1 1v15a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3M8 3h8v4H8zM8 12h8m-8 4h8',
  settings: 'M4 7h5m5 0h6M4 17h10m5 0h1M9 7a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Zm5 10a2.5 2.5 0 1 0 5 0 2.5 2.5 0 0 0-5 0Z',
  image: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Zm0 10 5-5 4 4 4-6 5 7M8 8h.01',
  search: 'M16 16l4 4M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M18 6 6 18',
  calendarCheck: 'M8 3v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm3 10 2 2 5-5',
  spark: 'M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2Z',
  alert: 'M12 8v5m0 3h.01M10.4 4.9 3.1 17.5A1.7 1.7 0 0 0 4.6 20h14.8a1.7 1.7 0 0 0 1.5-2.5L13.6 4.9a1.8 1.8 0 0 0-3.2 0Z',
  maximize: 'M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4',
}
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path :d="paths[name]" />
  </svg>
</template>
