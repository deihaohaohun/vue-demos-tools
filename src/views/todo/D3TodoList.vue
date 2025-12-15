<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { nanoid } from 'nanoid'
import { MessagePlugin } from 'tdesign-vue-next'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import CalHeatmap from 'cal-heatmap'
import Tooltip from 'cal-heatmap/plugins/Tooltip'
import 'cal-heatmap/cal-heatmap.css'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import TodoItem from './TodoItem.vue'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

const STORAGE_KEY = 'todos'
const HISTORY_KEY = 'todo_history'
const TEMPLATES_KEY = 'todo_templates'
const DAY_STATS_KEY = 'todo_day_stats'
const SKIPPED_KEY = 'todo_skipped'

type TodoPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once'
type TodoUnit = 'times' | 'minutes'

interface Todo {
  title: string
  id: string
  done: boolean
  completedAt?: number
  punchIns: number
  category: string
  period: TodoPeriod
  minFrequency: number
  unit: TodoUnit
  minutesPerTime?: number
  templateId?: string
  createdAt: number
  dayKey: string
}

interface TodoTemplate {
  id: string
  title: string
  category: string
  period: TodoPeriod
  minFrequency: number
  unit: TodoUnit
  minutesPerTime?: number
  createdAt: number
}

interface DayStat {
  createdCount: number
  completedCount: number
  punchInsTotal: number
  minutesTotal: number
  categoryCreated: Record<string, number>
  categoryCompleted: Record<string, number>
}

const formatDayKey = (ts: number) => {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

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

const todos = ref<Todo[]>([])
const templates = ref<TodoTemplate[]>([])
const dayStats = ref<Record<string, DayStat>>({})
const history = ref<string[]>([])
const selectedIds = ref<Set<string>>(new Set())

const editVisible = ref(false)
const editingTodoId = ref<string | null>(null)
const editTitle = ref('')
const editCategory = ref<string>('学习')
const editPeriod = ref<TodoPeriod>('daily')
const editMinFrequency = ref<number>(1)
const editUnit = ref<TodoUnit>('times')
const editMinutesPerTime = ref<number>(15)

const todayKey = computed(() => formatDayKey(Date.now()))

const todayDisplay = computed(() => {
  const w = ['日', '一', '二', '三', '四', '五', '六']
  return `${todayKey.value} 周${w[new Date().getDay()]}`
})

const ensureDayStat = (dayKey: string) => {
  if (!dayStats.value[dayKey]) {
    dayStats.value[dayKey] = {
      createdCount: 0,
      completedCount: 0,
      punchInsTotal: 0,
      minutesTotal: 0,
      categoryCreated: {},
      categoryCompleted: {},
    }
  }
  return dayStats.value[dayKey]
}

const skipped = ref<Record<string, string[]>>({})

const isTemplateSkipped = (dayKey: string, templateId: string) => {
  return (skipped.value[dayKey] || []).includes(templateId)
}

const markTemplateSkipped = (dayKey: string, templateId: string) => {
  const list = skipped.value[dayKey] || []
  if (!list.includes(templateId)) {
    skipped.value[dayKey] = [...list, templateId]
  }
}

const unmarkTemplateSkipped = (dayKey: string, templateId: string) => {
  const list = skipped.value[dayKey] || []
  skipped.value[dayKey] = list.filter((id) => id !== templateId)
}

const incCategory = (record: Record<string, number>, key: string, delta: number) => {
  const k = key || '未分类'
  record[k] = (record[k] || 0) + delta
  if (record[k] <= 0) delete record[k]
}

const getTodoMinutesPerPunch = (todo: Todo) => {
  if (todo.unit !== 'minutes') return 0
  return typeof todo.minutesPerTime === 'number' ? todo.minutesPerTime : 15
}

const isTemplateDueOnDate = (tpl: TodoTemplate, date: Date) => {
  if (tpl.period === 'daily') return true
  if (tpl.period === 'once') return false

  const anchor = new Date(tpl.createdAt)
  if (tpl.period === 'weekly') {
    return anchor.getDay() === date.getDay()
  }
  if (tpl.period === 'monthly') {
    return anchor.getDate() === date.getDate()
  }
  if (tpl.period === 'yearly') {
    return anchor.getMonth() === date.getMonth() && anchor.getDate() === date.getDate()
  }
  return false
}

const syncTemplatesFromTodos = () => {
  for (const t of todos.value) {
    if (t.period === 'once') continue
    if (t.templateId) continue
    const existing = templates.value.find(
      (tpl) =>
        tpl.title === t.title &&
        tpl.period === t.period &&
        tpl.category === (t.category || '未分类'),
    )
    if (existing) {
      t.templateId = existing.id
    } else {
      const tplId = nanoid()
      templates.value.push({
        id: tplId,
        title: t.title,
        category: t.category || '未分类',
        period: t.period,
        minFrequency: t.minFrequency,
        unit: t.unit,
        minutesPerTime: t.unit === 'minutes' ? t.minutesPerTime : undefined,
        createdAt: typeof t.createdAt === 'number' ? t.createdAt : Date.now(),
      })
      t.templateId = tplId
    }
  }
}

const openEdit = (id: string) => {
  const todo = todos.value.find((t) => t.id === id)
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
  const todo = todos.value.find((t) => t.id === id)
  if (!todo) return

  const nextTitle = todo.title

  const dk = todo.dayKey
  const stat = ensureDayStat(dk)

  const oldCategory = todo.category || '未分类'
  const newCategory = editCategory.value || '未分类'

  const nextMinFrequency = todo.period === 'once' ? todo.minFrequency : editMinFrequency.value
  const nextMinutesPerTime =
    todo.period === 'once'
      ? todo.minutesPerTime
      : todo.unit === 'minutes'
        ? editMinutesPerTime.value
        : undefined

  const oldMinutes =
    todo.unit === 'minutes' ? (todo.punchIns || 0) * getTodoMinutesPerPunch(todo) : 0
  const newMinutes = todo.unit === 'minutes' ? (todo.punchIns || 0) * (nextMinutesPerTime || 15) : 0

  const wasDone = !!todo.done
  const shouldDone = todo.period !== 'once' ? (todo.punchIns || 0) >= nextMinFrequency : wasDone

  if (oldCategory !== newCategory) {
    incCategory(stat.categoryCreated, oldCategory, -1)
    incCategory(stat.categoryCreated, newCategory, 1)
  }

  if (wasDone) {
    stat.completedCount = Math.max(0, stat.completedCount - 1)
    incCategory(stat.categoryCompleted, oldCategory, -1)
  }
  if (shouldDone) {
    stat.completedCount += 1
    incCategory(stat.categoryCompleted, newCategory, 1)
  }

  stat.minutesTotal = Math.max(0, stat.minutesTotal - oldMinutes + newMinutes)

  todo.title = nextTitle
  todo.category = newCategory
  todo.minFrequency = nextMinFrequency
  todo.minutesPerTime = nextMinutesPerTime

  if (!wasDone && shouldDone) {
    todo.done = true
    todo.completedAt = Date.now()
  } else if (wasDone && !shouldDone) {
    todo.done = false
    todo.completedAt = undefined
  }

  if (todo.period !== 'once') {
    let tplId = todo.templateId
    if (!tplId) {
      const existingTpl = templates.value.find(
        (tpl) => tpl.title === todo.title && tpl.period === todo.period,
      )
      tplId = existingTpl ? existingTpl.id : nanoid()
      if (!existingTpl) {
        templates.value.push({
          id: tplId,
          title: todo.title,
          category: newCategory,
          period: todo.period,
          minFrequency: nextMinFrequency,
          unit: todo.unit,
          minutesPerTime: todo.unit === 'minutes' ? nextMinutesPerTime : undefined,
          createdAt: typeof todo.createdAt === 'number' ? todo.createdAt : Date.now(),
        })
      }
      todo.templateId = tplId
    }

    const tpl = templates.value.find((t) => t.id === tplId)
    if (tpl) {
      tpl.category = newCategory
      tpl.minFrequency = nextMinFrequency
      tpl.minutesPerTime = todo.unit === 'minutes' ? nextMinutesPerTime : undefined
    }
  }

  editVisible.value = false
  editingTodoId.value = null
  MessagePlugin.success('已保存修改')
}

const materializeTodayTodosFromTemplates = () => {
  const tk = todayKey.value
  const todayDate = new Date()

  const skippedTplIds = new Set(skipped.value[tk] || [])

  const keep = todos.value.filter((t) => t.dayKey === tk && t.period === 'once')
  const instances: Todo[] = [...keep]

  const existingByTemplateId = new Set(
    todos.value.filter((t) => t.dayKey === tk && !!t.templateId).map((t) => t.templateId as string),
  )

  for (const tpl of templates.value) {
    if (!isTemplateDueOnDate(tpl, todayDate)) continue
    if (skippedTplIds.has(tpl.id)) continue
    if (existingByTemplateId.has(tpl.id)) {
      const existing = todos.value.find((t) => t.dayKey === tk && t.templateId === tpl.id)
      if (existing) instances.push(existing)
      continue
    }
    const now = Date.now()
    instances.push({
      title: tpl.title,
      id: nanoid(),
      done: false,
      punchIns: 0,
      category: tpl.category,
      period: tpl.period,
      minFrequency: tpl.minFrequency,
      unit: tpl.unit,
      minutesPerTime: tpl.unit === 'minutes' ? tpl.minutesPerTime : undefined,
      templateId: tpl.id,
      createdAt: now,
      dayKey: tk,
    })
    ensureDayStat(tk).createdCount += 1
    incCategory(ensureDayStat(tk).categoryCreated, tpl.category || '未分类', 1)
  }

  // 防止多端/旧数据导致的“已跳过但实例仍在”
  todos.value = instances.filter((t) => !(t.templateId && skippedTplIds.has(t.templateId)))
}

const rebuildStatsFromTodos = () => {
  const grouped: Record<string, DayStat> = {}
  for (const t of todos.value) {
    const dk = t.dayKey
    if (!grouped[dk]) {
      grouped[dk] = {
        createdCount: 0,
        completedCount: 0,
        punchInsTotal: 0,
        minutesTotal: 0,
        categoryCreated: {},
        categoryCompleted: {},
      }
    }
    grouped[dk].createdCount += 1
    grouped[dk].punchInsTotal += t.punchIns || 0
    if (t.unit === 'minutes') {
      grouped[dk].minutesTotal += (t.punchIns || 0) * getTodoMinutesPerPunch(t)
    }
    incCategory(grouped[dk].categoryCreated, t.category || '未分类', 1)
    if (t.done) grouped[dk].completedCount += 1
    if (t.done) incCategory(grouped[dk].categoryCompleted, t.category || '未分类', 1)
  }

  for (const [dk, stat] of Object.entries(grouped)) {
    const target = ensureDayStat(dk)
    target.createdCount = Math.max(target.createdCount, stat.createdCount)
    target.completedCount = Math.max(target.completedCount, stat.completedCount)
    target.punchInsTotal = Math.max(target.punchInsTotal, stat.punchInsTotal)
    target.minutesTotal = Math.max(target.minutesTotal, stat.minutesTotal)

    for (const [c, v] of Object.entries(stat.categoryCreated)) {
      target.categoryCreated[c] = Math.max(target.categoryCreated[c] || 0, v)
    }
    for (const [c, v] of Object.entries(stat.categoryCompleted)) {
      target.categoryCompleted[c] = Math.max(target.categoryCompleted[c] || 0, v)
    }
  }
}

// 从 localStorage 加载数据
const loadData = () => {
  const storedTodos = localStorage.getItem(STORAGE_KEY)
  if (storedTodos) {
    try {
      const parsed = JSON.parse(storedTodos)
      todos.value = parsed.map(
        (t: Partial<Todo> & { title: string; id: string; done: boolean }) => {
          const createdAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now()
          const dayKey = typeof t.dayKey === 'string' ? t.dayKey : formatDayKey(createdAt)
          const normalized: Todo = {
            title: t.title,
            id: t.id,
            done: !!t.done,
            completedAt: typeof t.completedAt === 'number' ? t.completedAt : undefined,
            punchIns: typeof t.punchIns === 'number' ? t.punchIns : 0,
            category: typeof t.category === 'string' ? t.category : '',
            period: (t.period as TodoPeriod) || 'daily',
            minFrequency: typeof t.minFrequency === 'number' ? t.minFrequency : 1,
            unit: (t.unit as TodoUnit) || 'times',
            minutesPerTime: typeof t.minutesPerTime === 'number' ? t.minutesPerTime : undefined,
            createdAt,
            dayKey,
          }

          if (normalized.unit === 'minutes' && typeof normalized.minutesPerTime !== 'number') {
            normalized.minutesPerTime = 15
          }
          return normalized
        },
      )
    } catch (e) {
      console.error('加载任务数据失败:', e)
    }
  }

  const storedTemplates = localStorage.getItem(TEMPLATES_KEY)
  if (storedTemplates) {
    try {
      const parsed = JSON.parse(storedTemplates)
      templates.value = (Array.isArray(parsed) ? parsed : []).map((t: Partial<TodoTemplate>) => {
        const createdAt = typeof t.createdAt === 'number' ? t.createdAt : Date.now()
        const unitValue = (t.unit as TodoUnit) || 'times'
        return {
          id: typeof t.id === 'string' ? t.id : nanoid(),
          title: typeof t.title === 'string' ? t.title : '',
          category: typeof t.category === 'string' ? t.category : '',
          period: (t.period as TodoPeriod) || 'daily',
          minFrequency: typeof t.minFrequency === 'number' ? t.minFrequency : 1,
          unit: unitValue,
          minutesPerTime:
            unitValue === 'minutes'
              ? typeof t.minutesPerTime === 'number'
                ? t.minutesPerTime
                : 15
              : undefined,
          createdAt,
        }
      })
    } catch (e) {
      console.error('加载模板数据失败:', e)
    }
  }

  const storedDayStats = localStorage.getItem(DAY_STATS_KEY)
  if (storedDayStats) {
    try {
      const parsed = JSON.parse(storedDayStats)
      const normalized: Record<string, DayStat> = {}
      for (const [dk, s] of Object.entries(parsed || {})) {
        const obj = s as Partial<DayStat>
        normalized[dk] = {
          createdCount: typeof obj.createdCount === 'number' ? obj.createdCount : 0,
          completedCount: typeof obj.completedCount === 'number' ? obj.completedCount : 0,
          punchInsTotal: typeof obj.punchInsTotal === 'number' ? obj.punchInsTotal : 0,
          minutesTotal: typeof obj.minutesTotal === 'number' ? obj.minutesTotal : 0,
          categoryCreated: (obj.categoryCreated as Record<string, number>) || {},
          categoryCompleted: (obj.categoryCompleted as Record<string, number>) || {},
        }
      }
      dayStats.value = normalized
    } catch (e) {
      console.error('加载统计数据失败:', e)
    }
  }

  const storedSkipped = localStorage.getItem(SKIPPED_KEY)
  if (storedSkipped) {
    try {
      skipped.value = JSON.parse(storedSkipped) || {}
    } catch (e) {
      console.error('加载跳过记录失败:', e)
    }
  }

  const storedHistory = localStorage.getItem(HISTORY_KEY)
  if (storedHistory) {
    try {
      history.value = JSON.parse(storedHistory)
    } catch (e) {
      console.error('加载历史任务记录失败:', e)
    }
  }
}

// 保存数据到 localStorage
const saveTodos = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value))
}

const saveHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

const saveTemplates = () => {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates.value))
}

const saveDayStats = () => {
  localStorage.setItem(DAY_STATS_KEY, JSON.stringify(dayStats.value))
}

const saveSkipped = () => {
  localStorage.setItem(SKIPPED_KEY, JSON.stringify(skipped.value))
}

// 页面加载时读取数据
onMounted(() => {
  loadData()

  rebuildStatsFromTodos()
  syncTemplatesFromTodos()
  materializeTodayTodosFromTemplates()
})

// 监听变化并保存
watch(todos, saveTodos, { deep: true })
watch(history, saveHistory, { deep: true })
watch(templates, saveTemplates, { deep: true })
watch(dayStats, saveDayStats, { deep: true })
watch(skipped, saveSkipped, { deep: true })

const pendingTodos = computed(() => todos.value.filter((todo) => !todo.done))
const completedTodos = computed(() => todos.value.filter((todo) => todo.done))

const updateHistory = (text: string) => {
  const index = history.value.indexOf(text)
  if (index > -1) {
    history.value.splice(index, 1)
  }
  history.value.unshift(text)
  if (history.value.length > 10) {
    history.value.pop()
  }
}

const removeHistory = (text: string) => {
  const index = history.value.indexOf(text)
  if (index > -1) {
    history.value.splice(index, 1)
    MessagePlugin.success('已删除历史任务记录')
  }
}

const clearHistory = () => {
  if (!history.value.length) return
  history.value = []
  MessagePlugin.success('已清空历史任务记录')
}

const handlePunchIn = (id: string) => {
  const todo = todos.value.find((t) => t.id === id)
  if (todo) {
    if (todo.period === 'once') return
    todo.punchIns = (todo.punchIns || 0) + 1
    const stat = ensureDayStat(todo.dayKey)
    stat.punchInsTotal += 1
    if (todo.unit === 'minutes') {
      stat.minutesTotal += getTodoMinutesPerPunch(todo)
    }

    if (!todo.done && todo.punchIns >= todo.minFrequency) {
      todo.done = true
      todo.completedAt = Date.now()
      ensureDayStat(todo.dayKey).completedCount += 1
      incCategory(ensureDayStat(todo.dayKey).categoryCompleted, todo.category || '未分类', 1)
      MessagePlugin.success('已达成目标，自动完成')
      return
    }

    MessagePlugin.success(`打卡成功,当前已打卡 ${todo.punchIns} 次`)
  }
}

const addTodo = () => {
  if (title.value.trim()) {
    const text = title.value.trim()

    // 如果存在未完成的同名任务,提示打卡
    const existing = todos.value.find(
      (t) =>
        t.title === text && !t.done && t.category === category.value && t.period === period.value,
    )
    if (existing) {
      const action = existing.punchIns > 0 ? '再次打卡' : '开始打卡'
      MessagePlugin.info(`任务已存在,请${action}`)
      return
    }

    const now = Date.now()
    const dk = formatDayKey(now)
    let templateId: string | undefined
    if (period.value !== 'once') {
      const existingTpl = templates.value.find((tpl) => {
        return tpl.title === text && tpl.period === period.value && tpl.category === category.value
      })
      if (existingTpl) {
        templateId = existingTpl.id
      } else {
        templateId = nanoid()
        templates.value.push({
          id: templateId,
          title: text,
          category: category.value,
          period: period.value,
          minFrequency: minFrequency.value,
          unit: unit.value,
          minutesPerTime: unit.value === 'minutes' ? minutesPerTime.value : undefined,
          createdAt: now,
        })
      }

      // 如果今天曾跳过该模板，重新添加时取消跳过
      unmarkTemplateSkipped(dk, templateId)
    }

    todos.value.push({
      title: text,
      id: nanoid(),
      done: false,
      punchIns: 0,
      category: category.value,
      period: period.value,
      minFrequency: minFrequency.value,
      unit: unit.value,
      minutesPerTime: unit.value === 'minutes' ? minutesPerTime.value : undefined,
      templateId,
      createdAt: now,
      dayKey: dk,
    })
    ensureDayStat(dk).createdCount += 1
    incCategory(ensureDayStat(dk).categoryCreated, category.value, 1)
    updateHistory(text)
    title.value = ''
  } else {
    MessagePlugin.error('任务标题不能为空')
  }
}

const addFromHistory = (text: string) => {
  const existing = todos.value.find((t) => t.title === text)
  if (existing) {
    MessagePlugin.info('已存在相同名称任务')
    return
  }

  const now = Date.now()
  const dk = formatDayKey(now)
  let templateId: string | undefined
  if (period.value !== 'once') {
    const existingTpl = templates.value.find((tpl) => {
      return tpl.title === text && tpl.period === period.value && tpl.category === category.value
    })
    if (existingTpl) {
      templateId = existingTpl.id
    } else {
      templateId = nanoid()
      templates.value.push({
        id: templateId,
        title: text,
        category: category.value,
        period: period.value,
        minFrequency: minFrequency.value,
        unit: unit.value,
        minutesPerTime: unit.value === 'minutes' ? minutesPerTime.value : undefined,
        createdAt: now,
      })
    }

    // 如果今天曾跳过该模板，重新添加时取消跳过
    unmarkTemplateSkipped(dk, templateId)
  }

  todos.value.push({
    title: text,
    id: nanoid(),
    done: false,
    punchIns: 0,
    category: category.value,
    period: period.value,
    minFrequency: minFrequency.value,
    unit: unit.value,
    minutesPerTime: unit.value === 'minutes' ? minutesPerTime.value : undefined,
    templateId,
    createdAt: now,
    dayKey: dk,
  })
  ensureDayStat(dk).createdCount += 1
  incCategory(ensureDayStat(dk).categoryCreated, category.value, 1)
  updateHistory(text)
  MessagePlugin.success('已从历史任务记录添加')
}

const deleteTodo = (id: string) => {
  const target = todos.value.find((t) => t.id === id)
  if (!target) return

  // 周期任务：表示“今天不做了”，仅跳过今天，不删除模板
  if (target.period !== 'once') {
    const dk = target.dayKey
    const tplId = target.templateId
    if (tplId) {
      markTemplateSkipped(dk, tplId)
    }

    const removed = todos.value.filter(
      (t) => t.dayKey === dk && (!!tplId ? t.templateId === tplId : t.id === id),
    )

    const stat = ensureDayStat(dk)
    stat.createdCount = Math.max(0, stat.createdCount - removed.length)
    for (const r of removed) {
      incCategory(stat.categoryCreated, r.category || '未分类', -1)
      const punch = r.punchIns || 0
      stat.punchInsTotal = Math.max(0, stat.punchInsTotal - punch)
      if (r.unit === 'minutes') {
        stat.minutesTotal = Math.max(0, stat.minutesTotal - punch * getTodoMinutesPerPunch(r))
      }
      if (r.done) {
        stat.completedCount = Math.max(0, stat.completedCount - 1)
        incCategory(stat.categoryCompleted, r.category || '未分类', -1)
      }
    }

    const toRemoveIds = new Set(removed.map((t) => t.id))
    todos.value = todos.value.filter((t) => !toRemoveIds.has(t.id))
    for (const rid of toRemoveIds) selectedIds.value.delete(rid)

    MessagePlugin.success('已跳过今天')
    return
  }

  todos.value = todos.value.filter((todo) => todo.id !== id)
  selectedIds.value.delete(id)
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
  const todo = todos.value.find((t) => t.id === id)
  if (todo) {
    if (todo.done === done) return
    todo.done = done
    if (done) {
      todo.completedAt = Date.now()
      ensureDayStat(todo.dayKey).completedCount += 1
      incCategory(ensureDayStat(todo.dayKey).categoryCompleted, todo.category || '未分类', 1)
    } else {
      todo.completedAt = undefined
      const stat = ensureDayStat(todo.dayKey)
      stat.completedCount = Math.max(0, stat.completedCount - 1)
      incCategory(stat.categoryCompleted, todo.category || '未分类', -1)
    }
  }
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

const statsRange = ref<'today' | '7d' | '30d'>('today')

const getDayKeyOffsetFromToday = (offsetDays: number) => {
  const base = new Date()
  base.setHours(0, 0, 0, 0)
  base.setDate(base.getDate() + offsetDays)
  return formatDayKey(base.getTime())
}

const getHeatmapStartDate = () => {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start
}

const getDaysDiff = (a: Date, b: Date) => {
  const day = 24 * 60 * 60 * 1000
  const aa = new Date(a)
  const bb = new Date(b)
  aa.setHours(0, 0, 0, 0)
  bb.setHours(0, 0, 0, 0)
  return Math.floor((bb.getTime() - aa.getTime()) / day)
}

let calHeatmap: any = null

const dayKeyToTimestamp = (dayKey: string) => {
  const parts = dayKey.split('-')
  const y = Number(parts[0])
  const m = Number(parts[1])
  const d = Number(parts[2])
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
}

const calendarData = computed(() => {
  const start = getHeatmapStartDate()
  const today = new Date()
  const days = getDaysDiff(start, today) + 1
  const records: Array<{ ts: number; value: number; minutes: number; completedCount: number }> = []
  const minutesByTs: Record<number, number> = {}
  const completedByTs: Record<number, number> = {}

  for (let i = days - 1; i >= 0; i -= 1) {
    const dk = getDayKeyOffsetFromToday(-i)
    const punches =
      dk === todayKey.value ? todayPunchInsTotal.value : dayStats.value[dk]?.punchInsTotal || 0
    const minutes =
      dk === todayKey.value ? todayMinutesTotal.value : dayStats.value[dk]?.minutesTotal || 0
    const completedCount =
      dk === todayKey.value ? todayCompletedCount.value : dayStats.value[dk]?.completedCount || 0
    const ts = dayKeyToTimestamp(dk)
    records.push({ ts, value: punches, minutes, completedCount })
    minutesByTs[ts] = minutes
    completedByTs[ts] = completedCount
  }

  const sumPunches = records.reduce((s, r) => s + (r.value || 0), 0)
  const sumMinutes = records.reduce((s, r) => s + (r.minutes || 0), 0)
  const sumCompleted = records.reduce((s, r) => s + (r.completedCount || 0), 0)

  if (sumPunches === 0 && sumMinutes === 0 && sumCompleted === 0) {
    for (const r of records) {
      const d = new Date(r.ts)
      const week = d.getDay() // 0-6
      const date = d.getDate() // 1-31
      const punches = week === 0 || week === 6 ? date % 2 : (date % 5) + 1
      const minutes = punches * (10 + (date % 3) * 5)
      const completedCount = Math.min(punches, (date % 4) + 1)
      r.value = punches
      r.minutes = minutes
      r.completedCount = completedCount
      minutesByTs[r.ts] = minutes
      completedByTs[r.ts] = completedCount
    }
  }

  return { records, minutesByTs, completedByTs }
})

const renderCalHeatmap = async () => {
  const root = document.getElementById('todo-cal-heatmap')
  const legend = document.getElementById('todo-cal-heatmap-legend')
  if (!root) return

  if (calHeatmap) {
    await calHeatmap.destroy()
    calHeatmap = null
  }

  if (legend) {
    legend.innerHTML = ''
  }

  dayjs.locale('zh-cn')
  const start = getHeatmapStartDate()

  calHeatmap = new CalHeatmap()
  calHeatmap.paint(
    {
      itemSelector: '#todo-cal-heatmap',
      date: { start },
      data: {
        source: calendarData.value.records,
        x: (d: any) => d.ts,
        y: 'value',
        defaultValue: 0,
      },
      scale: {
        color: {
          type: 'threshold',
          domain: [1, 3, 6, 10],
          range: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
        },
      },
      domain: {
        type: 'month',
        gutter: 4,
        dynamicDimension: false,
      },
      subDomain: {
        type: 'day',
        radius: 2,
        width: 12,
        height: 12,
        gutter: 2,
      },
    },
    [
      [
        Tooltip,
        {
          text: function (date: any, value: any, dayjsDate: any) {
            const ts = typeof date === 'number' ? date : date?.getTime?.() || 0
            const punches = typeof value === 'number' ? value : 0
            const minutes = calendarData.value.minutesByTs[ts] || 0
            const completedCount = calendarData.value.completedByTs[ts] || 0
            const dateText = dayjsDate?.format?.('YYYY-MM-DD') || dayjs(date).format('YYYY-MM-DD')
            return (
              `${dateText}` +
              `<br/>打卡次数: ${punches} 次` +
              `<br/>累计分钟: ${minutes} 分钟` +
              `<br/>完成任务: ${completedCount} 个`
            )
          },
        },
      ],
    ],
  )
}

onMounted(() => {
  renderCalHeatmap()
})

watch(
  calendarData,
  () => {
    renderCalHeatmap()
  },
  { deep: true },
)

onBeforeUnmount(() => {
  if (calHeatmap) {
    calHeatmap.destroy()
    calHeatmap = null
  }
})

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

const createdSeries = computed(() => rangeStats.value.map((s) => s.createdCount))
const completedSeries = computed(() => rangeStats.value.map((s) => s.completedCount))

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

const trendOption = computed(() => {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['完成任务数'], top: 0 },
    grid: { left: 24, right: 24, top: 40, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: rangeLabels.value, axisTick: { show: false } },
    yAxis: { type: 'value', name: '个', minInterval: 1 },
    series: [
      {
        name: '完成任务数',
        type: 'line',
        data: completedSeries.value,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#f472b6' },
        areaStyle: { color: 'rgba(244,114,182,0.18)' },
      },
    ],
  }
})

const punchInsOption = computed(() => {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['打卡次数'], top: 0 },
    grid: { left: 24, right: 24, top: 40, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: rangeLabels.value, axisTick: { show: false } },
    yAxis: { type: 'value', name: '次', minInterval: 1 },
    series: [
      {
        name: '打卡次数',
        type: 'line',
        data: punchInsSeries.value,
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: '#a78bfa' },
        areaStyle: { color: 'rgba(167,139,250,0.2)' },
      },
    ],
  }
})

const minutesOption = computed(() => {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['累计分钟'], top: 0 },
    grid: { left: 24, right: 24, top: 40, bottom: 6, containLabel: true },
    xAxis: { type: 'category', data: rangeLabels.value, axisTick: { show: false } },
    yAxis: { type: 'value', name: '分钟', minInterval: 1 },
    series: [
      {
        name: '累计分钟',
        type: 'line',
        data: minutesSeries.value,
        smooth: true,
        symbolSize: 6,
        itemStyle: { color: '#fb923c' },
        areaStyle: { color: 'rgba(251,146,60,0.2)' },
      },
    ],
  }
})

const categoryOption = computed(() => {
  const data = Object.entries(rangeCategoryCreated.value).sort((a, b) => (b[1] || 0) - (a[1] || 0))
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    grid: { left: 24, right: 24, top: 40, bottom: 26, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((d) => d[0]),
      axisTick: { show: false },
      axisLabel: { interval: 0, rotate: data.length > 6 ? 30 : 0 },
    },
    yAxis: { type: 'value', name: '个', minInterval: 1 },
    series: [
      {
        name: '任务分类',
        type: 'bar',
        data: data.map((d) => d[1] || 0),
        barWidth: 16,
        itemStyle: { color: '#60a5fa' },
      },
    ],
  }
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
        <t-tab-panel :value="1" label="待完成">
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
        <t-tab-panel :value="2" label="已完成">
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
            <div class="text-xs text-neutral-500 mb-2">完成任务数趋势</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="trendOption" style="height: 100%; width: 100%" />
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
