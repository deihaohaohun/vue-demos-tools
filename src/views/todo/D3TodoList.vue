<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
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
import { useTodoStore, type TodoPeriod, type TodoUnit, type PunchRecord, type HistoryItem } from './useTodoStore'
import { AddIcon, ChevronLeftIcon, ChevronRightIcon, SettingIcon, DeleteIcon, EditIcon, FileExportIcon, MinusIcon } from 'tdesign-icons-vue-next'
import dayjs from 'dayjs'
import { useNumberAnimation } from '@/composables/useNumberAnimation'
import confetti from 'canvas-confetti'
import { snapdom } from '@zumer/snapdom'

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
  archivedHistory,
  abandonedGoals,
  punchRecords,
  todayKey,
  formatDayKey,
  getTodoById,
  punchInTodo,
  updatePunchRecordNote,
  updatePunchRecordMinutes,
  createTodo,
  archiveTodoById,
  giveUpGoalById,
  toggleTodoDone,
  applyTodoEdit,
  ensureTemplateFromHistory,
  applyTemplateEdit,
  consecutivePunchDays,
  maxConsecutivePunchDays,
  templates,
  materializeTodayTodosFromTemplates,
} = useTodoStore()

const title = ref('')
const category = ref<string>('')
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

watch(todayKey, () => {
  materializeTodayTodosFromTemplates()
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
    '--cat-tag-bg': `hsl(${h} 85% 90%)`,
    '--cat-tag-border': `hsl(${h} 70% 82%)`,
    '--cat-tag-text': `hsl(${h} 40% 28%)`,
    '--cat-tag-bg-dark': `hsla(${h}, 60%, 25%, 0.55)`,
    '--cat-tag-border-dark': `hsla(${h}, 55%, 45%, 0.55)`,
    '--cat-tag-text-dark': `hsl(${h} 80% 80%)`,
  } as Record<string, string>
}

const getCategoryTagClass = (category: string) => {
  if (!category) return 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700'
  return '[background-color:var(--cat-tag-bg)] [border-color:var(--cat-tag-border)] [color:var(--cat-tag-text)] dark:[background-color:var(--cat-tag-bg-dark)] dark:[border-color:var(--cat-tag-border-dark)] dark:[color:var(--cat-tag-text-dark)]'
}

const hslToHex = (h: number, s: number, l: number) => {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const hh = ((h % 360) + 360) % 360
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1))
  const m = ln - c / 2

  let r = 0
  let g = 0
  let b = 0
  if (hh < 60) {
    r = c
    g = x
  } else if (hh < 120) {
    r = x
    g = c
  } else if (hh < 180) {
    g = c
    b = x
  } else if (hh < 240) {
    g = x
    b = c
  } else if (hh < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

const exportBadgeBaseStyle = {
  display: 'inline-block',
  boxSizing: 'border-box',
  height: '20px',
  padding: '0 8px',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '600',
  lineHeight: '20px',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
} as const

const getCategoryExportTagStyle = (category: string) => {
  if (!category) {
    const p = exportPalette.value
    return {
      ...exportBadgeBaseStyle,
      backgroundColor: isDark.value ? '#0f0f0f' : '#f3f4f6',
      borderColor: p.itemBorder,
      color: p.rootText,
    } as Record<string, string>
  }
  const seed = hashString(category)
  const h = (seed * 137.508) % 360
  if (isDark.value) {
    return {
      ...exportBadgeBaseStyle,
      backgroundColor: hslToHex(h, 55, 22),
      borderColor: hslToHex(h, 55, 34),
      color: hslToHex(h, 80, 85),
    } as Record<string, string>
  }
  return {
    ...exportBadgeBaseStyle,
    backgroundColor: hslToHex(h, 85, 92),
    borderColor: hslToHex(h, 70, 82),
    color: hslToHex(h, 45, 26),
  } as Record<string, string>
}

const exportMinutesBadgeStyle = computed(() => {
  if (isDark.value) {
    return {
      ...exportBadgeBaseStyle,
      backgroundColor: '#0b2a4b',
      borderColor: '#1e3a5f',
      color: '#93c5fd',
    } as Record<string, string>
  }
  return {
    ...exportBadgeBaseStyle,
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    color: '#1d4ed8',
  } as Record<string, string>
})

const exportSuccessBadgeStyle = computed(() => {
  if (isDark.value) {
    return {
      ...exportBadgeBaseStyle,
      backgroundColor: '#06281b',
      borderColor: '#0d3b2b',
      color: '#86efac',
    } as Record<string, string>
  }
  return {
    ...exportBadgeBaseStyle,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    color: '#047857',
  } as Record<string, string>
})

const periodicHistory = computed(() => history.value.filter(h => h.period !== 'once'))
const periodicCategories = computed(() => {
  const categories = [...new Set(periodicHistory.value.map(h => h.category))]
  return categories.filter((c): c is string => Boolean(c))
})

const unfinishedGoalTodos = computed(() => todos.value.filter(t => t.period === 'once' && !t.done))
const completedGoalTodos = computed(() => todos.value.filter(t => t.period === 'once' && t.done))

const periodTextMap: Record<TodoPeriod, string> = {
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
  yearly: '每年',
  once: '目标',
}

const getPeriodTheme = (p: TodoPeriod) => {
  const map: Record<TodoPeriod, 'primary' | 'success' | 'warning' | 'danger' | 'default'> = {
    daily: 'primary',
    weekly: 'success',
    monthly: 'warning',
    yearly: 'danger',
    once: 'default',
  }
  return map[p] || 'default'
}

const archivedHistorySorted = computed(() =>
  [...archivedHistory.value].sort((a, b) => (b.archivedAt || 0) - (a.archivedAt || 0)),
)

const abandonedGoalsSorted = computed(() =>
  [...abandonedGoals.value].sort((a, b) => (b.abandonedAt || 0) - (a.abandonedAt || 0)),
)

// 打卡弹窗相关
const punchDialogVisible = ref(false)
const punchNote = ref('')
const currentPunchId = ref('')
const punchMinutes = ref<number>(15)

const currentPunchTodo = computed(() => {
  if (!currentPunchId.value) return null
  return getTodoById(currentPunchId.value) || null
})

const getTodoTemplateMinutes = (todoId: string) => {
  const todo = getTodoById(todoId)
  if (!todo) return undefined
  if (!todo.templateId) return undefined
  const tpl = templates.value.find((t) => t.id === todo.templateId)
  if (!tpl || tpl.unit !== 'minutes') return undefined
  return typeof tpl.minutesPerTime === 'number' ? tpl.minutesPerTime : 15
}

const punchMinutesEnabled = computed(() => {
  const todo = currentPunchTodo.value
  if (!todo) return false
  if (todo.unit === 'minutes') return true
  const tplMinutes = getTodoTemplateMinutes(todo.id)
  return typeof tplMinutes === 'number'
})

const adjustPunchMinutes = (delta: number, e?: MouseEvent) => {
  const step = e?.shiftKey ? 5 : 1
  const cur = typeof punchMinutes.value === 'number' ? punchMinutes.value : 0
  punchMinutes.value = Math.max(0, Math.round(cur + delta * step))
}

const onPunchTrigger = (id: string) => {
  currentPunchId.value = id
  punchNote.value = ''
  const tplMinutes = getTodoTemplateMinutes(id)
  if (typeof tplMinutes === 'number') {
    punchMinutes.value = tplMinutes
  } else {
    const todo = getTodoById(id)
    punchMinutes.value =
      todo && todo.unit === 'minutes' ? (typeof todo.minutesPerTime === 'number' ? todo.minutesPerTime : 15) : 15
  }
  punchDialogVisible.value = true
}

const confirmPunch = () => {
  if (!currentPunchId.value) return
  punchDialogVisible.value = false

  const res = punchInTodo(currentPunchId.value, punchNote.value)
  if (res.kind === 'not_found') return

  // 播放 Rainbow 碎纸屑效果
  const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fb923c', '#facc15', '#22c55e']
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: colors,
    ticks: 200,
    gravity: 1.2,
    scalar: 0.8,
    shapes: ['circle', 'square'],
  })

  if (res.kind === 'once') return
  if (res.kind === 'auto_done') {
    if (punchMinutesEnabled.value && typeof res.recordId === 'string') {
      updatePunchRecordMinutes(res.recordId, punchMinutes.value)
    }
    MessagePlugin.success('已达成目标，自动完成')
    return
  }
  if (punchMinutesEnabled.value && typeof res.recordId === 'string') {
    updatePunchRecordMinutes(res.recordId, punchMinutes.value)
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

const editingRecordMinutesId = ref<string | null>(null)
const editingRecordMinutes = ref<number>(15)

const editingRecordId = ref<string | null>(null)
const editingRecordNote = ref('')

const startEditRecord = (record: PunchRecord) => {
  editingRecordMinutesId.value = null
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

const getRecordMinutes = (record: PunchRecord) => {
  if (record.unit === 'minutes') {
    return typeof record.minutesPerTime === 'number' ? record.minutesPerTime : 15
  }

  const tpl = templates.value.find(
    (t) =>
      t.title === record.todoTitle && (t.category || '未分类') === (record.category || '未分类'),
  )
  if (tpl && tpl.unit === 'minutes') {
    return typeof tpl.minutesPerTime === 'number' ? tpl.minutesPerTime : 15
  }

  return 0
}

const startEditRecordMinutes = (record: PunchRecord) => {
  editingRecordId.value = null
  editingRecordMinutesId.value = record.id
  const mins = getRecordMinutes(record)
  editingRecordMinutes.value = mins > 0 ? mins : 15
}

const saveRecordMinutes = () => {
  const id = editingRecordMinutesId.value
  if (!id) return
  updatePunchRecordMinutes(id, editingRecordMinutes.value)
  editingRecordMinutesId.value = null
  MessagePlugin.success('分钟已更新')
}


// --- UI Configuration Logic ---
type TodoUiConfig = {
  categories: string[]
  minFrequencies: number[]
  minutesPerTimes: number[]
}

const defaultUiConfig: TodoUiConfig = {
  categories: [],
  minFrequencies: [1, 2, 3, 4],
  minutesPerTimes: [12, 15, 18, 20],
}

const uiConfig = ref<TodoUiConfig>({ ...defaultUiConfig })
const configDrawerVisible = ref(false)
const draftCategoriesList = ref<string[]>([])
const draftMinFrequenciesList = ref<number[]>([])
const draftMinutesPerTimesList = ref<number[]>([])

const loadUiConfig = () => {
  const s = localStorage.getItem('todo_ui_config')
  if (s) {
    try {
      const parsed = JSON.parse(s)
      uiConfig.value = {
        categories: parsed.categories || defaultUiConfig.categories,
        minFrequencies: parsed.minFrequencies || defaultUiConfig.minFrequencies,
        minutesPerTimes: parsed.minutesPerTimes || defaultUiConfig.minutesPerTimes,
      }
    } catch (e) {
      console.error('Failed to parse todo_ui_config', e)
    }
  }
}

const saveUiConfig = () => {
  localStorage.setItem('todo_ui_config', JSON.stringify(uiConfig.value))
}

const openConfigDrawer = () => {
  draftCategoriesList.value = [...uiConfig.value.categories]
  draftMinFrequenciesList.value = [...uiConfig.value.minFrequencies]
  draftMinutesPerTimesList.value = [...uiConfig.value.minutesPerTimes]
  configDrawerVisible.value = true
}

const saveUiConfigFromDraft = () => {
  const cats = draftCategoriesList.value.map(s => s.trim()).filter(Boolean)
  const freqs = draftMinFrequenciesList.value.filter(n => typeof n === 'number' && !isNaN(n))
  const mins = draftMinutesPerTimesList.value.filter(n => typeof n === 'number' && !isNaN(n))

  if (cats.length) uiConfig.value.categories = cats
  if (freqs.length) uiConfig.value.minFrequencies = freqs
  if (mins.length) uiConfig.value.minutesPerTimes = mins

  saveUiConfig()
  configDrawerVisible.value = false
  MessagePlugin.success('配置已保存')
}

const resetUiConfig = () => {
  draftCategoriesList.value = [...defaultUiConfig.categories]
  draftMinFrequenciesList.value = [...defaultUiConfig.minFrequencies]
  draftMinutesPerTimesList.value = [...defaultUiConfig.minutesPerTimes]
}

const addDraftCategory = () => draftCategoriesList.value.push('')
const removeDraftCategory = (index: number) => draftCategoriesList.value.splice(index, 1)

const addDraftFrequency = () => draftMinFrequenciesList.value.push(1)
const removeDraftFrequency = (index: number) => draftMinFrequenciesList.value.splice(index, 1)

const addDraftMinute = () => draftMinutesPerTimesList.value.push(15)
const removeDraftMinute = (index: number) => draftMinutesPerTimesList.value.splice(index, 1)

onMounted(() => {
  loadUiConfig()
  materializeTodayTodosFromTemplates()
})

const categoryOptions = computed(() => uiConfig.value.categories)
const minFrequencyOptions = computed(() => uiConfig.value.minFrequencies)
const minutesPerTimeOptions = computed(() => uiConfig.value.minutesPerTimes)

const selectedIds = ref<Set<string>>(new Set())

const editVisible = ref(false)
const editingTodoId = ref<string | null>(null)
const editTitle = ref('')
const editDescription = ref('')

const editingTodo = computed(() => {
  const id = editingTodoId.value
  if (!id) return null
  return getTodoById(id) || null
})

const editOnlyDescription = computed(() => {
  const t = editingTodo.value
  if (!t) return false
  return t.period === 'once' && t.done
})

const todayDisplay = computed(() => {
  const w = ['日', '一', '二', '三', '四', '五', '六']
  return `${todayKey.value} 周${w[new Date().getDay()]}`
})

const openEdit = (id: string) => {
  const todo = getTodoById(id)
  if (!todo) return

  editingTodoId.value = id
  editTitle.value = todo.title
  editDescription.value = todo.description || ''

  editVisible.value = true
}

const saveEdit = () => {
  const id = editingTodoId.value
  if (!id) return

  const todo = getTodoById(id)
  if (!todo) return

  const isCompletedGoal = todo.period === 'once' && todo.done

  const nextTitle = isCompletedGoal ? todo.title : editTitle.value.trim()
  const tplMinutes =
    todo.templateId && templates.value.find((t) => t.id === todo.templateId)?.unit === 'minutes'
      ? templates.value.find((t) => t.id === todo.templateId)?.minutesPerTime
      : undefined
  const nextMinutesPerTime =
    todo.unit === 'minutes'
      ? typeof todo.minutesPerTime === 'number'
        ? todo.minutesPerTime
        : typeof tplMinutes === 'number'
          ? tplMinutes
          : 15
      : 15

  if (!nextTitle) {
    MessagePlugin.warning('任务标题不能为空')
    return
  }

  const ok = applyTodoEdit(id, {
    title: nextTitle,
    category: todo.category,
    period: todo.period,
    minFrequency: todo.minFrequency,
    unit: todo.unit,
    minutesPerTime: nextMinutesPerTime,
    description: editDescription.value.trim() || undefined,
    deadline: todo.deadline,
  })
  if (!ok) return

  editVisible.value = false
  editingTodoId.value = null
  MessagePlugin.success('已保存修改')
}

const templateEditVisible = ref(false)
const editingTemplateId = ref<string | null>(null)
const templateTitle = ref('')
const templateCategory = ref('')
const templatePeriod = ref<TodoPeriod>('daily')
const templateMinFrequency = ref<number>(1)
const templateUnit = ref<TodoUnit>('times')
const templateMinutesPerTime = ref<number>(15)
const templateDescription = ref('')

const templateCategoryOptions = computed(() => {
  const cats = [...categoryOptions.value]
  const cur = templateCategory.value
  if (cur && !cats.includes(cur)) cats.unshift(cur)
  return cats
})

const templateMinFrequencyOptions = computed(() => {
  const opts = [...minFrequencyOptions.value]
  const cur = templateMinFrequency.value
  if (typeof cur === 'number' && cur > 0 && !opts.includes(cur)) opts.push(cur)
  return opts.sort((a, b) => a - b)
})

const templateMinutesPerTimeOptions = computed(() => {
  const opts = [...minutesPerTimeOptions.value]
  const cur = templateMinutesPerTime.value
  if (typeof cur === 'number' && cur > 0 && !opts.includes(cur)) opts.push(cur)
  return opts.sort((a, b) => a - b)
})

watch(templateUnit, (u) => {
  if (u !== 'minutes') return
  if (!templateMinutesPerTime.value) {
    templateMinutesPerTime.value = templateMinutesPerTimeOptions.value[0] || 15
  }
})

const openTemplateEditFromHistory = (item: HistoryItem) => {
  const tpl = ensureTemplateFromHistory(item)

  editingTemplateId.value = tpl.id
  templateTitle.value = tpl.title
  templateCategory.value = tpl.category
  templatePeriod.value = tpl.period
  templateMinFrequency.value = tpl.minFrequency
  templateUnit.value = tpl.unit
  templateMinutesPerTime.value =
    tpl.unit === 'minutes' ? (typeof tpl.minutesPerTime === 'number' ? tpl.minutesPerTime : 15) : 15
  templateDescription.value = tpl.description || ''
  templateEditVisible.value = true
}

const saveTemplateEdit = () => {
  const id = editingTemplateId.value
  if (!id) return

  const nextTitle = templateTitle.value.trim()
  if (!nextTitle) {
    MessagePlugin.warning('模板名称不能为空')
    return
  }
  if (templateCategoryOptions.value.length && !templateCategory.value) {
    MessagePlugin.warning('请选择模板分类')
    return
  }

  const ok = applyTemplateEdit(id, {
    title: nextTitle,
    category: templateCategory.value,
    period: templatePeriod.value,
    minFrequency: templateMinFrequency.value,
    unit: templateUnit.value,
    minutesPerTime: templateMinutesPerTime.value,
    description: templateDescription.value.trim() || undefined,
  })
  if (!ok) return

  templateEditVisible.value = false
  editingTemplateId.value = null
  MessagePlugin.success('模板已更新')
}

const allDisplayTodos = computed(() =>
  [...todos.value].sort((a, b) => (a.category || '').localeCompare(b.category || 'zh'))
)

const taskDisplayTodos = computed(() => allDisplayTodos.value.filter((t) => t.period !== 'once'))

const unstartedTodos = computed(() =>
  taskDisplayTodos.value.filter((t) => t.punchIns === 0 && !t.done)
)

const punchedTodos = computed(() =>
  taskDisplayTodos.value.filter((t) => t.punchIns > 0 || t.done)
)

const handlePunchIn = (id: string) => {
  onPunchTrigger(id)
}

const addTodo = () => {
  if (!categoryOptions.value.length) {
    MessagePlugin.warning('请先在配置管理中添加分类后再添加')
    return
  }
  if (!category.value) {
    MessagePlugin.warning('请选择任务分类')
    return
  }
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

watch(categoryOptions, (cats) => {
  if (!cats.length) {
    category.value = ''
    if (period.value !== 'once') period.value = 'once'
    return
  }
  if (category.value && !cats.includes(category.value)) {
    category.value = ''
  }
}, { immediate: true })

const archiveTodo = (id: string) => {
  const todo = getTodoById(id)
  if (!todo) return

  if (todo.period === 'once') {
    const confirmDialog = DialogPlugin.confirm({
      header: '确认放弃目标',
      body: '确定要放弃这个目标吗？放弃后将移动到“已放弃”列表。',
      confirmBtn: {
        content: '放弃',
        theme: 'danger',
      },
      onConfirm: () => {
        const res = giveUpGoalById(id)
        if (res.kind === 'not_found') {
          confirmDialog.hide()
          return
        }

        for (const rid of res.removedIds) selectedIds.value.delete(rid)

        MessagePlugin.success('目标已放弃')
        confirmDialog.hide()
      },
    })
    return
  }

  const confirmDialog = DialogPlugin.confirm({
    header: '确认归档',
    body: '确定要归档这个任务吗？归档后将不再生成新任务。',
    confirmBtn: {
      content: '归档',
      theme: 'warning',
    },
    onConfirm: () => {
      const res = archiveTodoById(id)
      if (res.kind === 'not_found') {
        confirmDialog.hide()
        return
      }

      for (const rid of res.removedIds) selectedIds.value.delete(rid)

      MessagePlugin.success('任务已归档')
      confirmDialog.hide()
    },
  })
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
const todayPunchRecords = computed(() => punchRecords.value.filter((r) => r.dayKey === todayKey.value))
const todayPunchInsTotal = computed(() => todayPunchRecords.value.length)
const todayMinutesTotal = computed(() => {
  return todayPunchRecords.value.reduce((sum, r) => {
    if (r.unit === 'minutes') {
      const mins = typeof r.minutesPerTime === 'number' ? r.minutesPerTime : 15
      return sum + mins
    }
    // 兼容旧记录或次数类型的打卡（如果后来改成了分钟单位）
    const tpl = templates.value.find(
      (t) => t.title === r.todoTitle && (t.category || '未分类') === (r.category || '未分类'),
    )
    if (tpl && tpl.unit === 'minutes') {
      const mins = typeof tpl.minutesPerTime === 'number' ? tpl.minutesPerTime : 15
      return sum + mins
    }
    return sum
  }, 0)
})


// 当天可以打卡的总任务数 (所有今天显示的任务，排除目标)
const todayScheduledCount = computed(() => todayTodos.value.filter((t) => t.period !== 'once').length)
// 当日还剩几个可以打卡但是未打卡的数量 (punchIns === 0，排除目标)
const todayUnstartedCount = computed(() =>
  todayTodos.value.filter((t) => t.period !== 'once' && t.punchIns === 0).length,
)
// 未完成目标数 (目标任务 && 未完成)
const unfinishedGoalsCount = computed(
  () => todayTodos.value.filter((t) => t.period === 'once' && !t.done).length,
)
const totalGoalsCountForToday = computed(
  () => todayTodos.value.filter((t) => t.period === 'once').length,
)

const unstartedTaskRatio = computed(() => {
  if (todayScheduledCount.value === 0) return '0.00'
  return ((todayUnstartedCount.value / todayScheduledCount.value) * 100).toFixed(2)
})

const unfinishedGoalRatio = computed(() => {
  if (totalGoalsCountForToday.value === 0) return '0.00'
  return ((unfinishedGoalsCount.value / totalGoalsCountForToday.value) * 100).toFixed(2)
})

// 今日已打卡任务数 (排除目标)
const todayPunchedCount = computed(() => {
  const set = new Set<string>()
  for (const r of todayPunchRecords.value) {
    set.add(`${r.todoTitle}@@${r.category || '未分类'}`)
  }
  return set.size
})

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
const exportDialogVisible = ref(false)
const exporting = ref(false)
const exportingImage = ref(false)
const exportCaptureRef = ref<HTMLElement | null>(null)
const isDark = ref(false)
let themeObserver: MutationObserver | null = null

type ExportPunchRecord = {
  id: string
  timestamp: number
  todoTitle: string
  category: string
  minutes: number
  note?: string
}

type ExportDaySummary = {
  dayKey: string
  punchIns: number
  minutes: number
  records: ExportPunchRecord[]
}

type ExportGoal = {
  id: string
  title: string
  category: string
  completedAt: number
}

const exportSummaries = ref<ExportDaySummary[]>([])
const exportGoals = ref<ExportGoal[]>([])

const readIsDark = () => {
  const mode = document.documentElement.getAttribute('theme-mode')
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return document.documentElement.classList.contains('dark')
}

const exportWeekOffset = ref(0)

const getWeekStartDate = (d: Date) => {
  const base = new Date(d)
  base.setHours(0, 0, 0, 0)
  const dayOfWeek = base.getDay()
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  base.setDate(base.getDate() - diff)
  return base
}

const exportWeekStartDate = computed(() => {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + exportWeekOffset.value * 7)
  return getWeekStartDate(base)
})

const exportWeekDayKeys = computed(() => {
  const start = exportWeekStartDate.value
  const keys: string[] = []
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    keys.push(formatDayKey(d.getTime()))
  }
  return keys
})

const exportWeekRangeText = computed(() => {
  const keys = exportWeekDayKeys.value
  if (keys.length !== 7) return ''
  return `${keys[0]} ~ ${keys[6]}`
})

const exportDialogTitle = computed(() => {
  const keys = exportWeekDayKeys.value
  if (!keys.length) return '打卡历史'
  const start = keys[0]
  const end = keys[keys.length - 1]
  return `${start}到${end}打卡历史`
})

const exportImageFileName = computed(() => {
  const keys = exportWeekDayKeys.value
  const start = keys[0] || 'start'
  const end = keys[keys.length - 1] || 'end'
  return `${start}_to_${end}_打卡历史.png`
})

const exportPalette = computed(() => {
  if (isDark.value) {
    return {
      rootBg: '#0a0a0a',
      rootText: '#e5e5e5',
      rootBorder: '#262626',
      cardBg: '#171717',
      cardBorder: '#262626',
      itemBg: '#0f0f0f',
      itemBorder: '#262626',
      mutedText: '#a3a3a3',
      noteText: '#d4d4d4',
      divider: '#262626',
    }
  }
  return {
    rootBg: '#ffffff',
    rootText: '#111827',
    rootBorder: '#e5e7eb',
    cardBg: '#ffffff',
    cardBorder: '#e5e7eb',
    itemBg: '#f9fafb',
    itemBorder: '#e5e7eb',
    mutedText: '#6b7280',
    noteText: '#4b5563',
    divider: '#e5e7eb',
  }
})

const exportRootStyle = computed(() => {
  const p = exportPalette.value
  return {
    backgroundColor: p.rootBg,
    color: p.rootText,
    borderColor: p.rootBorder,
  } as Record<string, string>
})

const exportDayCardStyle = computed(() => {
  const p = exportPalette.value
  return { backgroundColor: p.cardBg, borderColor: p.cardBorder } as Record<string, string>
})

const exportItemStyle = computed(() => {
  const p = exportPalette.value
  return { backgroundColor: p.itemBg, borderColor: p.itemBorder, color: p.rootText } as Record<string, string>
})

const exportDividerStyle = computed(() => {
  const p = exportPalette.value
  return { borderColor: p.divider } as Record<string, string>
})

const exportMutedTextStyle = computed(() => {
  const p = exportPalette.value
  return { color: p.mutedText } as Record<string, string>
})

const exportNoteTextStyle = computed(() => {
  const p = exportPalette.value
  return { color: p.noteText } as Record<string, string>
})

const buildExportData = () => {
  const summaries: ExportDaySummary[] = []
  const goals: ExportGoal[] = []

  const keys = exportWeekDayKeys.value

  for (const dk of keys) {
    const recordsOfDay = punchRecords.value.filter((r) => r.dayKey === dk)
    const punchCount = recordsOfDay.length
    let minutesTotal = 0
    const exportRecords: ExportPunchRecord[] = []

    for (const r of recordsOfDay) {
      let recordMinutes = 0
      if (r.unit === 'minutes') {
        const mins = typeof r.minutesPerTime === 'number' ? r.minutesPerTime : 15
        recordMinutes = mins
        minutesTotal += mins
      } else {
        const tpl = templates.value.find(
          (t) => t.title === r.todoTitle && (t.category || '未分类') === (r.category || '未分类'),
        )
        if (tpl && tpl.unit === 'minutes') {
          const mins = typeof tpl.minutesPerTime === 'number' ? tpl.minutesPerTime : 15
          recordMinutes = mins
          minutesTotal += mins
        }
      }

      exportRecords.push({
        id: r.id,
        timestamp: r.timestamp,
        todoTitle: r.todoTitle,
        category: r.category || '未分类',
        minutes: recordMinutes,
        note: r.note,
      })
    }

    summaries.push({
      dayKey: dk,
      punchIns: punchCount,
      minutes: minutesTotal,
      records: exportRecords.sort((a, b) => b.timestamp - a.timestamp),
    })
  }

  const weekStart = exportWeekStartDate.value.getTime()
  const weekEndExclusive = weekStart + 7 * 24 * 60 * 60 * 1000
  for (const t of todos.value) {
    if (t.period !== 'once') continue
    if (!t.done) continue
    if (!t.completedAt) continue
    if (t.completedAt < weekStart || t.completedAt >= weekEndExclusive) continue

    goals.push({
      id: t.id,
      title: t.title,
      category: t.category,
      completedAt: t.completedAt,
    })
  }

  exportSummaries.value = summaries
  exportGoals.value = goals.sort((a, b) => b.completedAt - a.completedAt)
}

const openExportDialog = () => {
  exporting.value = true
  try {
    exportWeekOffset.value = 0
    buildExportData()
    exportDialogVisible.value = true
  } finally {
    exporting.value = false
  }
}

const canNextExportWeek = computed(() => exportWeekOffset.value < 0)
const prevExportWeek = () => {
  exportWeekOffset.value -= 1
  buildExportData()
}
const nextExportWeek = () => {
  if (!canNextExportWeek.value) return
  exportWeekOffset.value += 1
  buildExportData()
}

const exportDialogToImage = async () => {
  if (!exportCaptureRef.value) return
  exportingImage.value = true
  try {
    await nextTick()
    const scale = Math.max(2, window.devicePixelRatio || 1)
    const result = await snapdom(exportCaptureRef.value, { scale, backgroundColor: exportPalette.value.rootBg })
    await result.download({
      type: 'png',
      filename: exportImageFileName.value,
      backgroundColor: exportPalette.value.rootBg,
    })
    MessagePlugin.success('已导出图片')
    exportDialogVisible.value = false
  } catch {
    MessagePlugin.error('导出失败，请重试')
  } finally {
    exportingImage.value = false
  }
}

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

const categoryCountsForChart = computed(() => {
  const map: Record<string, number> = { ...templateCategoryCounts.value }
  const goalsCount = todos.value.filter((t) => t.period === 'once').length
  if (goalsCount > 0) {
    map['目标'] = (map['目标'] || 0) + goalsCount
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
  categoryCounts: categoryCountsForChart,
})

const formatShortDay = (dayKey: string) => {
  // YYYY-MM-DD -> MM-DD
  return dayKey.slice(5)
}

const windowWidth = ref(window.innerWidth)
const updateWidth = () => {
  windowWidth.value = window.innerWidth
}

onMounted(() => {
  window.addEventListener('resize', updateWidth)
  isDark.value = readIsDark()
  themeObserver = new MutationObserver(() => {
    isDark.value = readIsDark()
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'theme-mode'],
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
  if (themeObserver) {
    themeObserver.disconnect()
    themeObserver = null
  }
})

const editDialogWidth = computed(() => {
  return windowWidth.value < 640 ? '95%' : '560px'
})

const punchDialogWidth = computed(() => {
  return windowWidth.value < 640 ? '95%' : '400px'
})

const exportDialogWidth = computed(() => {
  return windowWidth.value < 640 ? '95%' : '860px'
})
</script>

<template>
  <div class="w-full min-h-screen dark:bg-neutral-900 overflow-x-hidden bg-neutral-50 pb-4">
    <div class="max-w-[1200px] mx-auto px-4 pt-4">
      <div class="text-lg md:text-2xl mb-4">今天是: {{ todayDisplay }}</div>
      <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <t-input autofocus v-model="title" :onEnter="addTodo"
          :placeholder="!categoryOptions.length ? '请先在配置管理中添加分类' : (period === 'once' ? '添加目标' : '添加任务模板')"
          class="flex-1"></t-input>
        <t-button @click="addTodo" class="w-full sm:w-auto" :disabled="!categoryOptions.length || !category">
          <template #icon>
            <add-icon size="20" />
          </template>
          {{ period === 'once' ? '新建目标' : '新建任务模板' }}
        </t-button>
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto mt-4 px-4 grid grid-cols-12 gap-x-4 gap-y-3">
      <div class="col-span-12 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">任务分类</div>
        <div class="flex items-center gap-2 flex-1">
          <t-radio-group v-if="categoryOptions.length" v-model="category" variant="default-filled" size="small"
            class="flex flex-wrap">
            <t-radio-button v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</t-radio-button>
          </t-radio-group>
          <div v-else class="text-sm text-neutral-400">暂无分类，请先添加</div>
          <t-button shape="square" variant="text" size="small" @click="openConfigDrawer">
            <template #icon><setting-icon /></template>
          </t-button>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">任务周期</div>
        <t-radio-group v-model="period" variant="default-filled" size="small" class="flex flex-wrap">
          <t-radio-button value="daily" :disabled="!categoryOptions.length">每天</t-radio-button>
          <t-radio-button value="weekly" :disabled="!categoryOptions.length">每周</t-radio-button>
          <t-radio-button value="monthly" :disabled="!categoryOptions.length">每月</t-radio-button>
          <t-radio-button value="yearly" :disabled="!categoryOptions.length">每年</t-radio-button>
          <t-radio-button value="once" :disabled="!categoryOptions.length">目标</t-radio-button>
        </t-radio-group>
      </div>

      <div class="col-span-12 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">任务单位</div>
        <t-radio-group v-model="unit" variant="default-filled" size="small" :disabled="period === 'once'"
          class="flex flex-wrap">
          <t-radio-button value="times">次数</t-radio-button>
          <t-radio-button value="minutes">分钟</t-radio-button>
        </t-radio-group>
      </div>

      <div class="col-span-12 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">最小频率</div>
        <div class="flex items-center gap-2">
          <t-radio-group v-model="minFrequency" variant="default-filled" size="small" :disabled="period === 'once'"
            class="flex flex-wrap">
            <t-radio-button v-for="freq in minFrequencyOptions" :key="freq" :value="freq">{{ freq }}</t-radio-button>
          </t-radio-group>
          <div class="text-sm text-neutral-400">次</div>
          <t-button shape="square" variant="text" size="small" @click="openConfigDrawer">
            <template #icon><setting-icon /></template>
          </t-button>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">每次分钟</div>
        <div class="flex items-center gap-2 flex-1">
          <t-radio-group v-model="minutesPerTime" variant="default-filled" size="small"
            :disabled="period === 'once' || unit !== 'minutes'" class="flex flex-wrap">
            <t-radio-button v-for="mins in minutesPerTimeOptions" :key="mins" :value="mins">{{ mins }}</t-radio-button>
          </t-radio-group>
          <div class="text-sm text-neutral-400">分钟</div>
          <t-button shape="square" variant="text" size="small" @click="openConfigDrawer">
            <template #icon><setting-icon /></template>
          </t-button>
        </div>
      </div>

      <div class="col-span-12 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">任务描述</div>
        <t-input v-model="description" placeholder="可选：添加任务的详细描述" class="flex-1" />
      </div>

      <div class="col-span-12 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">截止日期</div>
        <t-date-picker :disabled="period !== 'once'" v-model="deadline" placeholder="可选：选择截止日期" class="flex-1 w-full" />
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto mt-2 px-4 flex flex-wrap gap-2">
      <div class="text-sm flex items-center">历史记录:</div>
      <div v-if="!history.length" class="text-sm text-neutral-400 flex items-center">暂无历史数据</div>
    </div>

    <div class="max-w-[1200px] mx-auto mt-2 px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
      <!-- Periodic Categories -->
      <div v-for="cat in periodicCategories" :key="cat" :style="getCategoryCssVars(cat)"
        class="p-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div class="text-sm mb-2 font-bold flex items-center gap-2">
          <span>{{ cat }} (模板)</span>
          <span class="px-2 py-0.5 rounded text-[11px] font-semibold border" :class="getCategoryTagClass(cat)">{{
            periodicHistory.filter(h => h.category === cat).length}}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <span v-for="item in periodicHistory.filter(h => h.category === cat)"
            :key="`${item.title}-${item.category}-${item.period}`"
            class="inline-flex items-center gap-1 px-1 rounded border text-[11px] font-semibold transition-colors"
            :class="getCategoryTagClass(cat)">
            <span class="cursor-pointer hover:opacity-70">{{ item.title }}</span>
            <t-button variant="text" size="small" shape="square" @click.stop="openTemplateEditFromHistory(item)">
              <template #icon><edit-icon /></template>
            </t-button>
          </span>
        </div>
      </div>

      <!-- Unfinished Goals -->
      <div class="p-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div class="text-sm mb-2 font-bold flex items-center gap-2">
          <span>未完成目标</span>
          <t-tag size="small" variant="light" theme="warning">{{ unfinishedGoalTodos.length
            }}</t-tag>
        </div>
        <div class="flex flex-wrap gap-2">
          <span v-for="todo in unfinishedGoalTodos" :key="todo.id"
            class="inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-semibold transition-colors"
            :class="getCategoryTagClass(todo.category)">
            <span class="cursor-pointer hover:opacity-70">{{ todo.title }}</span>
          </span>
          <div v-if="!unfinishedGoalTodos.length" class="text-xs text-neutral-400">暂无未完成目标</div>
        </div>
      </div>

      <!-- Completed Goals -->
      <div class="p-3 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div class="text-sm mb-2 font-bold flex items-center gap-2">
          <span>已完成目标</span>
          <t-tag size="small" variant="light" theme="success">{{ completedGoalTodos.length }}</t-tag>
        </div>
        <div class="flex flex-wrap gap-2">
          <t-tag v-for="todo in completedGoalTodos" :key="todo.id" variant="outline" theme="success">
            <span>{{ todo.title }}</span>
            <span v-if="todo.completedAt" class="ml-1 text-[10px] opacity-70">
              {{ dayjs(todo.completedAt).format('MM-DD HH:mm') }}
            </span>
            <check-icon class="ml-1" />
          </t-tag>
          <div v-if="!completedGoalTodos.length" class="text-xs text-neutral-400">暂无已完成目标</div>
        </div>
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto mt-2 px-4">
      <t-tabs :default-value="1" class="rounded-md overflow-hidden">
        <t-tab-panel :value="1" :label="`任务列表 (${taskDisplayTodos.length})`">
          <div class="min-h-[300px]" :class="{ 'p-1 sm:p-2': taskDisplayTodos.length }">
            <template v-if="taskDisplayTodos.length">
              <!-- 未开始任务 -->
              <div v-if="unstartedTodos.length" class="mb-2">
                <div class="flex items-center gap-2 mb-2 px-1">
                  <div class="w-1 h-4 bg-yellow-500 rounded-full"></div>
                  <span class="text-sm font-bold text-neutral-600 dark:text-neutral-300">未开始 ({{ unstartedTodos.length
                    }})</span>
                </div>
                <TodoItem v-for="todo in unstartedTodos" :key="todo.id" :todo="todo" @toggle-select="toggleSelect"
                  @toggle-done="toggleDone" @punch-in="handlePunchIn" @edit="openEdit" @archive="archiveTodo" />
              </div>

              <!-- 已打卡任务 -->
              <div v-if="punchedTodos.length">
                <div class="flex items-center gap-2 mb-2 px-1">
                  <div class="w-1 h-4 bg-green-500 rounded-full"></div>
                  <span class="text-sm font-bold text-neutral-600 dark:text-neutral-300">已打卡 ({{ punchedTodos.length
                    }})</span>
                </div>
                <TodoItem v-for="todo in punchedTodos" :key="todo.id" :todo="todo" @toggle-select="toggleSelect"
                  @toggle-done="toggleDone" @punch-in="handlePunchIn" @edit="openEdit" @archive="archiveTodo" />
              </div>
            </template>
            <template v-else>
              <div class="w-full h-[300px] flex flex-col items-center justify-center">
                <t-empty />
              </div>
            </template>
          </div>
        </t-tab-panel>
        <t-tab-panel :value="2"
          :label="`目标 (${unfinishedGoalTodos.length + completedGoalTodos.length + abandonedGoalsSorted.length})`">
          <div class="min-h-[300px]"
            :class="{ 'p-1 sm:p-2': unfinishedGoalTodos.length + completedGoalTodos.length + abandonedGoalsSorted.length }">
            <template v-if="unfinishedGoalTodos.length + completedGoalTodos.length + abandonedGoalsSorted.length">
              <div v-if="unfinishedGoalTodos.length" class="mb-2">
                <div class="flex items-center gap-2 mb-2 px-1">
                  <div class="w-1 h-4 bg-yellow-500 rounded-full"></div>
                  <span class="text-sm font-bold text-neutral-600 dark:text-neutral-300">未完成 ({{
                    unfinishedGoalTodos.length }})</span>
                </div>
                <TodoItem v-for="todo in unfinishedGoalTodos" :key="todo.id" :todo="todo" @toggle-select="toggleSelect"
                  @toggle-done="toggleDone" @punch-in="handlePunchIn" @edit="openEdit" @archive="archiveTodo" />
              </div>

              <div v-if="completedGoalTodos.length">
                <div class="flex items-center gap-2 mb-2 px-1">
                  <div class="w-1 h-4 bg-green-500 rounded-full"></div>
                  <span class="text-sm font-bold text-neutral-600 dark:text-neutral-300">已完成 ({{
                    completedGoalTodos.length }})</span>
                </div>
                <TodoItem v-for="todo in completedGoalTodos" :key="todo.id" :todo="todo" @toggle-select="toggleSelect"
                  @toggle-done="toggleDone" @punch-in="handlePunchIn" @edit="openEdit" @archive="archiveTodo" />
              </div>

              <div v-if="abandonedGoalsSorted.length">
                <div class="flex items-center gap-2 my-2 px-1">
                  <div class="w-1 h-4 bg-red-500 rounded-full"></div>
                  <span class="text-sm font-bold text-neutral-600 dark:text-neutral-300">已放弃 ({{
                    abandonedGoalsSorted.length }})</span>
                </div>
                <div class="flex flex-col gap-2">
                  <div v-for="g in abandonedGoalsSorted" :key="g.id"
                    class="p-3 rounded bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{{ g.title }}</span>
                      <span v-if="g.category" class="px-2 py-0.5 rounded text-[11px] font-semibold border"
                        :style="getCategoryCssVars(g.category)" :class="getCategoryTagClass(g.category)">
                        {{ g.category }}
                      </span>
                      <t-tag size="small" variant="light" theme="danger">已放弃</t-tag>
                      <span class="text-xs text-neutral-400">放弃于 {{ dayjs(g.abandonedAt).format('YYYY-MM-DD HH:mm')
                        }}</span>
                      <span v-if="g.deadline" class="text-xs text-neutral-400">截止 {{
                        dayjs(g.deadline).format('YYYY-MM-DD') }}</span>
                    </div>
                    <div v-if="g.description" class="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                      {{ g.description }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="w-full h-[300px] flex flex-col items-center justify-center">
                <t-empty description="暂无目标" />
              </div>
            </template>
          </div>
        </t-tab-panel>
        <t-tab-panel :value="3" label="打卡记录">
          <div class="min-h-[300px] p-2">
            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between mb-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 gap-2">
              <div class="flex items-center gap-2">
                <t-button variant="text" shape="square" @click="prevDay">
                  <template #icon><chevron-left-icon /></template>
                </t-button>
                <div class="font-medium text-lg shrink-0">{{ historyDate }}</div>
                <div class="text-sm shrink-0" v-if="isToday">(今天)</div>
                <t-button variant="text" shape="square" @click="nextDay" :disabled="isToday">
                  <template #icon><chevron-right-icon /></template>
                </t-button>
              </div>
              <div class="text-sm">
                当日打卡: {{ currentHistoryRecords.length }} 次
              </div>
            </div>

            <template v-if="currentHistoryRecords.length">
              <div class="flex flex-col gap-2">
                <div v-for="record in currentHistoryRecords" :key="record.id"
                  class="p-3 rounded bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex flex-col gap-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{{ record.todoTitle }}</span>
                      <span v-if="record.category" class="px-1 rounded text-[11px] font-semibold border"
                        :style="getCategoryCssVars(record.category)" :class="getCategoryTagClass(record.category)">{{
                          record.category }}</span>
                      <span class="text-xs text-neutral-400">{{ dayjs(record.timestamp).format('HH:mm:ss') }}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <div v-if="editingRecordId === record.id" class="flex flex-wrap items-center gap-2">
                        <t-input v-model="editingRecordNote" size="small" placeholder="输入备注..." auto-width />
                        <div class="flex gap-1">
                          <t-button size="small" theme="primary" variant="text" @click="saveRecordNote">保存</t-button>
                          <t-button size="small" theme="default" variant="text"
                            @click="editingRecordId = null">取消</t-button>
                        </div>
                      </div>
                      <div v-else class="flex items-center gap-2 group cursor-pointer" @click="startEditRecord(record)">
                        <span class="text-sm text-neutral-600 dark:text-neutral-400">
                          {{ record.note || '无备注 (点击添加)' }}
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center gap-2">
                      <div v-if="editingRecordMinutesId === record.id" class="flex flex-wrap items-center gap-2">
                        <t-input-number v-model="editingRecordMinutes" :min="0" :step="5" size="small"
                          class="w-[120px]" />
                        <div class="flex gap-1">
                          <t-button size="small" theme="primary" variant="text" @click="saveRecordMinutes">保存</t-button>
                          <t-button size="small" theme="default" variant="text"
                            @click="editingRecordMinutesId = null">取消</t-button>
                        </div>
                      </div>
                      <div v-else class="flex items-center gap-2 group cursor-pointer"
                        @click="startEditRecordMinutes(record)">
                        <span class="text-sm text-neutral-600 dark:text-neutral-400">
                          <template v-if="getRecordMinutes(record) > 0">
                            {{ getRecordMinutes(record) }} 分钟 (点击修改)
                          </template>
                          <template v-else>
                            分钟未记录 (点击补充)
                          </template>
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
        <t-tab-panel :value="4" :label="`已归档 (${archivedHistorySorted.length})`">
          <div class="min-h-[300px] p-2">
            <template v-if="archivedHistorySorted.length">
              <div class="flex flex-col gap-2">
                <div v-for="item in archivedHistorySorted"
                  :key="`${item.title}@@${item.category}@@${item.period}@@${item.archivedAt}`"
                  class="p-3 rounded bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
                  <div class="flex flex-col gap-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-medium">{{ item.title }}</span>
                      <span v-if="item.category" class="px-2 py-0.5 rounded text-[11px] font-semibold border"
                        :style="getCategoryCssVars(item.category)" :class="getCategoryTagClass(item.category)">
                        {{ item.category }}
                      </span>
                      <t-tag size="small" variant="dark" :theme="getPeriodTheme(item.period)">{{
                        periodTextMap[item.period] }}</t-tag>
                      <t-tag size="small" variant="light" theme="default">
                        <template v-if="item.unit === 'minutes'">
                          目标 {{ item.minFrequency }} 次 × {{ item.minutesPerTime || 0 }} 分钟
                        </template>
                        <template v-else>目标 {{ item.minFrequency }} 次</template>
                      </t-tag>
                      <span class="text-xs text-neutral-400">归档于 {{ dayjs(item.archivedAt).format('YYYY-MM-DD HH:mm')
                      }}</span>
                    </div>
                    <div v-if="item.description" class="text-sm text-neutral-600 dark:text-neutral-400">
                      {{ item.description }}
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="w-full h-[200px] flex flex-col items-center justify-center text-neutral-400">
                <t-empty description="暂无已归档记录" />
              </div>
            </template>
          </div>
        </t-tab-panel>
      </t-tabs>

      <div
        class="p-2 sm:p-3 bg-white dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800 rounded-md mt-2">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
          <div class="text-sm">数据统计</div>
          <div class="flex items-center gap-2">
            <t-radio-group v-model="statsRange" variant="default-filled" size="small">
              <t-radio-button value="7d">7天</t-radio-button>
              <t-radio-button value="30d">30天</t-radio-button>
            </t-radio-group>
            <t-button shape="square" size="small" theme="primary" variant="outline" :disabled="exporting"
              @click="openExportDialog">
              <template v-slot:icon>
                <file-export-icon />
              </template>
            </t-button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <div
            class="p-2 rounded bg-linear-to-br from-green-100 to-green-50 dark:from-green-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]">
            <div class="text-xs text-center mb-1">可打卡任务</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-2xl sm:text-3xl font-bold text-center text-green-600 dark:text-green-400">{{
                animatedScheduled }}
              </div>
              <t-tag size="small" variant="light" theme="success">已打卡: {{ todayPunchedCount }}</t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-yellow-100 to-yellow-50 dark:from-yellow-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]">
            <div class="text-xs text-center mb-1">未开始任务</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-2xl sm:text-3xl font-bold text-center text-yellow-600 dark:text-yellow-400">{{
                animatedUnstarted }}
              </div>
              <t-tag size="small" variant="light" theme="warning">占比: {{ unstartedTaskRatio }}%</t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-red-100 to-red-50 dark:from-red-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]">
            <div class="text-xs text-center mb-1">未完成目标</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-2xl sm:text-3xl font-bold text-center text-red-600 dark:text-red-400">{{
                animatedUnfinishedGoals }}
              </div>
              <t-tag size="small" variant="light" theme="danger">占比: {{ unfinishedGoalRatio }}%</t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]">
            <div class="text-xs text-center mb-1">今日打卡次数</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-2xl sm:text-3xl font-bold text-center text-blue-600 dark:text-blue-400">{{
                animatedPunchIns
              }}</div>
              <t-tag size="small" variant="light" :theme="punchInsDiff >= 0 ? 'success' : 'danger'">
                较昨日{{ punchInsDiff >= 0 ? '增加' : '减少' }}: {{ Math.abs(punchInsDiff) }} 次
              </t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-purple-100 to-purple-50 dark:from-purple-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]">
            <div class="text-xs text-center mb-1">今日累计分钟</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-2xl sm:text-3xl font-bold text-center text-purple-600 dark:text-purple-400">{{
                animatedMinutes }}
              </div>
              <t-tag size="small" variant="light" :theme="minutesDiff >= 0 ? 'success' : 'danger'">
                较昨日{{ minutesDiff >= 0 ? '增加' : '减少' }}: {{ Math.abs(minutesDiff) }} 分钟
              </t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-orange-100 to-orange-50 dark:from-orange-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]">
            <div class="text-xs text-center mb-1">连续打卡天数</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div class="text-2xl sm:text-3xl font-bold text-center text-orange-600 dark:text-orange-400">{{
                animatedConsecutive }}
              </div>
              <t-tag size="small" variant="light" theme="warning">
                最大连续: {{ animatedMaxConsecutive }} 天
              </t-tag>
            </div>
          </div>
        </div>

        <div class="rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden mb-2 relative">
          <div class="px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
            <div class="text-sm font-bold text-neutral-600 dark:text-neutral-300">最近一年活跃热力图（打卡次数/分钟数）</div>
          </div>
          <div class="p-3">
            <div class="w-full overflow-x-auto">
              <div class="w-fit mx-auto">
                <div id="todo-cal-heatmap" class="min-w-[980px]"></div>
              </div>
            </div>
          </div>
          <div v-if="heatmapLoading"
            class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-neutral-950/50 rounded-md">
            <t-loading text="正在更新热力图..." />
          </div>
        </div>

        <div class="grid grid-cols-12 gap-3">
          <div
            class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden border border-neutral-100 dark:border-neutral-800">
            <div class="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30">
              <div class="text-xs font-bold text-blue-600 dark:text-blue-400">各任务类型的打卡趋势</div>
            </div>
            <div class="p-2">
              <div class="w-full aspect-video overflow-hidden" style="line-height: 0">
                <VChart :option="punchInsByCategoryOption" style="height: 100%; width: 100%" autoresize />
              </div>
            </div>
          </div>

          <div
            class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden border border-neutral-100 dark:border-neutral-800">
            <div
              class="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30">
              <div class="text-xs font-bold text-purple-600 dark:text-purple-400">任务分类</div>
            </div>
            <div class="p-2">
              <div class="w-full aspect-video overflow-hidden" style="line-height: 0">
                <VChart :option="categoryOption" style="height: 100%; width: 100%" autoresize />
              </div>
            </div>
          </div>

          <div
            class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden border border-neutral-100 dark:border-neutral-800">
            <div
              class="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30">
              <div class="text-xs font-bold text-green-600 dark:text-green-400">每日打卡次数趋势</div>
            </div>
            <div class="p-2">
              <div class="w-full aspect-video overflow-hidden" style="line-height: 0">
                <VChart :option="punchInsOption" style="height: 100%; width: 100%" autoresize />
              </div>
            </div>
          </div>

          <div
            class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden border border-neutral-100 dark:border-neutral-800">
            <div
              class="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30">
              <div class="text-xs font-bold text-orange-600 dark:text-orange-400">每日打卡分钟数趋势</div>
            </div>
            <div class="p-2">
              <div class="w-full aspect-video overflow-hidden" style="line-height: 0">
                <VChart :option="minutesOption" style="height: 100%; width: 100%" autoresize />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <t-dialog v-model:visible="exportDialogVisible" :header="exportDialogTitle" :width="exportDialogWidth"
      :footer="false">
      <div class="p-2 rounded" :style="{ backgroundColor: exportPalette.rootBg, color: exportPalette.rootText }">
        <div class="flex items-center justify-between gap-2 mb-2 px-1">
          <t-button size="small" variant="outline" @click="prevExportWeek" :disabled="exportingImage">上一周</t-button>
          <div class="text-xs" :style="exportMutedTextStyle">{{ exportWeekRangeText }}</div>
          <t-button size="small" variant="outline" @click="nextExportWeek"
            :disabled="!canNextExportWeek || exportingImage">下一周</t-button>
        </div>
        <div class="max-h-[70vh] overflow-y-auto px-1">
          <div ref="exportCaptureRef" class="p-3 rounded border" :style="exportRootStyle">
            <div class="text-base font-bold mb-3">{{ exportDialogTitle }}</div>

            <div class="flex flex-col gap-3">
              <div v-for="d in exportSummaries" :key="d.dayKey" class="p-3 rounded border" :style="exportDayCardStyle">
                <div class="flex items-start justify-between gap-2">
                  <div class="font-bold">{{ d.dayKey }}</div>
                  <div class="text-xs" :style="exportMutedTextStyle">
                    打卡 {{ d.punchIns }} 次 · {{ d.minutes }} 分钟
                  </div>
                </div>

                <div v-if="d.records.length" class="flex flex-col gap-2 mt-2">
                  <div v-for="r in d.records" :key="r.id" class="p-2 rounded border" :style="exportItemStyle">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-xs" :style="exportMutedTextStyle">{{ dayjs(r.timestamp).format('HH:mm')
                        }}</span>
                      <span class="font-medium">{{ r.todoTitle }}</span>
                      <span v-if="r.category" :style="getCategoryExportTagStyle(r.category)">
                        {{ r.category }}
                      </span>
                      <span v-if="r.minutes > 0" :style="exportMinutesBadgeStyle">
                        {{ r.minutes }} 分钟
                      </span>
                    </div>
                    <div v-if="r.note" class="text-sm mt-1 whitespace-pre-wrap" :style="exportNoteTextStyle">
                      {{ r.note }}
                    </div>
                  </div>
                </div>
                <div v-else class="text-sm mt-2" :style="exportMutedTextStyle">无打卡记录</div>
              </div>
            </div>

            <div v-if="exportGoals.length" class="mt-4 pt-4 border-t" :style="exportDividerStyle">
              <div class="text-sm font-bold mb-2 flex items-center gap-2">
                <span>本周完成的目标</span>
                <span :style="exportSuccessBadgeStyle">{{ exportGoals.length }}</span>
              </div>
              <div class="flex flex-col gap-2">
                <div v-for="g in exportGoals" :key="g.id" class="p-2 rounded border" :style="exportItemStyle">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{{ g.title }}</span>
                    <span v-if="g.category" :style="getCategoryExportTagStyle(g.category)">
                      {{ g.category }}
                    </span>
                    <span :style="exportSuccessBadgeStyle">
                      已完成
                    </span>
                    <span class="text-xs" :style="exportMutedTextStyle">完成于 {{
                      dayjs(g.completedAt).format('YYYY-MM-DD HH:mm')
                      }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <t-button variant="outline" @click="exportDialogVisible = false" :disabled="exportingImage">取消</t-button>
          <t-button theme="primary" @click="exportDialogToImage" :loading="exportingImage" :disabled="exportingImage">
            确定导出
          </t-button>
        </div>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="editVisible" header="编辑任务" :width="editDialogWidth" :footer="false">
      <div class="grid grid-cols-12 gap-3 max-h-[70vh] overflow-y-auto px-1">
        <div class="col-span-12">
          <div class="text-sm mb-1">任务名称</div>
          <t-input v-model="editTitle" placeholder="请输入任务名称" :disabled="editOnlyDescription" />
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">任务描述</div>
          <t-input v-model="editDescription" placeholder="可选：添加任务的详细描述" />
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <t-button variant="outline" @click="editVisible = false">取消</t-button>
        <t-button theme="primary" @click="saveEdit">保存</t-button>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="templateEditVisible" header="编辑模板" :width="editDialogWidth" :footer="false">
      <div class="grid grid-cols-12 gap-3 max-h-[70vh] overflow-y-auto px-1">
        <div class="col-span-12">
          <div class="text-sm mb-1">模板名称</div>
          <t-input v-model="templateTitle" placeholder="请输入模板名称" />
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">模板分类</div>
          <div class="flex items-center gap-2">
            <t-radio-group v-if="templateCategoryOptions.length" v-model="templateCategory" variant="default-filled"
              size="small" class="flex flex-wrap">
              <t-radio-button v-for="c in templateCategoryOptions" :key="c" :value="c">{{ c }}</t-radio-button>
            </t-radio-group>
            <t-input v-else v-model="templateCategory" placeholder="暂无分类，请先在配置管理中添加" disabled class="flex-1" />
          </div>
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">模板周期</div>
          <t-radio-group v-model="templatePeriod" variant="default-filled" size="small" class="flex flex-wrap">
            <t-radio-button value="daily">每天</t-radio-button>
            <t-radio-button value="weekly">每周</t-radio-button>
            <t-radio-button value="monthly">每月</t-radio-button>
            <t-radio-button value="yearly">每年</t-radio-button>
            <t-radio-button value="once">目标</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">模板单位</div>
          <t-radio-group v-model="templateUnit" variant="default-filled" size="small"
            :disabled="templatePeriod === 'once'" class="flex flex-wrap">
            <t-radio-button value="times">次数</t-radio-button>
            <t-radio-button value="minutes">分钟</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">最小频率</div>
          <div class="flex items-center gap-2">
            <t-radio-group v-model="templateMinFrequency" variant="default-filled" size="small"
              :disabled="templatePeriod === 'once'" class="flex flex-wrap">
              <t-radio-button v-for="freq in templateMinFrequencyOptions" :key="freq" :value="freq">{{ freq
                }}</t-radio-button>
            </t-radio-group>
            <div class="text-sm text-neutral-400">次</div>
          </div>
        </div>

        <div class="col-span-12" v-if="templateUnit === 'minutes'">
          <div class="text-sm mb-1">每次分钟</div>
          <div class="flex items-center gap-2">
            <t-radio-group v-model="templateMinutesPerTime" variant="default-filled" size="small"
              class="flex flex-wrap">
              <t-radio-button v-for="mins in templateMinutesPerTimeOptions" :key="mins" :value="mins">{{ mins
                }}</t-radio-button>
            </t-radio-group>
            <div class="text-sm text-neutral-400">分钟</div>
          </div>
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">模板描述</div>
          <t-input v-model="templateDescription" placeholder="可选：添加模板的详细描述" />
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <t-button variant="outline" @click="templateEditVisible = false">取消</t-button>
        <t-button theme="primary" @click="saveTemplateEdit">保存</t-button>
      </div>
    </t-dialog>

    <t-dialog v-model:visible="punchDialogVisible" header="打卡备注" :width="punchDialogWidth" :footer="false">
      <div class="flex flex-col gap-3">
        <div class="text-sm">请输入本次打卡备注（可选）：</div>
        <t-textarea v-model="punchNote" placeholder="例如：读了第3章..." autofocus />
        <div v-if="punchMinutesEnabled" class="flex items-center gap-3">
          <div class="text-sm shrink-0">本次分钟</div>
          <div class="flex items-center gap-2">
            <t-button variant="outline" size="small" shape="square" :disabled="punchMinutes <= 0"
              @click="adjustPunchMinutes(-1, $event)">
              <template #icon><minus-icon /></template>
            </t-button>
            <div class="min-w-14 text-center tabular-nums font-medium">{{ punchMinutes }}</div>
            <t-button variant="outline" size="small" shape="square" @click="adjustPunchMinutes(1, $event)">
              <template #icon><add-icon /></template>
            </t-button>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-2">
          <t-button variant="outline" @click="punchDialogVisible = false">取消</t-button>
          <t-button theme="primary" @click="confirmPunch">确认打卡</t-button>
        </div>
      </div>
    </t-dialog>
    <t-drawer v-model:visible="configDrawerVisible" placement="right" size="420px" header="配置管理" :footer="false">
      <div class="p-4 space-y-6">
        <div>
          <div class="text-sm mb-2 font-medium">任务分类</div>
          <div class="space-y-2 mb-2">
            <div v-for="(cat, idx) in draftCategoriesList" :key="idx" class="flex items-center gap-2">
              <t-input v-model="draftCategoriesList[idx]" placeholder="请输入分类名称" />
              <t-button variant="text" shape="square" size="small" theme="danger" @click="removeDraftCategory(idx)">
                <template #icon><delete-icon /></template>
              </t-button>
            </div>
          </div>
          <t-button block variant="dashed" theme="default" class="mt-2" @click="addDraftCategory">
            <template #icon><add-icon /></template>
            添加分类
          </t-button>
        </div>

        <div>
          <div class="text-sm mb-2 font-medium">最小频率</div>
          <div class="space-y-2 mb-2">
            <div v-for="(freq, idx) in draftMinFrequenciesList" :key="idx" class="flex items-center gap-2">
              <t-input-number v-model="draftMinFrequenciesList[idx]" :min="1" theme="column" class="flex-1" />
              <t-button variant="text" shape="square" size="small" theme="danger" @click="removeDraftFrequency(idx)">
                <template #icon><delete-icon /></template>
              </t-button>
            </div>
          </div>
          <t-button block variant="dashed" theme="default" class="mt-2" @click="addDraftFrequency">
            <template #icon><add-icon /></template>
            添加频率
          </t-button>
        </div>

        <div>
          <div class="text-sm mb-2 font-medium">每次分钟</div>
          <div class="space-y-2 mb-2">
            <div v-for="(min, idx) in draftMinutesPerTimesList" :key="idx" class="flex items-center gap-2">
              <t-input-number v-model="draftMinutesPerTimesList[idx]" :min="1" :step="5" theme="column"
                class="flex-1" />
              <t-button variant="text" shape="square" size="small" theme="danger" @click="removeDraftMinute(idx)">
                <template #icon><delete-icon /></template>
              </t-button>
            </div>
          </div>
          <t-button block variant="dashed" theme="default" class="mt-2" @click="addDraftMinute">
            <template #icon><add-icon /></template>
            添加分钟配置
          </t-button>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <t-button variant="outline" @click="resetUiConfig">恢复默认</t-button>
          <t-button theme="primary" @click="saveUiConfigFromDraft">保存</t-button>
        </div>
      </div>
    </t-drawer>
  </div>
</template>

<style lang="scss" scoped>
#todo-cal-heatmap {
  display: flex;
  justify-content: center;
}
</style>
