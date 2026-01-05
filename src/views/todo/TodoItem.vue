<script setup lang="ts">
import { RefreshIcon, CheckIcon, EditIcon, CheckCircleIcon, CloseIcon } from 'tdesign-icons-vue-next'
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
}

interface Emits {
  (e: 'toggle-select', id: string): void
  (e: 'toggle-done', id: string, done: boolean): void
  (e: 'punch-in', id: string): void
  (e: 'edit', id: string): void
  (e: 'archive', id: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const periodTextMap: Record<Todo['period'], string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
  once: '一次性',
}

const getMinutesDone = (todo: Todo) => {
  if (todo.unit !== 'minutes') return 0
  return todo.punchIns * (todo.minutesPerTime || 0)
}

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
    'daily': 'primary',
    'weekly': 'success',
    'monthly': 'warning',
    'yearly': 'danger',
    'once': 'default',
  }
  return map[period] || 'default'
}
</script>

<template>
  <div
    class="p-3 mb-2 rounded-lg border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer last-of-type:mb-0"
    :class="todo.category
      ? 'bg-(--cat-bg) hover:bg-(--cat-bg-hover) border-(--cat-border) dark:bg-(--cat-bg-dark) dark:hover:bg-(--cat-bg-hover-dark) dark:[border-color:var(--cat-border-dark)]'
      : 'bg-white dark:bg-neutral-900 border-transparent'" :style="getCategoryCssVars(todo.category)"
    @click.stop="emit('toggle-select', todo.id)">
    <div class="pointer-events-none flex flex-col sm:flex-row sm:items-center gap-y-2 gap-x-3 flex-1">
      <!-- 任务名称行 -->
      <div class="text-base font-medium text-neutral-800 dark:text-neutral-200 shrink-0">
        {{ todo.title }}
      </div>

      <!-- 任务分类, 周期, 频率行 -->
      <div class="flex flex-wrap items-center gap-2">
        <span v-if="todo.category"
          class="px-2 rounded text-[11px] font-semibold border bg-(--cat-tag-bg) border-(--cat-tag-border) text-(--cat-tag-text) dark:bg-(--cat-tag-bg-dark) dark:border-(--cat-tag-border-dark) dark:text-(--cat-tag-text-dark)">
          {{ todo.category }}
        </span>
        <t-tag size="small" variant="dark" :theme="getPeriodTheme(todo.period)">{{ periodTextMap[todo.period] }}</t-tag>
        <t-tag size="small" variant="light" theme="default">
          <template v-if="todo.unit === 'minutes'">
            目标 {{ todo.minFrequency }} 次 × {{ todo.minutesPerTime || 0 }} 分钟
          </template>
          <template v-else>目标 {{ todo.minFrequency }} 次</template>
        </t-tag>
      </div> <!-- 其他信息行 (描述, 打卡进度, 剩余时间) -->
      <div class="flex flex-wrap items-center gap-2">
        <template v-if="todo.description">
          <t-tag size="small" variant="outline" theme="default" class="max-w-[200px] truncate">
            {{ todo.description }}
          </t-tag>
        </template>
        <t-tag v-if="todo.punchIns > 0" size="small" variant="light" theme="primary">
          <template v-if="todo.unit === 'minutes'"> 已打卡 {{ getMinutesDone(todo) }} 分 </template>
          <template v-else>已打卡 {{ todo.punchIns }} 次</template>
        </t-tag>
        <t-tag v-if="remainingTime" size="small" variant="light" theme="warning">
          {{ remainingTime }}
        </t-tag>
        <t-tag v-if="todo.period === 'once' && todo.done && todo.completedAt" size="small" variant="light"
          theme="success">
          完成于 {{ dayjs(todo.completedAt).format('YYYY-MM-DD HH:mm') }}
        </t-tag>
      </div>
    </div>

    <div class="flex gap-2 items-center mt-3 sm:mt-0 justify-end shrink-0">
      <t-button v-if="todo.period !== 'once'" theme="primary" size="small" @click.stop="emit('punch-in', todo.id)">
        <template #icon>
          <refresh-icon v-if="todo.punchIns > 0" size="12" />
          <check-icon v-if="todo.punchIns <= 0" size="12" />
        </template>
        {{ todo.punchIns > 0 ? '再次打卡' : '打卡' }}
      </t-button>

      <t-button v-if="todo.period === 'once' && !todo.done" theme="success" size="small"
        @click.stop="emit('toggle-done', todo.id, true)">
        <template #icon>
          <check-circle-icon size="12" />
        </template>
        完成目标
      </t-button>

      <t-button theme="default" variant="outline" size="small" @click.stop="emit('edit', todo.id)">
        <template #icon>
          <edit-icon size="12" />
        </template>
        编辑
      </t-button>

      <t-button v-if="!(todo.period === 'once' && todo.done)" :title="todo.period === 'once' ? '放弃目标' : '归档'"
        :theme="todo.period === 'once' ? 'danger' : 'warning'" variant="text" size="small" shape="square"
        @click.stop="emit('archive', todo.id)">
        <template #icon>
          <close-icon />
        </template>
      </t-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
