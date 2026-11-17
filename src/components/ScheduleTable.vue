<script setup>
import { computed } from 'vue'
import {
  WEEKDAY_LABELS,
  addDays,
  formatMonthDay,
  getCourseColor,
  isSameDay,
} from '@/utils/schedule'

const props = defineProps({
  courses: { type: Array, default: () => [] },
  // 节次时间,来自 GET /schedule/semester,每项 { index, start, end }
  sections: { type: Array, default: () => [] },
  monday: { type: Date, required: true },
  week: { type: Number, required: true },
})

const today = new Date()

// 网格行以"第几节"为行号:配置里有时间的行显示时刻,课表用到但后端没配的行只占位。
// 行数取两者的最大值,课程块就不会被挤到网格外。
const rows = computed(() => {
  const maxSection = props.courses.reduce((max, c) => Math.max(max, Number(c.end_section) || 0), 0)
  const total = Math.max(props.sections.length, maxSection)
  const byIndex = new Map(props.sections.map((s) => [s.index, s]))
  return Array.from({ length: total }, (_, i) => {
    const conf = byIndex.get(i + 1)
    return { index: i + 1, start: conf?.start ?? '', end: conf?.end ?? '' }
  })
})

const gridStyle = computed(() => ({
  gridTemplateRows: `56px repeat(${rows.value.length}, var(--row-height))`,
}))

const days = computed(() =>
  WEEKDAY_LABELS.map((label, i) => {
    const date = addDays(props.monday, i)
    return {
      label,
      date: formatMonthDay(date),
      isToday: isSameDay(date, today),
    }
  }),
)

const blocks = computed(() =>
  props.courses.map((c) => {
    const color = getCourseColor(c.course_name)
    return {
      ...c,
      style: {
        gridColumn: c.weekday + 1,
        gridRow: `${c.start_section + 1} / ${c.end_section + 2}`,
        '--course-bg': color.bg,
        '--course-fg': color.fg,
      },
    }
  }),
)

const year = computed(() => props.monday.getFullYear())
</script>

<template>
  <div class="schedule">
    <div class="schedule__grid" :style="gridStyle">
      <div class="schedule__corner">
        <span class="schedule__year">{{ year }}</span>
        <span class="schedule__week">第 {{ week }} 周</span>
      </div>

      <div
        v-for="(day, i) in days"
        :key="day.label"
        class="schedule__day"
        :class="{ 'is-today': day.isToday }"
        :style="{ gridColumn: i + 2, gridRow: 1 }"
      >
        <span class="schedule__day-name">周{{ day.label }}</span>
        <span class="schedule__day-date">{{ day.date }}</span>
      </div>

      <template v-for="s in rows" :key="s.index">
        <div
          class="schedule__time"
          :class="{ 'is-pair-end': s.index % 2 === 0, 'is-last': s.index === rows.length }"
          :style="{ gridColumn: 1, gridRow: s.index + 1 }"
        >
          <span class="schedule__section">{{ s.index }}</span>
          <span class="schedule__clock">{{ s.start }}</span>
          <span class="schedule__clock">{{ s.end }}</span>
        </div>

        <div
          v-for="(day, i) in days"
          :key="`${s.index}-${i}`"
          class="schedule__cell"
          :class="{
            'is-pair-end': s.index % 2 === 0,
            'is-last': s.index === rows.length,
            'is-today': day.isToday,
          }"
          :style="{ gridColumn: i + 2, gridRow: s.index + 1 }"
        ></div>
      </template>

      <article
        v-for="c in blocks"
        :key="c.id"
        class="course"
        :style="c.style"
        :title="`${c.course_name}\n${c.teacher || ''}\n${c.location}`"
      >
        <h3 class="course__name">{{ c.course_name }}</h3>
        <p v-if="c.teacher" class="course__meta">{{ c.teacher }}</p>
        <p class="course__meta course__location">@{{ c.location }}</p>
      </article>
    </div>
  </div>
</template>

<style scoped>
.schedule {
  overflow-x: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.schedule__grid {
  --row-height: 64px;
  display: grid;
  grid-template-columns: 64px repeat(7, minmax(96px, 1fr));
  /* 行数取决于后端节次配置,由 gridStyle 内联覆盖 */
  grid-template-rows: 56px repeat(13, var(--row-height));
  min-width: 760px;
}

.schedule__corner,
.schedule__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-bottom: 1px solid var(--color-border-strong);
}

.schedule__corner {
  grid-column: 1;
  grid-row: 1;
}

.schedule__year {
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 500;
}

.schedule__week {
  font-size: 12px;
  color: var(--color-text-muted);
}

.schedule__day-name {
  font-size: 14px;
  font-weight: 500;
}

.schedule__day-date {
  font-size: 12px;
  color: var(--color-text-faint);
}

.schedule__day.is-today .schedule__day-name,
.schedule__day.is-today .schedule__day-date {
  color: var(--color-accent);
}

.schedule__day.is-today {
  box-shadow: inset 0 -2px 0 var(--color-accent);
}

.schedule__time {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  border-bottom: 1px solid var(--color-border);
}

.schedule__section {
  font-family: var(--font-serif);
  font-size: 16px;
  line-height: 1.2;
}

.schedule__clock {
  font-size: 11px;
  line-height: 1.3;
  color: var(--color-text-faint);
  font-variant-numeric: tabular-nums;
}

.schedule__cell {
  border-left: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}

.schedule__cell.is-today {
  background: rgba(201, 100, 66, 0.04);
}

.schedule__time.is-pair-end,
.schedule__cell.is-pair-end {
  border-bottom-color: var(--color-border-strong);
}

.schedule__time.is-last,
.schedule__cell.is-last {
  border-bottom: 0;
}

.course {
  z-index: 1;
  min-width: 0;
  margin: 3px;
  padding: 7px 8px;
  overflow: hidden;
  background: var(--course-bg);
  color: var(--course-fg);
  border-radius: var(--radius-md);
  cursor: default;
}

.course__name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
}

.course__meta {
  margin: 3px 0 0;
  font-size: 12px;
  line-height: 1.35;
  opacity: 0.8;
}

.course__location {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  overflow: hidden;
  word-break: break-all;
}
</style>
