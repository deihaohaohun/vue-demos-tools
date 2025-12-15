<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
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
      console.error('加载历史记录失败:', e)
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
    MessagePlugin.success('已删除历史记录')
  }
}

const clearHistory = () => {
  if (!history.value.length) return
  history.value = []
  MessagePlugin.success('已清空历史记录')
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
  MessagePlugin.success('已从历史记录添加')
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
const completionRateSeries = computed(() =>
  rangeStats.value.map((s) => {
    if (!s.createdCount) return 0
    return Math.round((s.completedCount / s.createdCount) * 100)
  }),
)

const punchInsSeries = computed(() => rangeStats.value.map((s) => s.punchInsTotal))
const minutesSeries = computed(() => rangeStats.value.map((s) => s.minutesTotal))

const rangeCategoryCompleted = computed(() => {
  const map: Record<string, number> = {}
  if (statsRange.value === 'today') {
    for (const t of todayTodos.value) {
      if (!t.done) continue
      const k = t.category || '未分类'
      map[k] = (map[k] || 0) + 1
    }
    return map
  }

  for (const dk of rangeDayKeys.value) {
    const stat = dayStats.value[dk]
    if (!stat) continue
    for (const [c, v] of Object.entries(stat.categoryCompleted || {})) {
      map[c] = (map[c] || 0) + (v || 0)
    }
  }
  return map
})

const trendOption = computed(() => {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['总任务', '已完成', '完成率%'], top: 0 },
    grid: { left: 24, right: 24, top: 40, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: rangeLabels.value, axisTick: { show: false } },
    yAxis: [
      { type: 'value', name: '任务', minInterval: 1 },
      { type: 'value', name: '%', min: 0, max: 100 },
    ],
    series: [
      {
        name: '总任务',
        type: 'bar',
        data: createdSeries.value,
        itemStyle: { color: '#60a5fa' },
        barWidth: 14,
      },
      {
        name: '已完成',
        type: 'bar',
        data: completedSeries.value,
        itemStyle: { color: '#34d399' },
        barWidth: 14,
      },
      {
        name: '完成率%',
        type: 'line',
        yAxisIndex: 1,
        data: completionRateSeries.value,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#f472b6' },
      },
    ],
  }
})

const activityOption = computed(() => {
  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    legend: { data: ['打卡次数', '累计分钟'], top: 0 },
    grid: { left: 24, right: 24, top: 40, bottom: 24, containLabel: true },
    xAxis: { type: 'category', data: rangeLabels.value, axisTick: { show: false } },
    yAxis: [
      { type: 'value', name: '次', minInterval: 1 },
      { type: 'value', name: '分钟', minInterval: 1 },
    ],
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
      {
        name: '累计分钟',
        type: 'line',
        yAxisIndex: 1,
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
  const data = Object.entries(rangeCategoryCompleted.value)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  return {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item' },
    legend: { top: 0 },
    color: ['#34d399', '#60a5fa', '#f472b6', '#a78bfa', '#fb923c', '#22c55e', '#eab308'],
    series: [
      {
        type: 'pie',
        name: '完成分类',
        radius: ['35%', '70%'],
        center: ['50%', '60%'],
        data,
        label: { formatter: '{b}: {d}%' },
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
    <div class="w-[800px] mx-auto pt-4">
      <div class="text-sm text-neutral-500 mb-2">今天是: {{ todayDisplay }}</div>
      <div class="flex gap-2 items-center justify-center">
        <t-input autofocus v-model="title" :onEnter="addTodo" placeholder="添加一个任务"></t-input>
        <t-button @click="addTodo">添加</t-button>
      </div>
    </div>

    <div class="w-[800px] mx-auto mt-4 grid grid-cols-12 gap-2">
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

    <div class="w-[800px] mx-auto mt-4 flex flex-wrap gap-2">
      <div class="text-sm text-neutral-500 flex items-center">历史记录:</div>
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

    <div class="w-[800px] mx-auto mt-4 rounded-md overflow-hidden">
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
                :is-selected="selectedIds.has(todo.id)"
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

        <div class="grid grid-cols-12 gap-3">
          <div class="col-span-12 lg:col-span-7 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">完成趋势（总任务/已完成/完成率）</div>
            <div class="h-[240px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="trendOption" style="height: 100%; width: 100%" />
            </div>
          </div>
          <div class="col-span-12 lg:col-span-5 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">完成分类占比</div>
            <div class="h-[240px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="categoryOption" style="height: 100%; width: 100%" />
            </div>
          </div>
          <div class="col-span-12 rounded-md bg-neutral-50 dark:bg-neutral-900 p-2">
            <div class="text-xs text-neutral-500 mb-2">活跃度（打卡次数/累计分钟）</div>
            <div class="h-[220px] w-full overflow-hidden" style="line-height: 0">
              <VChart :option="activityOption" style="height: 100%; width: 100%" />
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

<style lang="scss" scoped></style>
