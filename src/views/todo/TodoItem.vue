<script setup lang="ts">
import { RefreshIcon, CheckIcon, EditIcon, Delete1Icon, CheckCircleIcon } from 'tdesign-icons-vue-next'
import { computed } from 'vue'
import dayjs from 'dayjs'

interface Todo {
  title: string
  id: string
  done: boolean
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
  (e: 'delete', id: string): void
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
</script>

<template>
  <div
    class="p-2 dark:hover:bg-neutral-950 hover:bg-neutral-100 transition-all ease-in-out duration-200 rounded-md flex items-center justify-between cursor-pointer mb-2 last-of-type:mb-0"
    @click.stop="emit('toggle-select', todo.id)">
    <div class="pointer-events-none flex items-center gap-2">
      <span>{{ todo.title }}</span>
      <t-tag v-if="todo.category" size="small" variant="outline" theme="primary">{{
        todo.category
      }}</t-tag>
      <t-tag size="small" variant="outline" theme="default">{{ periodTextMap[todo.period] }}</t-tag>
      <t-tag size="small" variant="light" theme="default">
        <template v-if="todo.unit === 'minutes'">
          目标 {{ todo.minFrequency }} 次 × {{ todo.minutesPerTime || 0 }} 分钟
        </template>
        <template v-else>目标 {{ todo.minFrequency }} 次</template>
      </t-tag>
      <template v-if="todo.description">
        <span>任务详情: </span>
        <t-tag size="small">
          {{ todo.description }}
        </t-tag>
      </template>
      <t-tag v-if="todo.punchIns > 0" size="small" variant="light" theme="primary">
        <template v-if="todo.unit === 'minutes'"> 已打卡 {{ getMinutesDone(todo) }} 分钟 </template>
        <template v-else>已打卡 {{ todo.punchIns }} 次</template>
      </t-tag>
      <t-tag v-if="remainingTime" size="small" variant="light" theme="warning">
        打卡时间还剩: {{ remainingTime }}
      </t-tag>
    </div>

    <div class="flex gap-2">
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

      <t-button theme="danger" size="small" @click.stop="emit('delete', todo.id)">
        <template #icon>
          <delete1-icon size="12" />
        </template>
        删除
      </t-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
