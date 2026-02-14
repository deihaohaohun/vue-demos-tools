<script setup lang="ts">
import {
  IconRefresh,
  IconCheck,
  IconEdit,
  IconCheckCircle,
  IconClose,
  IconClockCircle,
} from '@arco-design/web-vue/es/icon'
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
  minutesToday?: number
  showMetaTags?: boolean
  compact?: boolean
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
      const dayOfWeek = now.day()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const weekStart = now.startOf('day').subtract(diff, 'day')
      end = weekStart.add(6, 'day').endOf('day')
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
  const map: Record<string, 'arcoblue' | 'green' | 'orange' | 'red' | 'gray'> = {
    daily: 'arcoblue',
    weekly: 'green',
    monthly: 'orange',
    yearly: 'red',
    once: 'gray',
  }
  return map[period] || 'default'
}

const progressPercentage = computed(() => {
  // For 'once' (Goals), no bar unless specific logic.
  if (props.todo.period === 'once') return 0

  let percentage = 0

  // Minute tasks: Strict calculation
  if (props.todo.unit === 'minutes') {
    const totalTarget = props.todo.minFrequency * (props.todo.minutesPerTime || 0)
    if (totalTarget > 0) {
      percentage = (minutesDone.value / totalTarget) * 100
    }
  } else {
    // Times
    // If explicitly done, treat as 100%
    if (props.todo.done) return 100

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
    class="p-2 mb-2 rounded-lg transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer last-of-type:mb-0 bg-neutral-100 dark:bg-neutral-900 relative hover:scale-[1.01] hover:shadow-md hover:bg-white dark:hover:bg-neutral-800"
    @click.stop="emit('toggle-select', todo.id)"
  >
    <div class="pointer-events-none flex flex-col gap-2 flex-1 min-w-0">
      <!-- 第一行：任务名称 + 操作按钮 -->
      <div class="flex items-center justify-between gap-1">
        <a-tooltip
          :content="todo.title"
          placement="top-left"
          show-arrow
          :mouse-enter-delay="300"
          class="flex-1 min-w-0 pointer-events-auto"
        >
          <div class="text-base font-medium text-neutral-800 dark:text-neutral-200 truncate">
            {{ todo.title }}
          </div>
        </a-tooltip>

        <!-- 操作按钮组 (移到第一行) -->
        <div class="flex gap-1 items-center shrink-0 pointer-events-auto">
          <a-button
            v-if="todo.period !== 'once'"
            type="outline"
            size="mini"
            @click.stop="emit('punch-in', todo.id)"
          >
            <template #icon>
              <icon-refresh v-if="todo.punchIns > 0" />
              <icon-check v-if="todo.punchIns <= 0" />
            </template>
          </a-button>

          <a-button
            v-if="todo.period === 'once' && !todo.done"
            type="outline"
            size="mini"
            @click.stop="emit('toggle-done', todo.id, true)"
          >
            <template #icon>
              <icon-check-circle />
            </template>
          </a-button>

          <a-button type="outline" size="mini" @click.stop="emit('edit', todo.id)">
            <template v-slot:icon>
              <icon-edit />
            </template>
          </a-button>

          <!-- 目标历史按钮 (仅目标显示) -->
          <a-button
            v-if="todo.period === 'once'"
            type="outline"
            size="mini"
            title="查看进度记录"
            @click.stop="emit('view-history', todo.id)"
          >
            <template #icon>
              <icon-clock-circle />
            </template>
          </a-button>

          <a-button
            v-if="!(todo.period === 'once' && todo.done)"
            :title="todo.period === 'once' ? '放弃目标' : '归档'"
            type="outline"
            status="danger"
            size="mini"
            @click.stop="emit('archive', todo.id)"
          >
            <template #icon>
              <icon-close />
            </template>
          </a-button>
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
        <a-tag v-if="isUnstarted" size="small" color="red" class="text-neutral-400">
          尚未开始
        </a-tag>
        <a-tag v-if="todo.category && todo.period === 'once'" size="small" type="outline">
          {{ todo.category }}
        </a-tag>
        <a-tag
          v-if="
            (todo.period !== 'once' && (todo.punchIns > 0 || todo.unit === 'minutes')) ||
            (todo.period === 'once' && minutesDone > 0)
          "
          size="small"
          type="primary"
        >
          <!-- 目标任务只显示投入时间 -->
          <template v-if="todo.period === 'once'">
            <span>总计 {{ minutesDone }} 分钟</span>
          </template>
          <template v-else>
            <!-- 非目标任务：按分钟或次数显示 -->
            <template v-if="todo.unit === 'minutes'">
              {{ minutesDone }}/{{ todo.minFrequency * (todo.minutesPerTime || 0) }} 分钟
            </template>
            <template v-else>{{ todo.punchIns }}/{{ todo.minFrequency }} 次 </template>
          </template>
        </a-tag>
        <a-tag
          v-if="todo.period === 'once' && minutesToday && minutesToday > 0"
          size="small"
          color="green"
        >
          今日 +{{ minutesToday }} 分钟
        </a-tag>
        <a-tag v-if="remainingTime" size="small" color="orange">
          {{ remainingTime }}
        </a-tag>
        <a-tag v-if="todo.period !== 'once'" size="small" :color="getPeriodTheme(todo.period)">
          {{ periodTextMap[todo.period] }}
        </a-tag>
      </div>
    </div>

    <!-- Progress Bar (Bottom) -->
    <div
      v-if="progressPercentage > 0"
      class="absolute bottom-0 left-0 h-1 bg-neutral-200 dark:bg-neutral-600 w-full rounded-b-lg overflow-hidden"
    >
      <div
        class="h-full bg-teal-500 transition-all duration-300"
        :style="{ width: `${progressPercentage}%` }"
      ></div>
    </div>
  </div>
</template>
<style lang="scss" scoped></style>
