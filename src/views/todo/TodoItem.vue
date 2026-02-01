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
  if (typeof props.punchedMinutes === 'number') return props.punchedMinutes
  if (props.todo.unit !== 'minutes') return 0
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

const progressPercentage = computed(() => {
  if (props.todo.done) return 100
  if (props.todo.period === 'once') return 0 // Goals without done status don't show % bar unless we have a specific target logic

  let percentage = 0
  if (props.todo.unit === 'minutes') {
    const totalTarget = props.todo.minFrequency * (props.todo.minutesPerTime || 0)
    if (totalTarget > 0) {
      percentage = (minutesDone.value / totalTarget) * 100
    }
  } else {
    // Times
    if (props.todo.minFrequency > 0) {
      percentage = (props.todo.punchIns / props.todo.minFrequency) * 100
    }
  }
  return Math.min(100, Math.max(0, percentage))
})

const isUnstarted = computed(() => {
  return !props.todo.done && props.todo.punchIns === 0 && minutesDone.value === 0
})
</script>

<template>
  <div
    class="p-2 mb-2 rounded-lg transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer last-of-type:mb-0 bg-neutral-100 dark:bg-neutral-800 relative"
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
            variant="outline"
            theme="default"
            size="small"
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
            variant="outline"
            theme="default"
            size="small"
            @click.stop="emit('toggle-done', todo.id, true)"
          >
            <template #icon>
              <check-circle-icon size="14" />
            </template>
          </t-button>

          <t-button
            shape="square"
            variant="outline"
            theme="default"
            size="small"
            @click.stop="emit('edit', todo.id)"
          >
            <template v-slot:icon>
              <edit-icon size="14" />
            </template>
          </t-button>

          <!-- 目标历史按钮 (仅目标显示) -->
          <t-button
            v-if="todo.period === 'once'"
            shape="square"
            variant="outline"
            theme="default"
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
            theme="danger"
            variant="outline"
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
          (todo.category && todo.period === 'once') ||
          isUnstarted
        "
      >
        <t-tag
          v-if="isUnstarted"
          size="small"
          variant="light"
          theme="danger"
          class="text-neutral-400"
        >
          尚未开始
        </t-tag>
        <t-tag
          v-if="todo.category && todo.period === 'once'"
          size="small"
          variant="outline"
          class="bg-(--cat-tag-bg) text-(--cat-tag-text) border-(--cat-tag-border) dark:bg-(--cat-tag-bg-dark) dark:text-(--cat-tag-text-dark) dark:border-(--cat-tag-border-dark)"
        >
          {{ todo.category }}
        </t-tag>
        <t-tag
          v-if="
            (todo.period !== 'once' && (todo.punchIns > 0 || todo.unit === 'minutes')) ||
            (todo.period === 'once' && (todo.punchIns > 0 || minutesDone > 0))
          "
          size="small"
          variant="light"
          theme="primary"
        >
          <template v-if="todo.unit === 'minutes'">
            {{ minutesDone }}/{{ todo.minFrequency * (todo.minutesPerTime || 0) }} 分钟
          </template>
          <template v-else-if="todo.period === 'once' && minutesDone > 0">
            已投入 {{ minutesDone }} 分钟
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

    <!-- Progress Bar (Bottom) -->
    <div
      v-if="progressPercentage > 0"
      class="absolute bottom-0 left-0 h-1 bg-teal-500/20 w-full rounded-b-lg overflow-hidden"
    >
      <div
        class="h-full bg-teal-500 transition-all duration-300"
        :style="{ width: `${progressPercentage}%` }"
      ></div>
    </div>
  </div>
</template>
<style lang="scss" scoped></style>
