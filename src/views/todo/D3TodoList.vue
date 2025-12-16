<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import TodoItem from './TodoItem.vue'
import { useTodoCharts } from './useTodoCharts'
import { useTodoHeatmap } from './useTodoHeatmap'
import { useTodoStore, type TodoPeriod, type TodoUnit } from './useTodoStore'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

const {
  todos,
  dayStats,
  history,
  todayKey,
  formatDayKey,
  getTodoMinutesPerPunch,
  getTodoById,
  punchInTodo,
  createTodo,
  addTodoFromHistory,
  deleteTodoById,
  toggleTodoDone,
  applyTodoEdit,
  removeHistoryItem,
  clearHistoryAll,
} = useTodoStore()

const title = ref('')
const category = ref<string>('学习')
const period = ref<TodoPeriod>('daily')
const minFrequency = ref<number>(1)
const unit = ref<TodoUnit>('times')
const minutesPerTime = ref<number>(15)

watch(period, (p) => {
  if (p === 'once') {
    unit.value = 'times'
    minFrequency.value = 1
    minutesPerTime.value = 15
  }
})

const categoryOptions = ['学习', '娱乐', '运动', '工作', '生活']
const selectedIds = ref<Set<string>>(new Set())

const editVisible = ref(false)
const editingTodoId = ref<string | null>(null)
const editTitle = ref('')
const editCategory = ref<string>('学习')
const editPeriod = ref<TodoPeriod>('daily')
const editMinFrequency = ref<number>(1)
const editUnit = ref<TodoUnit>('times')
const editMinutesPerTime = ref<number>(15)

const todayDisplay = computed(() => {
  const w = ['日', '一', '二', '三', '四', '五', '六']
  return `${todayKey.value} 周${w[new Date().getDay()]}`
})

const openEdit = (id: string) => {
  const todo = getTodoById(id)
  if (!todo) return
  editingTodoId.value = id
  editTitle.value = todo.title
  editCategory.value = todo.category || '未分类'
  editPeriod.value = todo.period
  editMinFrequency.value = todo.minFrequency
  editUnit.value = todo.unit
  editMinutesPerTime.value = typeof todo.minutesPerTime === 'number' ? todo.minutesPerTime : 15
  editVisible.value = true
}

const saveEdit = () => {
  const id = editingTodoId.value
  if (!id) return
  const ok = applyTodoEdit(id, {
    category: editCategory.value,
    minFrequency: editMinFrequency.value,
    minutesPerTime: editMinutesPerTime.value,
  })
  if (!ok) return

  editVisible.value = false
  editingTodoId.value = null
  MessagePlugin.success('已保存修改')
}

const pendingTodos = computed(() => todos.value.filter((todo) => !todo.done))
const completedTodos = computed(() => todos.value.filter((todo) => todo.done))

const removeHistory = (text: string) => {
  const ok = removeHistoryItem(text)
  if (!ok) return
  MessagePlugin.success('已删除历史任务记录')
}

const clearHistory = () => {
  const ok = clearHistoryAll()
  if (!ok) return
  MessagePlugin.success('已清空历史任务记录')
}

const handlePunchIn = (id: string) => {
  const res = punchInTodo(id)
  if (res.kind === 'not_found') return
  if (res.kind === 'once') return
  if (res.kind === 'auto_done') {
    MessagePlugin.success('已达成目标，自动完成')
    return
  }
  MessagePlugin.success(`打卡成功,当前已打卡 ${res.punchIns} 次`)
}

const addTodo = () => {
  const res = createTodo({
    title: title.value,
    category: category.value,
    period: period.value,
    minFrequency: minFrequency.value,
    unit: unit.value,
    minutesPerTime: minutesPerTime.value,
  })
  if (res.kind === 'empty') {
    MessagePlugin.error('任务标题不能为空')
    return
  }
  if (res.kind === 'exists') {
    MessagePlugin.info(`任务已存在,请${res.action}`)
    return
  }
  if (res.kind === 'added') {
    title.value = ''
  }
}

const addFromHistory = (text: string) => {
  const res = addTodoFromHistory(text, {
    category: category.value,
    period: period.value,
    minFrequency: minFrequency.value,
    unit: unit.value,
    minutesPerTime: minutesPerTime.value,
  })
  if (res.kind === 'exists') {
    MessagePlugin.info('已存在相同名称任务')
    return
  }
  MessagePlugin.success('已从历史任务记录添加')
}

const deleteTodo = (id: string) => {
  const res = deleteTodoById(id)
  if (res.kind === 'not_found') return

  for (const rid of res.removedIds) selectedIds.value.delete(rid)

  if (res.kind === 'skipped') {
    MessagePlugin.success('已跳过今天')
    return
  }

  MessagePlugin.success('任务已删除')
}

const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

const toggleDone = (id: string, done: boolean) => {
  toggleTodoDone(id, done)
}

const todayTodos = computed(() => todos.value.filter((t) => t.dayKey === todayKey.value))
const todayCompletedCount = computed(() => todayTodos.value.filter((t) => t.done).length)
const todayPendingCount = computed(() => todayTodos.value.filter((t) => !t.done).length)
const todayPunchInsTotal = computed(() =>
  todayTodos.value.reduce((sum, t) => sum + (t.punchIns || 0), 0),
)
const todayMinutesTotal = computed(() =>
  todayTodos.value.reduce((sum, t) => {
    if (t.unit !== 'minutes') return sum
    return sum + (t.punchIns || 0) * getTodoMinutesPerPunch(t)
  }, 0),
)

useTodoHeatmap({
  todayKey,
  todayPunchInsTotal,
  todayMinutesTotal,
  todayCompletedCount,
  dayStats,
})

const statsRange = ref<'today' | '7d' | '30d'>('today')

const getDayKeyOffsetFromToday = (offsetDays: number) => {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + offsetDays)
  return formatDayKey(base.getTime())
}

const rangeDays = computed(() => {
  if (statsRange.value === '7d') return 7
  if (statsRange.value === '30d') return 30
  return 1
})

const rangeDayKeys = computed(() => {
  const days = rangeDays.value
  const keys: string[] = []
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(getDayKeyOffsetFromToday(-i))
  }
  return keys
})

const rangeStats = computed(() => {
  return rangeDayKeys.value.map((dk) => {
    if (dk === todayKey.value) {
      return {
        dayKey: dk,
        createdCount: todayTodos.value.length,
        completedCount: todayCompletedCount.value,
        punchInsTotal: todayPunchInsTotal.value,
        minutesTotal: todayMinutesTotal.value,
      }
    }
    const stat = dayStats.value[dk]
    return {
      dayKey: dk,
      createdCount: stat?.createdCount || 0,
      completedCount: stat?.completedCount || 0,
      punchInsTotal: stat?.punchInsTotal || 0,
      minutesTotal: stat?.minutesTotal || 0,
    }
  })
})

const rangeLabels = computed(() => {
  if (statsRange.value === 'today') return ['今日']
  return rangeDayKeys.value.map(formatShortDay)
})

const punchInsSeries = computed(() => rangeStats.value.map((s) => s.punchInsTotal))
const minutesSeries = computed(() => rangeStats.value.map((s) => s.minutesTotal))

const rangeCategoryCreated = computed(() => {
  const map: Record<string, number> = {}
  if (statsRange.value === 'today') {
    for (const t of todayTodos.value) {
      const k = t.category || '未分类'
      map[k] = (map[k] || 0) + 1
    }
    return map
  }

  for (const dk of rangeDayKeys.value) {
    const stat = dayStats.value[dk]
    if (!stat) continue
    for (const [c, v] of Object.entries(stat.categoryCreated || {})) {
      map[c] = (map[c] || 0) + (v || 0)
    }
  }
  return map
})

const { punchInsByCategoryOption, punchInsOption, minutesOption, categoryOption } = useTodoCharts({
  todos,
  rangeDayKeys,
  rangeLabels,
  punchInsSeries,
  minutesSeries,
  rangeCategoryCreated,
})

const formatShortDay = (dayKey: string) => {
  // YYYY-MM-DD -> MM-DD
  return dayKey.slice(5)
}
</script>

<template>
  <div class="w-screen h-screen dark:bg-neutral-900 overflow-auto bg-neutral-50 pb-4">
    <div class="w-[1200px] mx-auto pt-4">
      <div class="text-sm text-neutral-500 mb-2">今天是: {{ todayDisplay }}</div>
      <div class="flex gap-2 items-center justify-center">
        <t-input autofocus v-model="title" :onEnter="addTodo" placeholder="添加一个任务"></t-input>
        <t-button @click="addTodo">添加</t-button>
      </div>
    </div>

    <div class="w-[1200px] mx-auto mt-4 grid grid-cols-12 gap-2">
      <div class="col-span-12 md:col-span-6 flex items-center gap-2">
        <div class="text-sm text-neutral-500 w-[72px]">任务分类</div>
        <t-radio-group v-model="category" variant="default-filled" size="small">
          <t-radio-button v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</t-radio-button>
        </t-radio-group>
      </div>

      <div class="col-span-12 md:col-span-6 flex items-center gap-2">
        <div class="text-sm text-neutral-500 w-[72px]">任务周期</div>
        <t-radio-group v-model="period" variant="default-filled" size="small">
          <t-radio-button value="daily">每天</t-radio-button>
          <t-radio-button value="weekly">每周</t-radio-button>
          <t-radio-button value="monthly">每月</t-radio-button>
          <t-radio-button value="yearly">每年</t-radio-button>
          <t-radio-button value="once">一次性</t-radio-button>
        </t-radio-group>
      </div>

      <div class="col-span-12 md:col-span-6 flex items-center gap-2">
        <div class="text-sm text-neutral-500 w-[72px]">任务单位</div>
        <t-radio-group
          v-model="unit"
          variant="default-filled"
          size="small"
          :disabled="period === 'once'"
        >
          <t-radio-button value="times">次数</t-radio-button>
          <t-radio-button value="minutes">分钟</t-radio-button>
        </t-radio-group>
      </div>

      <div class="col-span-12 md:col-span-6 flex items-center gap-2">
        <div class="text-sm text-neutral-500 w-[72px]">最小次数</div>
        <t-radio-group
          v-model="minFrequency"
          variant="default-filled"
          size="small"
          :disabled="period === 'once'"
        >
          <t-radio-button :value="1">1</t-radio-button>
          <t-radio-button :value="2">2</t-radio-button>
          <t-radio-button :value="3">3</t-radio-button>
          <t-radio-button :value="4">4</t-radio-button>
        </t-radio-group>
        <div class="text-sm text-neutral-400">次</div>
      </div>

      <div class="col-span-12 md:col-span-6 flex items-center gap-2">
        <div class="text-sm text-neutral-500 w-[72px]">每次分钟</div>
        <t-radio-group
          v-model="minutesPerTime"
          variant="default-filled"
          size="small"
          :disabled="period === 'once' || unit !== 'minutes'"
        >
          <t-radio-button :value="12">12</t-radio-button>
          <t-radio-button :value="15">15</t-radio-button>
          <t-radio-button :value="18">18</t-radio-button>
          <t-radio-button :value="20">20</t-radio-button>
        </t-radio-group>
        <div class="text-sm text-neutral-400">分钟</div>
      </div>
    </div>

    <div class="w-[1200px] mx-auto mt-4 flex flex-wrap gap-2">
      <div class="text-sm text-neutral-500 flex items-center">历史任务记录:</div>
      <t-button
        v-if="history.length"
        size="small"
        theme="danger"
        variant="text"
        @click="clearHistory"
      >
        清空
      </t-button>
      <template v-if="history.length">
        <t-tag v-for="item in history" :key="item" variant="outline" class="transition-colors">
          <span class="cursor-pointer hover:text-blue-600" @click="addFromHistory(item)">{{
            item
          }}</span>
          <span
            class="ml-2 cursor-pointer text-neutral-400 hover:text-red-500"
            @click.stop="removeHistory(item)"
          >
            ×
          </span>
        </t-tag>
      </template>
      <div v-else class="text-sm text-neutral-400 flex items-center">暂无历史数据</div>
    </div>

    <div class="w-[1200px] mx-auto mt-4 rounded-md overflow-hidden">
      <t-tabs :default-value="1">
        <t-tab-panel :value="1" :label="`待完成 (${pendingTodos.length})`">
          <div class="p-2">
            <template v-if="pendingTodos.length">
              <TodoItem
                v-for="todo in pendingTodos"
                :key="todo.id"
                :todo="todo"
                @toggle-select="toggleSelect"
                @toggle-done="toggleDone"
                @punch-in="handlePunchIn"
                @edit="openEdit"
                @delete="deleteTodo"
              />
            </template>
            <template v-else>
              <div class="w-full h-[300px] flex flex-col items-center justify-center">
                <t-empty />
              </div>
            </template>
          </div>
        </t-tab-panel>
        <t-tab-panel :value="2" :label="`已完成 (${completedTodos.length})`">
          <div class="p-2">
            <template v-if="completedTodos.length">
              <TodoItem
                v-for="todo in completedTodos"
                :key="todo.id"
                :todo="todo"
                @toggle-select="toggleSelect"
                @toggle-done="toggleDone"
                @punch-in="handlePunchIn"
                @edit="openEdit"
                @delete="deleteTodo"
              />
            </template>
            <template v-else>
              <div class="w-full h-[300px] flex flex-col items-center justify-center">
                <t-empty />
              </div>
            </template>
          </div>
        </t-tab-panel>
      </t-tabs>

      <div
        class="p-3 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800"
      >
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="text-sm text-neutral-500">数据统计</div>
          <t-radio-group v-model="statsRange" variant="default-filled" size="small">
            <t-radio-button value="today">今日</t-radio-button>
            <t-radio-button value="7d">7天</t-radio-button>
            <t-radio-button value="30d">30天</t-radio-button>
          </t-radio-group>
        </div>

        <div class="grid grid-cols-4 gap-2 mb-4">
          <div
            class="p-2 rounded bg-gradient-to-br from-green-100 to-green-50 dark:from-green-950 dark:to-neutral-900"
          >
            <div class="text-xs text-neutral-500">已完成</div>
            <div class="text-lg">{{ todayCompletedCount }}</div>
          </div>
          <div
            class="p-2 rounded bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-950 dark:to-neutral-900"
          >
            <div class="text-xs text-neutral-500">未完成</div>
            <div class="text-lg">{{ todayPendingCount }}</div>
          </div>
          <div
            class="p-2 rounded bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-neutral-900"
          >
            <div class="text-xs text-neutral-500">打卡次数</div>
            <div class="text-lg">{{ todayPunchInsTotal }}</div>
          </div>
          <div
            class="p-2 rounded bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950 dark:to-neutral-900"
          >
            <div class="text-xs text-neutral-500">累计分钟</div>
            <div class="text-lg">{{ todayMinutesTotal }}</div>
          </div>
        </div>

        <div class="rounded-md bg-neutral-50 dark:bg-neutral-900 p-2 mb-3">
          <div class="text-xs text-neutral-500 mb-4">最近一年活跃热力图（打卡次数/分钟数）</div>
          <div class="w-full overflow-x-auto">
            <div class="w-fit mx-auto">
              <div id="todo-cal-heatmap" class="min-w-[980px]"></div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">每天每种任务类型的打卡次数</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="punchInsByCategoryOption" style="height: 100%; width: 100%" />
            </div>
          </div>

          <div class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">任务分类（数量）</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="categoryOption" style="height: 100%; width: 100%" />
            </div>
          </div>

          <div class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">打卡次数趋势</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="punchInsOption" style="height: 100%; width: 100%" />
            </div>
          </div>

          <div class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">分钟数趋势</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="minutesOption" style="height: 100%; width: 100%" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <t-dialog v-model:visible="editVisible" header="编辑任务" width="560px" :footer="false">
      <div class="grid grid-cols-12 gap-3">
        <div class="col-span-12">
          <div class="text-sm text-neutral-500 mb-1">任务名称</div>
          <t-input v-model="editTitle" placeholder="请输入任务名称" disabled />
        </div>

        <div class="col-span-12">
          <div class="text-sm text-neutral-500 mb-1">任务分类</div>
          <t-radio-group v-model="editCategory" variant="default-filled" size="small">
            <t-radio-button v-for="c in categoryOptions" :key="c" :value="c">{{
              c
            }}</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12">
          <div class="text-sm text-neutral-500 mb-1">任务周期</div>
          <t-radio-group v-model="editPeriod" variant="default-filled" size="small" disabled>
            <t-radio-button value="daily">每天</t-radio-button>
            <t-radio-button value="weekly">每周</t-radio-button>
            <t-radio-button value="monthly">每月</t-radio-button>
            <t-radio-button value="yearly">每年</t-radio-button>
            <t-radio-button value="once">一次性</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12 md:col-span-6">
          <div class="text-sm text-neutral-500 mb-1">最低频率</div>
          <t-radio-group
            v-model="editMinFrequency"
            variant="default-filled"
            size="small"
            :disabled="editPeriod === 'once'"
          >
            <t-radio-button :value="1">1</t-radio-button>
            <t-radio-button :value="2">2</t-radio-button>
            <t-radio-button :value="3">3</t-radio-button>
            <t-radio-button :value="4">4</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12 md:col-span-6">
          <div class="text-sm text-neutral-500 mb-1">任务单位</div>
          <t-radio-group v-model="editUnit" variant="default-filled" size="small" disabled>
            <t-radio-button value="times">次数</t-radio-button>
            <t-radio-button value="minutes">分钟</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12">
          <div class="text-sm text-neutral-500 mb-1">每次分钟</div>
          <t-radio-group
            v-model="editMinutesPerTime"
            variant="default-filled"
            size="small"
            :disabled="editPeriod === 'once' || editUnit !== 'minutes'"
          >
            <t-radio-button :value="12">12</t-radio-button>
            <t-radio-button :value="15">15</t-radio-button>
            <t-radio-button :value="18">18</t-radio-button>
            <t-radio-button :value="20">20</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12 flex justify-end gap-2 pt-2">
          <t-button variant="outline" @click="editVisible = false">取消</t-button>
          <t-button theme="primary" @click="saveEdit">保存</t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<style lang="scss" scoped>
#todo-cal-heatmap {
  display: flex;
  justify-content: center;
}
</style>
