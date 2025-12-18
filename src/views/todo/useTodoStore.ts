import { computed, onMounted, ref, watch } from 'vue'
import { nanoid } from 'nanoid'

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
  description?: string
  templateId?: string
  createdAt: number
  dayKey: string
  deadline?: number
}

interface TodoTemplate {
  id: string
  title: string
  category: string
  period: TodoPeriod
  minFrequency: number
  unit: TodoUnit
  minutesPerTime?: number
  description?: string
  createdAt: number
  deadline?: number
}

interface DayStat {
  createdCount: number
  completedCount: number
  punchInsTotal: number
  minutesTotal: number
  categoryCreated: Record<string, number>
  categoryCompleted: Record<string, number>
  categoryPunchIns: Record<string, number>
}

interface HistoryItem {
  title: string
  category: string
  period: TodoPeriod
  minFrequency: number
  unit: TodoUnit
  minutesPerTime?: number
  description?: string
}

interface PunchRecord {
  id: string
  todoId: string
  todoTitle: string
  category: string
  timestamp: number
  dayKey: string
  note?: string
}

const STORAGE_KEY = 'todos'
const HISTORY_KEY = 'todo_history'
const TEMPLATES_KEY = 'todo_templates'
const DAY_STATS_KEY = 'todo_day_stats'
const PUNCH_RECORDS_KEY = 'todo_punch_records'

export type { Todo, TodoTemplate, DayStat, TodoPeriod, TodoUnit, HistoryItem, PunchRecord }

export const useTodoStore = () => {
  const todos = ref<Todo[]>([])
  const templates = ref<TodoTemplate[]>([])
  const dayStats = ref<Record<string, DayStat>>({})
  const history = ref<HistoryItem[]>([])
  const punchRecords = ref<PunchRecord[]>([])

  const formatDayKey = (ts: number) => {
    const d = new Date(ts)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const todayKey = computed(() => formatDayKey(Date.now()))

  const ensureDayStat = (dayKey: string) => {
    if (!dayStats.value[dayKey]) {
      dayStats.value[dayKey] = {
        createdCount: 0,
        completedCount: 0,
        punchInsTotal: 0,
        minutesTotal: 0,
        categoryCreated: {},
        categoryCompleted: {},
        categoryPunchIns: {},
      }
    }
    return dayStats.value[dayKey]
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

  const materializeTodayTodosFromTemplates = () => {
    const tk = todayKey.value
    const todayDate = new Date()

    const keep = todos.value.filter((t) => t.dayKey === tk && t.period === 'once')
    const instances: Todo[] = [...keep]

    const existingByTemplateId = new Set(
      todos.value
        .filter((t) => t.dayKey === tk && !!t.templateId)
        .map((t) => t.templateId as string),
    )

    for (const tpl of templates.value) {
      if (!isTemplateDueOnDate(tpl, todayDate)) continue
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

    todos.value = instances
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
          categoryPunchIns: {},
        }
      }
      grouped[dk].createdCount += 1
      grouped[dk].punchInsTotal += t.punchIns || 0
      incCategory(grouped[dk].categoryPunchIns, t.category || '未分类', t.punchIns || 0)
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
      for (const [c, v] of Object.entries(stat.categoryPunchIns)) {
        target.categoryPunchIns[c] = Math.max(target.categoryPunchIns[c] || 0, v)
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
              description: typeof t.description === 'string' ? t.description : undefined,
              createdAt,
              dayKey,
              templateId: typeof t.templateId === 'string' ? t.templateId : undefined,
              deadline: typeof t.deadline === 'number' ? t.deadline : undefined,
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
            description: typeof t.description === 'string' ? t.description : undefined,
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
            categoryPunchIns: (obj.categoryPunchIns as Record<string, number>) || {},
          }
        }
        dayStats.value = normalized
      } catch (e) {
        console.error('加载统计数据失败:', e)
      }
    }

    const storedHistory = localStorage.getItem(HISTORY_KEY)
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory)
        // 向后兼容：处理旧的字符串格式
        if (Array.isArray(parsed)) {
          history.value = parsed.map((item: string | HistoryItem) => {
            if (typeof item === 'string') {
              // 旧格式：只有标题字符串
              return {
                title: item,
                category: '',
                period: 'daily' as TodoPeriod,
                minFrequency: 1,
                unit: 'times' as TodoUnit,
                minutesPerTime: undefined,
              }
            }
            // 新格式：完整的历史项对象
            return {
              title: typeof item.title === 'string' ? item.title : '',
              category: typeof item.category === 'string' ? item.category : '',
              period: (item.period as TodoPeriod) || 'daily',
              minFrequency: typeof item.minFrequency === 'number' ? item.minFrequency : 1,
              unit: (item.unit as TodoUnit) || 'times',
              minutesPerTime:
                typeof item.minutesPerTime === 'number' ? item.minutesPerTime : undefined,
            }
          })
        }
      } catch (e) {
        console.error('加载历史任务记录失败:', e)
      }
    }

    const storedPunchRecords = localStorage.getItem(PUNCH_RECORDS_KEY)
    if (storedPunchRecords) {
      try {
        const parsed = JSON.parse(storedPunchRecords)
        if (Array.isArray(parsed)) {
          punchRecords.value = parsed.map((item: Partial<PunchRecord>) => ({
            id: typeof item.id === 'string' ? item.id : nanoid(),
            todoId: typeof item.todoId === 'string' ? item.todoId : '',
            todoTitle: typeof item.todoTitle === 'string' ? item.todoTitle : '未知任务',
            category: typeof item.category === 'string' ? item.category : '未分类',
            timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
            dayKey: typeof item.dayKey === 'string' ? item.dayKey : formatDayKey(Date.now()),
            note: typeof item.note === 'string' ? item.note : undefined,
          }))
        }
      } catch (e) {
        console.error('加载打卡记录失败:', e)
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

  const savePunchRecords = () => {
    localStorage.setItem(PUNCH_RECORDS_KEY, JSON.stringify(punchRecords.value))
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
  watch(punchRecords, savePunchRecords, { deep: true })

  const updateHistory = (item: HistoryItem) => {
    const index = history.value.findIndex(
      (h) => h.title === item.title && h.category === item.category && h.period === item.period,
    )
    if (index > -1) {
      history.value.splice(index, 1)
    }
    history.value.unshift(item)
    if (history.value.length > 10) {
      history.value.pop()
    }
  }

  const removeHistoryItem = (item: HistoryItem) => {
    const index = history.value.findIndex(
      (h) => h.title === item.title && h.category === item.category && h.period === item.period,
    )
    if (index > -1) {
      history.value.splice(index, 1)
      return true
    }
    return false
  }

  const clearHistoryAll = () => {
    if (!history.value.length) return false
    history.value = []
    return true
  }

  const punchInTodo = (id: string, note?: string) => {
    const todo = todos.value.find((t) => t.id === id)
    if (!todo) return { kind: 'not_found' as const }
    if (todo.period === 'once') return { kind: 'once' as const }

    todo.punchIns = (todo.punchIns || 0) + 1
    const stat = ensureDayStat(todo.dayKey)
    stat.punchInsTotal += 1
    if (todo.unit === 'minutes') {
      stat.minutesTotal += getTodoMinutesPerPunch(todo)
    }

    // 记录分类统计
    incCategory(stat.categoryPunchIns, todo.category || '未分类', 1)

    // 记录打卡流水
    punchRecords.value.unshift({
      id: nanoid(),
      todoId: todo.id,
      todoTitle: todo.title,
      category: todo.category || '未分类',
      timestamp: Date.now(),
      dayKey: formatDayKey(Date.now()),
      note,
    })
    // 限制最大记录数，避免 localStorage 过大，比如最近 5000 条
    if (punchRecords.value.length > 5000) {
      punchRecords.value.pop()
    }

    if (!todo.done && todo.punchIns >= todo.minFrequency) {
      todo.done = true
      todo.completedAt = Date.now()
      ensureDayStat(todo.dayKey).completedCount += 1
      incCategory(ensureDayStat(todo.dayKey).categoryCompleted, todo.category || '未分类', 1)
      return { kind: 'auto_done' as const, punchIns: todo.punchIns }
    }

    return { kind: 'ok' as const, punchIns: todo.punchIns }
  }

  const updatePunchRecordNote = (id: string, note: string) => {
    const record = punchRecords.value.find((r) => r.id === id)
    if (record) {
      record.note = note
      return true
    }
    return false
  }

  const createTodo = (params: {
    title: string
    category: string
    period: TodoPeriod
    minFrequency: number
    unit: TodoUnit
    minutesPerTime?: number
    description?: string
    deadline?: number
  }) => {
    const text = params.title.trim()
    if (!text) return { kind: 'empty' as const }

    const existing = todos.value.find(
      (t) =>
        t.title === text && !t.done && t.category === params.category && t.period === params.period,
    )
    if (existing) {
      return {
        kind: 'exists' as const,
        action: existing.punchIns > 0 ? '再次打卡' : '开始打卡',
      }
    }

    const now = Date.now()
    const dk = formatDayKey(now)
    let templateId: string | undefined

    if (params.period !== 'once') {
      const existingTpl = templates.value.find(
        (tpl) =>
          tpl.title === text && tpl.period === params.period && tpl.category === params.category,
      )
      if (existingTpl) {
        templateId = existingTpl.id
      } else {
        templateId = nanoid()
        templates.value.push({
          id: templateId,
          title: text,
          category: params.category,
          period: params.period,
          minFrequency: params.minFrequency,
          unit: params.unit,
          minutesPerTime: params.unit === 'minutes' ? params.minutesPerTime : undefined,
          description: params.description,
          createdAt: now,
        })
      }
    }

    const todo: Todo = {
      title: text,
      id: nanoid(),
      done: false,
      punchIns: 0,
      category: params.category,
      period: params.period,
      minFrequency: params.minFrequency,
      unit: params.unit,
      minutesPerTime: params.unit === 'minutes' ? params.minutesPerTime : undefined,
      description: params.description,
      templateId,
      createdAt: now,
      dayKey: dk,
      deadline: params.deadline,
    }

    todos.value.push(todo)
    ensureDayStat(dk).createdCount += 1
    incCategory(ensureDayStat(dk).categoryCreated, params.category, 1)
    updateHistory({
      title: text,
      category: params.category,
      period: params.period,
      minFrequency: params.minFrequency,
      unit: params.unit,
      minutesPerTime: params.minutesPerTime,
      description: params.description,
    })

    return { kind: 'added' as const }
  }

  const addTodoFromHistory = (
    text: string,
    params: {
      category: string
      period: TodoPeriod
      minFrequency: number
      unit: TodoUnit
      minutesPerTime?: number
      description?: string
      deadline?: number
    },
  ) => {
    const existing = todos.value.find((t) => t.title === text)
    if (existing) {
      return { kind: 'exists' as const }
    }

    const now = Date.now()
    const dk = formatDayKey(now)
    let templateId: string | undefined

    if (params.period !== 'once') {
      const existingTpl = templates.value.find(
        (tpl) =>
          tpl.title === text && tpl.period === params.period && tpl.category === params.category,
      )
      if (existingTpl) {
        templateId = existingTpl.id
      } else {
        templateId = nanoid()
        templates.value.push({
          id: templateId,
          title: text,
          category: params.category,
          period: params.period,
          minFrequency: params.minFrequency,
          unit: params.unit,
          minutesPerTime: params.unit === 'minutes' ? params.minutesPerTime : undefined,
          description: params.description,
          createdAt: now,
        })
      }
    }

    todos.value.push({
      title: text,
      id: nanoid(),
      done: false,
      punchIns: 0,
      category: params.category,
      period: params.period,
      minFrequency: params.minFrequency,
      unit: params.unit,
      minutesPerTime: params.unit === 'minutes' ? params.minutesPerTime : undefined,
      description: params.description,
      templateId,
      createdAt: now,
      dayKey: dk,
      deadline: params.deadline,
    })
    ensureDayStat(dk).createdCount += 1
    incCategory(ensureDayStat(dk).categoryCreated, params.category, 1)
    updateHistory({
      title: text,
      category: params.category,
      period: params.period,
      minFrequency: params.minFrequency,
      unit: params.unit,
      minutesPerTime: params.minutesPerTime,
      description: params.description,
    })

    return { kind: 'added' as const }
  }

  const deleteTodoById = (id: string) => {
    const target = todos.value.find((t) => t.id === id)
    if (!target) return { kind: 'not_found' as const, removedIds: [] as string[] }

    const dk = target.dayKey
    const stat = ensureDayStat(dk)

    stat.createdCount = Math.max(0, stat.createdCount - 1)
    incCategory(stat.categoryCreated, target.category || '未分类', -1)
    const punch = target.punchIns || 0
    stat.punchInsTotal = Math.max(0, stat.punchInsTotal - punch)
    incCategory(stat.categoryPunchIns, target.category || '未分类', -punch)
    if (target.unit === 'minutes') {
      stat.minutesTotal = Math.max(0, stat.minutesTotal - punch * getTodoMinutesPerPunch(target))
    }
    if (target.done) {
      stat.completedCount = Math.max(0, stat.completedCount - 1)
      incCategory(stat.categoryCompleted, target.category || '未分类', -1)
    }

    todos.value = todos.value.filter((todo) => todo.id !== id)

    // 如果删除的任务有模板，检查是否还有其他任务使用该模板
    if (target.templateId) {
      const hasOtherTodosWithTemplate = todos.value.some((t) => t.templateId === target.templateId)
      // 如果没有其他任务使用该模板，删除模板
      if (!hasOtherTodosWithTemplate) {
        templates.value = templates.value.filter((t) => t.id !== target.templateId)
      }
    }

    return { kind: 'deleted' as const, removedIds: [id] }
  }

  const toggleTodoDone = (id: string, done: boolean) => {
    const todo = todos.value.find((t) => t.id === id)
    if (!todo) return false
    if (todo.done === done) return false

    todo.done = done
    if (done) {
      todo.completedAt = Date.now()
      ensureDayStat(todo.dayKey).completedCount += 1
      incCategory(ensureDayStat(todo.dayKey).categoryCompleted, todo.category || '未分类', 1)
      return true
    }

    todo.completedAt = undefined
    const stat = ensureDayStat(todo.dayKey)
    stat.completedCount = Math.max(0, stat.completedCount - 1)
    incCategory(stat.categoryCompleted, todo.category || '未分类', -1)
    return true
  }

  const applyTodoEdit = (
    id: string,
    patch: {
      title: string
      category: string
      period: TodoPeriod
      minFrequency: number
      unit: TodoUnit
      minutesPerTime: number
      description?: string
      deadline?: number
    },
  ) => {
    const todo = todos.value.find((t) => t.id === id)
    if (!todo) return false

    const dk = todo.dayKey
    const stat = ensureDayStat(dk)

    const oldCategory = todo.category || '未分类'
    const newCategory = patch.category || '未分类'

    const nextMinFrequency = patch.period === 'once' ? 1 : patch.minFrequency
    const nextMinutesPerTime = patch.unit === 'minutes' ? patch.minutesPerTime : undefined

    const oldMinutes =
      todo.unit === 'minutes' ? (todo.punchIns || 0) * getTodoMinutesPerPunch(todo) : 0
    const newMinutes =
      patch.unit === 'minutes' ? (todo.punchIns || 0) * (nextMinutesPerTime || 15) : 0

    const wasDone = !!todo.done
    const shouldDone = patch.period !== 'once' ? (todo.punchIns || 0) >= nextMinFrequency : wasDone

    if (oldCategory !== newCategory) {
      incCategory(stat.categoryCreated, oldCategory, -1)
      incCategory(stat.categoryCreated, newCategory, 1)
      incCategory(stat.categoryPunchIns, oldCategory, -(todo.punchIns || 0))
      incCategory(stat.categoryPunchIns, newCategory, todo.punchIns || 0)
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

    todo.title = patch.title
    todo.category = newCategory
    todo.period = patch.period
    todo.minFrequency = nextMinFrequency
    todo.unit = patch.unit
    todo.minutesPerTime = nextMinutesPerTime
    todo.description = patch.description
    todo.deadline = patch.deadline

    if (!wasDone && shouldDone) {
      todo.done = true
      todo.completedAt = Date.now()
    } else if (wasDone && !shouldDone) {
      todo.done = false
      todo.completedAt = undefined
    }

    if (patch.period !== 'once') {
      let tplId = todo.templateId
      if (!tplId) {
        const existingTpl = templates.value.find(
          (tpl) => tpl.title === patch.title && tpl.period === patch.period,
        )
        tplId = existingTpl ? existingTpl.id : nanoid()
        if (!existingTpl) {
          templates.value.push({
            id: tplId,
            title: patch.title,
            category: newCategory,
            period: patch.period,
            minFrequency: nextMinFrequency,
            unit: patch.unit,
            minutesPerTime: patch.unit === 'minutes' ? nextMinutesPerTime : undefined,
            createdAt: typeof todo.createdAt === 'number' ? todo.createdAt : Date.now(),
          })
        }
        todo.templateId = tplId
      } else {
        // 更新现有模板
        const tpl = templates.value.find((t) => t.id === tplId)
        if (tpl) {
          tpl.title = patch.title
          tpl.category = newCategory
          tpl.period = patch.period
          tpl.minFrequency = nextMinFrequency
          tpl.unit = patch.unit
          tpl.minutesPerTime = patch.unit === 'minutes' ? nextMinutesPerTime : undefined
        }
      }
    } else {
      // 如果改为一次性，删除模板关联
      if (todo.templateId) {
        const hasOtherTodos = todos.value.some(
          (t) => t.id !== id && t.templateId === todo.templateId,
        )
        if (!hasOtherTodos) {
          templates.value = templates.value.filter((t) => t.id !== todo.templateId)
        }
        todo.templateId = undefined
      }
    }

    return true
  }

  const getTodoById = (id: string) => {
    return todos.value.find((t) => t.id === id)
  }

  return {
    todos,
    templates,
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
    clearHistoryAll,
  }
}
