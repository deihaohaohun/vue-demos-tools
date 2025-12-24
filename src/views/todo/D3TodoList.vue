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
import { useTodoStore, type TodoPeriod, type TodoUnit, type HistoryItem, type PunchRecord } from './useTodoStore'
import { AddIcon, ChevronLeftIcon, ChevronRightIcon } from 'tdesign-icons-vue-next'
import dayjs from 'dayjs'
import { useNumberAnimation } from '@/composables/useNumberAnimation'

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
  punchRecords,
  todayKey,
  formatDayKey,
  getTodoMinutesPerPunch,
  getTodoById,
  punchInTodo,
  updatePunchRecordNote,
  createTodo,
  addTodoFromHistory,
  deleteTodoById,
  toggleTodoDone,
  applyTodoEdit,
  removeHistoryItem,
  consecutivePunchDays,
  maxConsecutivePunchDays,
  templates,
} = useTodoStore()

const title = ref('')
const category = ref<string>('学习')
const period = ref<TodoPeriod>('daily')
const minFrequency = ref<number>(1)
const unit = ref<TodoUnit>('times')
const minutesPerTime = ref<number>(15)
const description = ref('')
const deadline = ref<string>('') // YYYY-MM-DD

watch(period, (p) => {
  if (p === 'once') {
    unit.value = 'times'
    minFrequency.value = 1
    minutesPerTime.value = 15
  }
})

const getCategoryTheme = (category: string) => {
  const map: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
    '学习': 'primary',
    '娱乐': 'success',
    '运动': 'warning',
    '工作': 'danger',
    '生活': 'default',
  }
  return map[category] || 'primary'
}

const periodicHistory = computed(() => history.value.filter(h => h.period !== 'once'))
const periodicCategories = computed(() => [...new Set(periodicHistory.value.map(h => h.category))])

const unfinishedGoalTodos = computed(() => todos.value.filter(t => t.period === 'once' && !t.done))
const completedGoalTodos = computed(() => todos.value.filter(t => t.period === 'once' && t.done))

// 打卡弹窗相关
const punchDialogVisible = ref(false)
const punchNote = ref('')
const currentPunchId = ref('')

const onPunchTrigger = (id: string) => {
  currentPunchId.value = id
  punchNote.value = ''
  punchDialogVisible.value = true
}

const confirmPunch = () => {
  if (!currentPunchId.value) return
  punchDialogVisible.value = false

  const res = punchInTodo(currentPunchId.value, punchNote.value)
  if (res.kind === 'not_found') return
  if (res.kind === 'once') return
  if (res.kind === 'auto_done') {
    MessagePlugin.success('已达成目标，自动完成')
    return
  }
  MessagePlugin.success(`打卡成功,当前已打卡 ${res.punchIns} 次`)
}

// 历史打卡记录Tab页相关
const historyDate = ref(dayjs().format('YYYY-MM-DD'))
const currentHistoryRecords = computed(() => {
  const targetDayKey = historyDate.value
  return punchRecords.value.filter((r) => r.dayKey === targetDayKey)
})

const prevDay = () => {
  historyDate.value = dayjs(historyDate.value).subtract(1, 'day').format('YYYY-MM-DD')
}
const nextDay = () => {
  historyDate.value = dayjs(historyDate.value).add(1, 'day').format('YYYY-MM-DD')
}
const isToday = computed(() => historyDate.value === dayjs().format('YYYY-MM-DD'))

const editingRecordId = ref<string | null>(null)
const editingRecordNote = ref('')

const startEditRecord = (record: PunchRecord) => {
  editingRecordId.value = record.id
  editingRecordNote.value = record.note || ''
}
const saveRecordNote = () => {
  if (editingRecordId.value) {
    updatePunchRecordNote(editingRecordId.value, editingRecordNote.value)
    editingRecordId.value = null
    MessagePlugin.success('备注已更新')
  }
}

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
const editDescription = ref('')
const editDeadline = ref<string>('')

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
  editDescription.value = todo.description || ''
  editDeadline.value = todo.deadline ? dayjs(todo.deadline).format('YYYY-MM-DD') : ''
  editVisible.value = true
}

const saveEdit = () => {
  const id = editingTodoId.value
  if (!id) return
  const ok = applyTodoEdit(id, {
    title: editTitle.value,
    category: editCategory.value,
    period: editPeriod.value,
    minFrequency: editMinFrequency.value,
    unit: editUnit.value,
    minutesPerTime: editMinutesPerTime.value,
    description: editDescription.value.trim() || undefined,
    deadline: editPeriod.value === 'once' && editDeadline.value ? dayjs(editDeadline.value).valueOf() : undefined,
  })
  if (!ok) return

  editVisible.value = false
  editingTodoId.value = null
  MessagePlugin.success('已保存修改')
}

const allDisplayTodos = computed(() =>
  [...todos.value].sort((a, b) => (a.category || '').localeCompare(b.category || 'zh'))
)

const removeHistory = (item: HistoryItem) => {
  const ok = removeHistoryItem(item)
  if (!ok) return
  MessagePlugin.success('已删除历史模板记录')
}

const handlePunchIn = (id: string) => {
  onPunchTrigger(id)
}

const addTodo = () => {
  const res = createTodo({
    title: title.value,
    category: category.value,
    period: period.value,
    minFrequency: minFrequency.value,
    unit: unit.value,
    minutesPerTime: minutesPerTime.value,
    description: description.value.trim() || undefined,
    deadline: period.value === 'once' && deadline.value ? dayjs(deadline.value).valueOf() : undefined,
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
    description.value = ''
    deadline.value = ''
  }
}

const addFromHistory = (historyItem: HistoryItem) => {
  const res = addTodoFromHistory(historyItem.title, {
    category: historyItem.category,
    period: historyItem.period,
    minFrequency: historyItem.minFrequency,
    unit: historyItem.unit,
    minutesPerTime: historyItem.minutesPerTime,
    description: historyItem.description,
  })
  if (res.kind === 'exists') {
    MessagePlugin.info('已存在相同名称任务')
    return
  }
  if (res.kind === 'exists_unfinished') {
    MessagePlugin.warning('上个目标还没达成')
    return
  }
  MessagePlugin.success('已从历史模板记录添加')
}

const deleteTodo = (id: string) => {
  const res = deleteTodoById(id)
  if (res.kind === 'not_found') return

  for (const rid of res.removedIds) selectedIds.value.delete(rid)

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
// const todayPendingCount = computed(() => todayTodos.value.filter((t) => !t.done).length)
const todayPunchInsTotal = computed(() =>
  todayTodos.value.reduce((sum, t) => sum + (t.punchIns || 0), 0),
)
const todayMinutesTotal = computed(() =>
  todayTodos.value.reduce((sum, t) => {
    if (t.unit !== 'minutes') return sum
    return sum + (t.punchIns || 0) * getTodoMinutesPerPunch(t)
  }, 0),
)


// 当天可以打卡的总任务数 (所有今天显示的任务，排除一次性)
const todayScheduledCount = computed(() => todayTodos.value.filter((t) => t.period !== 'once').length)
// 当日还剩几个可以打卡但是未打卡的数量 (punchIns === 0，排除一次性)
const todayUnstartedCount = computed(() =>
  todayTodos.value.filter((t) => t.period !== 'once' && t.punchIns === 0).length,
)
// 未完成目标数 (一次性任务 && 未完成)
const unfinishedGoalsCount = computed(
  () => todayTodos.value.filter((t) => t.period === 'once' && !t.done).length,
)

// 今日已打卡任务数 (排除一次性)
const todayPunchedCount = computed(() => todayTodos.value.filter((t) => t.period !== 'once' && t.punchIns > 0).length)

// 昨日数据对比
const yesterdayKey = computed(() => dayjs().subtract(1, 'day').format('YYYY-MM-DD'))
const yesterdayStat = computed(() => dayStats.value[yesterdayKey.value] || { punchInsTotal: 0, minutesTotal: 0 })
const punchInsDiff = computed(() => todayPunchInsTotal.value - (yesterdayStat.value.punchInsTotal || 0))
const minutesDiff = computed(() => todayMinutesTotal.value - (yesterdayStat.value.minutesTotal || 0))

const animatedScheduled = useNumberAnimation(todayScheduledCount)
const animatedUnstarted = useNumberAnimation(todayUnstartedCount)
const animatedUnfinishedGoals = useNumberAnimation(unfinishedGoalsCount)
const animatedPunchIns = useNumberAnimation(todayPunchInsTotal)
const animatedMinutes = useNumberAnimation(todayMinutesTotal)
const animatedConsecutive = useNumberAnimation(consecutivePunchDays)
const animatedMaxConsecutive = useNumberAnimation(maxConsecutivePunchDays)

const { heatmapLoading } = useTodoHeatmap({
  todayKey,
  todayPunchInsTotal,
  todayMinutesTotal,
  todayCompletedCount,
  dayStats,
})

const statsRange = ref<'7d' | '30d'>('7d')

const getDayKeyOffsetFromToday = (offsetDays: number) => {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + offsetDays)
  return formatDayKey(base.getTime())
}

const rangeDays = computed(() => {
  if (statsRange.value === '7d') return 7
  if (statsRange.value === '30d') return 30
  return 7
})

const rangeDayKeys = computed(() => {
  const days = rangeDays.value
  const keys: string[] = []
  // 从今天开始往前推 days 天 (0 到 days-1)
  for (let i = days - 1; i >= 0; i -= 1) {
    keys.push(getDayKeyOffsetFromToday(-i))
  }
  return keys
})

const rangeStats = computed(() => {
  return rangeDayKeys.value.map((dk) => {
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
  return rangeDayKeys.value.map(formatShortDay)
})

const punchInsSeries = computed(() => rangeStats.value.map((s) => s.punchInsTotal))
const minutesSeries = computed(() => rangeStats.value.map((s) => s.minutesTotal))

const templateCategoryCounts = computed(() => {
  const map: Record<string, number> = {}
  for (const tpl of templates.value) {
    const c = tpl.category || '未分类'
    map[c] = (map[c] || 0) + 1
  }
  return map
})

const { punchInsByCategoryOption, punchInsOption, minutesOption, categoryOption } = useTodoCharts({
  todos,
  dayStats,
  rangeDayKeys,
  rangeLabels,
  punchInsSeries,
  minutesSeries,
  categoryCounts: templateCategoryCounts,
})

const formatShortDay = (dayKey: string) => {
  // YYYY-MM-DD -> MM-DD
  return dayKey.slice(5)
}
</script>

<template>
  <div class="w-screen h-screen dark:bg-neutral-900 overflow-auto bg-neutral-50 pb-4">
    <div class="w-[1200px] mx-auto pt-4">
      <div class="text-2xl text-neutral-500 mb-2">今天是: {{ todayDisplay }}</div>
      <div class="flex gap-2 items-center justify-center">
        <t-input autofocus v-model="title" :onEnter="addTodo" placeholder="添加一个任务"></t-input>
        <t-button @click="addTodo">
          <template #icon>
            <add-icon size="24" />
          </template>
          新建任务模板
        </t-button>
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
        <t-radio-group v-model="unit" variant="default-filled" size="small" :disabled="period === 'once'">
          <t-radio-button value="times">次数</t-radio-button>
          <t-radio-button value="minutes">分钟</t-radio-button>
        </t-radio-group>
      </div>

      <div class="col-span-12 md:col-span-6 flex items-center gap-2">
        <div class="text-sm text-neutral-500 w-[72px]">最小频率</div>
        <t-radio-group v-model="minFrequency" variant="default-filled" size="small" :disabled="period === 'once'">
          <t-radio-button :value="1">1</t-radio-button>
          <t-radio-button :value="2">2</t-radio-button>
          <t-radio-button :value="3">3</t-radio-button>
          <t-radio-button :value="4">4</t-radio-button>
        </t-radio-group>
        <div class="text-sm text-neutral-400">次</div>
      </div>

      <div class="col-span-12 md:col-span-6 flex items-center gap-2">
        <div class="text-sm text-neutral-500 w-[72px]">每次分钟</div>
        <t-radio-group v-model="minutesPerTime" variant="default-filled" size="small"
          :disabled="period === 'once' || unit !== 'minutes'">
          <t-radio-button :value="12">12</t-radio-button>
          <t-radio-button :value="15">15</t-radio-button>
          <t-radio-button :value="18">18</t-radio-button>
          <t-radio-button :value="20">20</t-radio-button>
        </t-radio-group>
        <div class="text-sm text-neutral-400">分钟</div>
      </div>

      <div class="col-span-12 flex items-center gap-2">
        <div class="text-sm text-neutral-500 w-[72px]">任务描述</div>
        <t-input v-model="description" placeholder="可选：添加任务的详细描述" class="flex-1" />
      </div>

      <div class="col-span-12 flex items-center gap-2" v-if="period === 'once'">
        <div class="text-sm text-neutral-500 w-[72px]">截止日期</div>
        <t-date-picker v-model="deadline" placeholder="可选：选择截止日期" class="flex-1" />
      </div>
    </div>

    <div class="w-[1200px] mx-auto mt-4 flex flex-wrap gap-2">
      <div class="text-sm text-neutral-500 flex items-center">历史添加模板记录:</div>
      <div v-if="!history.length" class="text-sm text-neutral-400 flex items-center">暂无历史数据</div>
    </div>

    <div class="w-[1200px] mx-auto mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <!-- Periodic Categories -->
      <div v-for="cat in periodicCategories" :key="cat"
        class="p-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div class="text-sm text-neutral-500 mb-2 font-bold flex items-center gap-2">
          <span>{{ cat }} (模板)</span>
          <t-tag size="small" variant="light" :theme="getCategoryTheme(cat)">{{periodicHistory.filter(h => h.category
            === cat).length}}</t-tag>
        </div>
        <div class="flex flex-wrap gap-2">
          <t-tag v-for="item in periodicHistory.filter(h => h.category === cat)"
            :key="`${item.title}-${item.category}-${item.period}`" variant="outline" class="transition-colors"
            :theme="getCategoryTheme(cat)">
            <span class="cursor-pointer hover:opacity-70" @click="addFromHistory(item)">{{
              item.title
              }}</span>
            <span class="ml-2 cursor-pointer text-neutral-400 hover:text-red-500" @click.stop="removeHistory(item)">
              ×
            </span>
          </t-tag>
        </div>
      </div>

      <!-- Unfinished Goals -->
      <div class="p-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div class="text-sm text-neutral-500 mb-2 font-bold flex items-center gap-2">
          <span>未完成目标</span>
          <t-tag size="small" variant="light" theme="warning">{{ unfinishedGoalTodos.length }}</t-tag>
        </div>
        <div class="flex flex-wrap gap-2">
          <t-tag v-for="todo in unfinishedGoalTodos" :key="todo.id" variant="outline" theme="warning">
            <span>{{ todo.title }}</span>
          </t-tag>
          <div v-if="!unfinishedGoalTodos.length" class="text-xs text-neutral-400">暂无未完成目标</div>
        </div>
      </div>

      <!-- Completed Goals -->
      <div class="p-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div class="text-sm text-neutral-500 mb-2 font-bold flex items-center gap-2">
          <span>已完成目标</span>
          <t-tag size="small" variant="light" theme="success">{{ completedGoalTodos.length }}</t-tag>
        </div>
        <div class="flex flex-wrap gap-2">
          <t-tag v-for="todo in completedGoalTodos" :key="todo.id" variant="outline" theme="success">
            <span>{{ todo.title }}</span>
            <check-icon class="ml-1" />
          </t-tag>
          <div v-if="!completedGoalTodos.length" class="text-xs text-neutral-400">暂无已完成目标</div>
        </div>
      </div>
    </div>

    <div class="w-[1200px] mx-auto mt-4 rounded-md overflow-hidden">
      <t-tabs :default-value="1">
        <t-tab-panel :value="1" :label="`任务列表 (${allDisplayTodos.length})`">
          <div class="min-h-[300px]" :class="{ 'p-2': allDisplayTodos.length }">
            <template v-if="allDisplayTodos.length">
              <TodoItem v-for="todo in allDisplayTodos" :key="todo.id" :todo="todo" @toggle-select="toggleSelect"
                @toggle-done="toggleDone" @punch-in="handlePunchIn" @edit="openEdit" @delete="deleteTodo" />
            </template>
            <template v-else>
              <div class="w-full h-[300px] flex flex-col items-center justify-center">
                <t-empty />
              </div>
            </template>
          </div>
        </t-tab-panel>
        <t-tab-panel :value="3" label="打卡记录">
          <div class="min-h-[300px] p-2">
            <div
              class="flex items-center justify-between mb-3 border-b border-neutral-200 dark:border-neutral-800 pb-2">
              <div class="flex items-center gap-2">
                <t-button variant="text" shape="square" @click="prevDay">
                  <template #icon><chevron-left-icon /></template>
                </t-button>
                <div class="font-medium text-lg">{{ historyDate }}</div>
                <div class="text-sm text-neutral-500" v-if="isToday">(今天)</div>
                <t-button variant="text" shape="square" @click="nextDay" :disabled="isToday">
                  <template #icon><chevron-right-icon /></template>
                </t-button>
              </div>
              <div class="text-sm text-neutral-500">
                当日打卡: {{ currentHistoryRecords.length }} 次
              </div>
            </div>

            <template v-if="currentHistoryRecords.length">
              <div class="flex flex-col gap-2">
                <div v-for="record in currentHistoryRecords" :key="record.id"
                  class="p-3 rounded bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                  <div class="flex flex-col gap-1">
                    <div class="flex items-center gap-2">
                      <span class="font-medium">{{ record.todoTitle }}</span>
                      <t-tag size="small" variant="outline" :theme="getCategoryTheme(record.category)">{{
                        record.category }}</t-tag>
                      <span class="text-xs text-neutral-400">{{ dayjs(record.timestamp).format('HH:mm:ss') }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div v-if="editingRecordId === record.id" class="flex items-center gap-2">
                        <t-input v-model="editingRecordNote" size="small" placeholder="输入备注..." auto-width />
                        <t-button size="small" theme="primary" variant="text" @click="saveRecordNote">保存</t-button>
                        <t-button size="small" theme="default" variant="text"
                          @click="editingRecordId = null">取消</t-button>
                      </div>
                      <div v-else class="flex items-center gap-2 group cursor-pointer" @click="startEditRecord(record)">
                        <span class="text-sm text-neutral-600 dark:text-neutral-400">
                          {{ record.note || '无备注 (点击添加)' }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="w-full h-[200px] flex flex-col items-center justify-center text-neutral-400">
                <t-empty description="该日暂无打卡记录" />
              </div>
            </template>
          </div>
        </t-tab-panel>
      </t-tabs>

      <div class="p-3 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800">
        <div class="flex items-center justify-between gap-2 mb-3">
          <div class="text-sm text-neutral-500">数据统计</div>
          <t-radio-group v-model="statsRange" variant="default-filled" size="small">
            <t-radio-button value="7d">7天</t-radio-button>
            <t-radio-button value="30d">30天</t-radio-button>
          </t-radio-group>
        </div>

        <div class="grid grid-cols-6 gap-2 mb-4">
          <div class="p-2 rounded bg-linear-to-br from-green-100 to-green-50 dark:from-green-950 dark:to-neutral-900">
            <div class="text-xs text-neutral-500 text-center mb-1">今日可打卡任务</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-3xl font-bold text-center text-green-600 dark:text-green-400">{{ animatedScheduled }}
              </div>
              <t-tag size="small" variant="light" theme="success">已打卡: {{ todayPunchedCount }}</t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-yellow-100 to-yellow-50 dark:from-yellow-950 dark:to-neutral-900">
            <div class="text-xs text-neutral-500 text-center mb-1">未开始</div>
            <div class="text-3xl font-bold text-center text-yellow-600 dark:text-yellow-400">{{ animatedUnstarted }}
            </div>
          </div>
          <div class="p-2 rounded bg-linear-to-br from-red-100 to-red-50 dark:from-red-950 dark:to-neutral-900">
            <div class="text-xs text-neutral-500 text-center mb-1">未完成目标</div>
            <div class="text-3xl font-bold text-center text-red-600 dark:text-red-400">{{ animatedUnfinishedGoals }}
            </div>
          </div>
          <div class="p-2 rounded bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-neutral-900">
            <div class="text-xs text-neutral-500 text-center mb-1">今日打卡次数</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-3xl font-bold text-center text-blue-600 dark:text-blue-400">{{ animatedPunchIns }}</div>
              <t-tag size="small" variant="light" :theme="punchInsDiff >= 0 ? 'success' : 'danger'">
                较昨日{{ punchInsDiff >= 0 ? '增加' : '减少' }}: {{ Math.abs(punchInsDiff) }} 次
              </t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-purple-100 to-purple-50 dark:from-purple-950 dark:to-neutral-900">
            <div class="text-xs text-neutral-500 text-center mb-1">今日累计分钟</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-3xl font-bold text-center text-purple-600 dark:text-purple-400">{{ animatedMinutes }}
              </div>
              <t-tag size="small" variant="light" :theme="minutesDiff >= 0 ? 'success' : 'danger'">
                较昨日{{ minutesDiff >= 0 ? '增加' : '减少' }}: {{ Math.abs(minutesDiff) }} 分钟
              </t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-orange-100 to-orange-50 dark:from-orange-950 dark:to-neutral-900">
            <div class="text-xs text-neutral-500 text-center mb-1">连续打卡天数</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-3xl font-bold text-center text-orange-600 dark:text-orange-400">{{ animatedConsecutive }}
              </div>
              <t-tag size="small" variant="light" theme="warning">
                最大连续: {{ animatedMaxConsecutive }} 天
              </t-tag>
            </div>
          </div>
        </div>

        <div class="rounded-md bg-neutral-50 dark:bg-neutral-900 p-2 mb-3 relative h-[200px]">
          <div class="text-xs text-neutral-500 mb-4">最近一年活跃热力图（打卡次数/分钟数）</div>
          <div class="w-full overflow-x-auto">
            <div class="w-fit mx-auto">
              <div id="todo-cal-heatmap" class="min-w-[980px]"></div>
            </div>
          </div>
          <div v-if="heatmapLoading"
            class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-neutral-950/50 rounded-md">
            <t-loading text="正在更新热力图..." />
          </div>
        </div>

        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">各任务类型的打卡趋势</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="punchInsByCategoryOption" style="height: 100%; width: 100%" />
            </div>
          </div>

          <div class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">任务分类</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="categoryOption" style="height: 100%; width: 100%" />
            </div>
          </div>

          <div class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">每日打卡次数趋势</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="punchInsOption" style="height: 100%; width: 100%" />
            </div>
          </div>

          <div class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">每日打卡分钟数趋势</div>
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
          <t-input v-model="editTitle" placeholder="请输入任务名称" />
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
          <t-radio-group v-model="editPeriod" variant="default-filled" size="small">
            <t-radio-button value="daily">每天</t-radio-button>
            <t-radio-button value="weekly">每周</t-radio-button>
            <t-radio-button value="monthly">每月</t-radio-button>
            <t-radio-button value="yearly">每年</t-radio-button>
            <t-radio-button value="once">一次性</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12 md:col-span-6">
          <div class="text-sm text-neutral-500 mb-1">任务单位</div>
          <t-radio-group v-model="editUnit" variant="default-filled" size="small" :disabled="editPeriod === 'once'">
            <t-radio-button value="times">次数</t-radio-button>
            <t-radio-button value="minutes">分钟</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12 md:col-span-6">
          <div class="text-sm text-neutral-500 mb-1">最小频率</div>
          <t-radio-group v-model="editMinFrequency" variant="default-filled" size="small"
            :disabled="editPeriod === 'once'">
            <t-radio-button :value="1">1</t-radio-button>
            <t-radio-button :value="2">2</t-radio-button>
            <t-radio-button :value="3">3</t-radio-button>
            <t-radio-button :value="4">4</t-radio-button>
          </t-radio-group>
          <div class="text-sm text-neutral-400">次</div>
        </div>

        <div class="col-span-12 md:col-span-6">
          <div class="text-sm text-neutral-500 mb-1">每次分钟</div>
          <t-radio-group v-model="editMinutesPerTime" variant="default-filled" size="small"
            :disabled="editPeriod === 'once' || editUnit !== 'minutes'">
            <t-radio-button :value="12">12</t-radio-button>
            <t-radio-button :value="15">15</t-radio-button>
            <t-radio-button :value="18">18</t-radio-button>
            <t-radio-button :value="20">20</t-radio-button>
          </t-radio-group>
          <div class="text-sm text-neutral-400">分钟</div>
        </div>

        <div class="col-span-12">
          <div class="text-sm text-neutral-500 mb-1">任务描述</div>
          <t-input v-model="editDescription" placeholder="可选：添加任务的详细描述" />
        </div>

        <div class="col-span-12" v-if="editPeriod === 'once'">
          <div class="text-sm text-neutral-500 mb-1">截止日期</div>
          <t-date-picker v-model="editDeadline" placeholder="可选：选择截止日期" class="w-full" />
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <t-button variant="outline" @click="editVisible = false">取消</t-button>
        <t-button theme="primary" @click="saveEdit">保存</t-button>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="punchDialogVisible" header="打卡备注" width="400px" :footer="false" @close="confirmPunch">
      <div class="flex flex-col gap-3">
        <div class="text-sm text-neutral-500">请输入本次打卡备注（可选），关闭弹窗自动保存：</div>
        <t-textarea v-model="punchNote" placeholder="例如：读了第3章..." autofocus />
        <div class="flex justify-end gap-2 mt-2">
          <t-button variant="outline" @click="punchDialogVisible = false">取消</t-button>
          <t-button theme="primary" @click="confirmPunch">确认打卡</t-button>
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
