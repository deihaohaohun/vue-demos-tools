<script setup lang="ts">
import {
  RefreshIcon,
  CheckIcon,
  EditIcon,
  CheckCircleIcon,
  CloseIcon,
  TimeIcon,
} from 'tdesign-icons-vue-next'
import { computed } from 'vue'
import dayjs from 'dayjs'

interface Todo {
  title: string
  id: string
  done: boolean
  completedAt?: number
  punchIns: number
  category: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once'
  minFrequency: number
  unit: 'times' | 'minutes'
  minutesPerTime?: number
  description?: string
  deadline?: number
}

interface Props {
  todo: Todo
  punchedMinutes?: number
  showMetaTags?: boolean
}

interface Emits {
  (e: 'toggle-select', id: string): void
  (e: 'toggle-done', id: string, done: boolean): void
  (e: 'punch-in', id: string): void
  (e: 'edit', id: string): void
  (e: 'archive', id: string): void
  (e: 'view-history', id: string): void
}

const props = withDefaults(defineProps<Props>(), {
  showMetaTags: true,
})
const emit = defineEmits<Emits>()

const periodTextMap: Record<Todo['period'], string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
  once: '目标',
}

const getMinutesDone = (todo: Todo) => {
  if (todo.unit !== 'minutes') return 0
  return todo.punchIns * (todo.minutesPerTime || 0)
}

const minutesDone = computed(() => {
  if (props.todo.unit !== 'minutes') return 0
  if (typeof props.punchedMinutes === 'number') return props.punchedMinutes
  return getMinutesDone(props.todo)
})

const remainingTime = computed(() => {
  if (props.todo.done) return null
  const now = dayjs()
  let end: dayjs.Dayjs

  if (props.todo.period === 'once') {
    if (!props.todo.deadline) return null
    end = dayjs(props.todo.deadline)
    // 如果没有具体时间，默认为当天结束
    if (end.hour() === 0 && end.minute() === 0) {
      end = end.endOf('day')
    }
  } else {
    // 周期任务
    if (props.todo.period === 'daily') {
      end = dayjs().endOf('day')
    } else if (props.todo.period === 'weekly') {
      end = dayjs().endOf('week')
    } else if (props.todo.period === 'monthly') {
      end = dayjs().endOf('month')
    } else if (props.todo.period === 'yearly') {
      end = dayjs().endOf('year')
    } else {
      return null
    }
  }

  const diff = end.diff(now)
  if (diff <= 0) return '已结束'

  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (d > 0) return `${d}天${h}小时`
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (h > 0) return `${h}小时${m}分`
  return `${m}分`
})

const hashString = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

const getCategoryCssVars = (category: string) => {
  if (!category) return {}
  const seed = hashString(category)
  const h = (seed * 137.508) % 360
  return {
    '--cat-bg': `hsl(${h} 90% 96%)`,
    '--cat-bg-hover': `hsl(${h} 90% 93%)`,
    '--cat-border': `hsl(${h} 70% 85%)`,
    '--cat-bg-dark': `hsla(${h}, 60%, 18%, 0.35)`,
    '--cat-bg-hover-dark': `hsla(${h}, 60%, 18%, 0.5)`,
    '--cat-border-dark': `hsla(${h}, 50%, 45%, 0.45)`,
    '--cat-tag-bg': `hsl(${h} 85% 90%)`,
    '--cat-tag-border': `hsl(${h} 70% 82%)`,
    '--cat-tag-text': `hsl(${h} 40% 28%)`,
    '--cat-tag-bg-dark': `hsla(${h}, 60%, 25%, 0.55)`,
    '--cat-tag-border-dark': `hsla(${h}, 55%, 45%, 0.55)`,
    '--cat-tag-text-dark': `hsl(${h} 80% 80%)`,
  } as Record<string, string>
}

const getPeriodTheme = (period: string) => {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
    daily: 'primary',
    weekly: 'success',
    monthly: 'warning',
    yearly: 'danger',
    once: 'default',
  }
  return map[period] || 'default'
}
</script>

<template>
  <div
    class="p-2 mb-2 rounded-lg border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer last-of-type:mb-0"
    :class="
      todo.category
        ? 'bg-(--cat-bg) hover:bg-(--cat-bg-hover) border-(--cat-border) dark:bg-(--cat-bg-dark) dark:hover:bg-(--cat-bg-hover-dark) dark:border-(--cat-border-dark)'
        : 'bg-white dark:bg-neutral-900 border-transparent'
    "
    :style="getCategoryCssVars(todo.category)"
    @click.stop="emit('toggle-select', todo.id)"
  >
    <div class="pointer-events-none flex flex-col gap-2 flex-1 min-w-0">
      <!-- 第一行：任务名称 + 操作按钮 -->
      <div class="flex items-center justify-between gap-1">
        <t-tooltip
          :content="todo.title"
          placement="top-left"
          show-arrow
          :mouse-enter-delay="300"
          class="flex-1 min-w-0 pointer-events-auto"
        >
          <div class="text-base font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {{ todo.title }}
          </div>
        </t-tooltip>

        <!-- 操作按钮组 (移到第一行) -->
        <div class="flex gap-1 items-center shrink-0 pointer-events-auto">
          <t-button
            v-if="todo.period !== 'once'"
            shape="square"
            theme="primary"
            size="small"
            variant="text"
            @click.stop="emit('punch-in', todo.id)"
          >
            <template #icon>
              <refresh-icon v-if="todo.punchIns > 0" size="14" />
              <check-icon v-if="todo.punchIns <= 0" size="14" />
            </template>
          </t-button>

          <t-button
            shape="square"
            v-if="todo.period === 'once' && !todo.done"
            theme="success"
            size="small"
            variant="text"
            @click.stop="emit('toggle-done', todo.id, true)"
          >
            <template #icon>
              <check-circle-icon size="14" />
            </template>
          </t-button>

          <t-button shape="square" variant="text" size="small" @click.stop="emit('edit', todo.id)">
            <template v-slot:icon>
              <edit-icon size="14" />
            </template>
          </t-button>

          <!-- 目标历史按钮 (仅目标显示) -->
          <t-button
            v-if="todo.period === 'once'"
            shape="square"
            variant="text"
            theme="primary"
            size="small"
            title="查看进度记录"
            @click.stop="emit('view-history', todo.id)"
          >
            <template #icon>
              <time-icon size="14" />
            </template>
          </t-button>

          <t-button
            v-if="!(todo.period === 'once' && todo.done)"
            :title="todo.period === 'once' ? '放弃目标' : '归档'"
            :theme="todo.period === 'once' ? 'danger' : 'warning'"
            variant="text"
            size="small"
            shape="square"
            @click.stop="emit('archive', todo.id)"
          >
            <template #icon>
              <close-icon />
            </template>
          </t-button>
        </div>
      </div>

      <!-- 第二行：打卡进度与剩余时间 -->
      <div
        class="flex flex-wrap items-center gap-2"
        v-if="
          todo.punchIns > 0 ||
          todo.unit === 'minutes' ||
          remainingTime ||
          (todo.category && todo.period === 'once')
        "
      >
        <t-tag
          v-if="todo.category && todo.period === 'once'"
          size="small"
          variant="outline"
          class="bg-(--cat-tag-bg) text-(--cat-tag-text) border-(--cat-tag-border) dark:bg-(--cat-tag-bg-dark) dark:text-(--cat-tag-text-dark) dark:border-(--cat-tag-border-dark)"
        >
          {{ todo.category }}
        </t-tag>
        <t-tag
          v-if="todo.punchIns > 0 || todo.unit === 'minutes'"
          size="small"
          variant="light"
          theme="primary"
        >
          <template v-if="todo.unit === 'minutes'">
            {{ minutesDone }}/{{ todo.minFrequency * (todo.minutesPerTime || 0) }} 分钟
          </template>
          <template v-else> {{ todo.punchIns }}/{{ todo.minFrequency }} 次 </template>
        </t-tag>
        <t-tag v-if="remainingTime" size="small" variant="light" theme="warning">
          {{ remainingTime }}
        </t-tag>
        <t-tag
          v-if="todo.period !== 'once'"
          size="small"
          variant="light"
          :theme="getPeriodTheme(todo.period)"
        >
          {{ periodTextMap[todo.period] }}
        </t-tag>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
