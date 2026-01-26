import { computed, ref } from 'vue'
import { nanoid } from 'nanoid'
import dayjs from 'dayjs'

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
  archived?: boolean
  archivedAt?: number
}

interface DayStat {
  createdCount: number
  completedCount: number
  punchInsTotal: number
  minutesTotal: number
  categoryCreated: Record<string, number>
  categoryCompleted: Record<string, number>
  categoryPunchIns: Record<string, number>
  categoryMinutes: Record<string, number>
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

interface ArchivedHistoryItem extends HistoryItem {
  archivedAt: number
}

interface AbandonedGoal {
  id: string
  title: string
  category: string
  createdAt: number
  deadline?: number
  description?: string
  abandonedAt: number
}

interface PunchRecord {
  id: string
  todoId: string
  todoTitle: string
  category: string
  timestamp: number
  dayKey: string
  unit?: TodoUnit
  minutesPerTime?: number
  note?: string
}

interface GoalHistoryRecord {
  id: string
  goalId: string
  content: string
  type: 'regular' | 'milestone'
  timestamp: number
  note?: string
}

interface UiConfig {
  categories: string[]
  categoryColors: Record<string, string>
  categoryIcons: Record<string, string>
  showTime: boolean
  showDate: boolean
  backgroundImage?: string
  minFrequencies: number[]
  minutesPerTimes: number[]
}

export type {
  Todo,
  TodoTemplate,
  DayStat,
  TodoPeriod,
  TodoUnit,
  HistoryItem,
  ArchivedHistoryItem,
  AbandonedGoal,
  PunchRecord,
  GoalHistoryRecord,
  UiConfig,
}

export const useTodoStore = () => {
  const todos = ref<Todo[]>([])
  const templates = ref<TodoTemplate[]>([])
  const dayStats = ref<Record<string, DayStat>>({})
  const history = ref<HistoryItem[]>([])
  const archivedHistory = ref<ArchivedHistoryItem[]>([])
  const abandonedGoals = ref<AbandonedGoal[]>([])
  const punchRecords = ref<PunchRecord[]>([])
  const goalHistoryRecords = ref<GoalHistoryRecord[]>([])

  const uiConfig = ref<UiConfig>({
    categories: ['默认', '工作', '学习', '健康', '生活'],
    categoryColors: {},
    categoryIcons: {},
    showTime: true,
    showDate: true,
    minFrequencies: [1, 2, 3, 4],
    minutesPerTimes: [12, 15, 18, 20],
  })

  const formatDayKey = (ts: number) => {
    const d = dayjs(ts)
    return d.format('YYYY-MM-DD')
  }

  const todayKey = computed(() => formatDayKey(Date.now()))

  const consecutivePunchDays = computed(() => {
    let days = 0
    let currentKey = todayKey.value

    // 如果今天已经打卡，从今天开始算
    // 如果今天还没打卡，从昨天开始算
    const todayStat = dayStats.value[currentKey]
    if (!todayStat || todayStat.punchInsTotal === 0) {
      // check yesterday
      const parts = currentKey.split('-').map(Number)
      if (parts.length === 3) {
        const [y, m, d] = parts as [number, number, number]
        const date = new Date(y, m - 1, d)
        date.setDate(date.getDate() - 1)
        currentKey = formatDayKey(date.getTime())
      }
    }

    // 防止无限循环，限制最大回溯天数，比如3650天
    let safeGuard = 0
    while (safeGuard < 3650) {
      const stat = dayStats.value[currentKey]
      if (stat && stat.punchInsTotal > 0) {
        days++
        const parts = currentKey.split('-').map(Number)
        if (parts.length !== 3) break
        const [y, m, d] = parts as [number, number, number]
        const date = new Date(y, m - 1, d)
        date.setDate(date.getDate() - 1)
        currentKey = formatDayKey(date.getTime())
      } else {
        break
      }
      safeGuard++
    }
    return days
  })

  const maxConsecutivePunchDays = computed(() => {
    const keys = Object.keys(dayStats.value).sort()
    if (keys.length === 0) return 0

    let maxStreak = 0
    let currentStreak = 0
    let prevDate: Date | null = null

    for (const key of keys) {
      const stat = dayStats.value[key]
      if (!stat || stat.punchInsTotal === 0) {
        currentStreak = 0
        prevDate = null
        continue
      }

      const parts = key.split('-').map(Number)
      if (parts.length !== 3) continue
      const [y, m, d] = parts as [number, number, number]
      const currentDate = new Date(y, m - 1, d)

      if (prevDate) {
        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (diffDays === 1) {
          currentStreak++
        } else {
          currentStreak = 1
        }
      } else {
        currentStreak = 1
      }

      prevDate = currentDate
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
      }
    }

    return maxStreak
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
        categoryPunchIns: {},
        categoryMinutes: {},
      }
    }
    return dayStats.value[dayKey]
  }

  const incCategory = (record: Record<string, number>, key: string, delta: number) => {
    const k = key || '未分类'
    record[k] = (record[k] || 0) + delta
    if (record[k] <= 0) delete record[k]
  }

  const getCycleStart = (tpl: TodoTemplate, today: Date) => {
    const now = dayjs(today).startOf('day')

    if (tpl.period === 'daily') return now
    if (tpl.period === 'weekly') {
      const jsDay = now.day()
      const diff = jsDay === 0 ? 6 : jsDay - 1
      return now.subtract(diff, 'day')
    }
    if (tpl.period === 'monthly') return now.startOf('month')
    if (tpl.period === 'yearly') return now.startOf('year')
    return now
  }

  const getCycleEndExclusive = (tpl: TodoTemplate, start: dayjs.Dayjs) => {
    if (tpl.period === 'daily') return start.add(1, 'day')
    if (tpl.period === 'weekly') return start.add(1, 'week')
    if (tpl.period === 'monthly') return start.add(1, 'month')
    if (tpl.period === 'yearly') return start.add(1, 'year')
    return start.add(1, 'day')
  }

  const pruneTodosOutsideCurrentCycle = (tk: string, todayDate: Date) => {
    const keep: Todo[] = []
    const pickedByTemplateId = new Map<string, Todo>()

    const pickBetter = (a: Todo, b: Todo) => {
      const ap = a.punchIns || 0
      const bp = b.punchIns || 0
      if (ap !== bp) return ap > bp ? a : b
      if (!!a.done !== !!b.done) return a.done ? a : b
      const ac = typeof a.createdAt === 'number' ? a.createdAt : 0
      const bc = typeof b.createdAt === 'number' ? b.createdAt : 0
      return ac >= bc ? a : b
    }

    for (const t of todos.value) {
      if (t.period === 'once') {
        keep.push(t)
        continue
      }

      if (!t.templateId) {
        if (t.dayKey === tk) keep.push(t)
        continue
      }

      const tpl = templates.value.find((tp) => tp.id === t.templateId)
      if (!tpl) {
        if (t.dayKey === tk) keep.push(t)
        continue
      }

      const cycleStart = getCycleStart(tpl, todayDate)
      const cycleEndExclusive = getCycleEndExclusive(tpl, cycleStart)
      const createdAt = dayjs(t.createdAt)
      const inCurrentCycle =
        (createdAt.isAfter(cycleStart) || createdAt.isSame(cycleStart)) &&
        createdAt.isBefore(cycleEndExclusive)
      if (!inCurrentCycle) {
        continue
      }

      const existing = pickedByTemplateId.get(t.templateId)
      pickedByTemplateId.set(t.templateId, existing ? pickBetter(existing, t) : t)
    }

    todos.value = [...keep, ...pickedByTemplateId.values()]
  }

  const materializeTodayTodosFromTemplates = () => {
    const tk = todayKey.value
    const todayDate = new Date()

    pruneTodosOutsideCurrentCycle(tk, todayDate)

    // 1. 保留今天已有的任务
    const todayItems = todos.value.filter((t) => t.dayKey === tk)

    // 2. 查找之前未完成的任务，并"滚动"到今天 (Rollover)
    // 策略：
    // - once: 目标任务，如果没完成，必须顺延，否则就丢了
    // - weekly/monthly/yearly: 周期性任务，只要还在当前周期内，就应该滚动到今天，以便继续打卡（即使已达到最低频率）
    // - daily: 每日任务，通常是"今日事今日毕"，如果没做完，第二天应该重置(从模板生成新的)，而不是堆积
    const overdueItems = todos.value.filter((t) => {
      if (t.dayKey === tk) return false // 已经是今天的，上面 todayItems 处理了

      // 处理周期性任务 (非每日)
      if (t.period !== 'once' && t.period !== 'daily' && t.templateId) {
        const tpl = templates.value.find((tp) => tp.id === t.templateId)
        if (tpl) {
          const cycleStart = getCycleStart(tpl, todayDate)
          const cycleEndExclusive = getCycleEndExclusive(tpl, cycleStart)
          const createdAt = dayjs(t.createdAt)
          const inCurrentCycle =
            (createdAt.isAfter(cycleStart) || createdAt.isSame(cycleStart)) &&
            createdAt.isBefore(cycleEndExclusive)

          if (inCurrentCycle) return true // 还在周期内，滚动到今天
        }
      }

      // 处理目标任务
      if (t.period === 'once' && !t.done) return true

      return false
    })

    // 将滚动任务的 dayKey 更新为今天，以便在今日列表中显示
    overdueItems.forEach((t) => {
      t.dayKey = tk
    })

    // 合并作为基础实例列表
    const instances: Todo[] = [...todayItems, ...overdueItems]

    // 3. 检查模板，是否需要生成"本周期"的新任务
    // 关键点：即使今天不是"创建日"，只要本周期内没有生成过任务，就应该显示
    // 为了避免重复查询，我们建立一个"本周期已覆盖"的 Set
    const coveredTemplateIds = new Set<string>()

    // 检查所有的 currentTodos (包括被过滤掉的已完成任务)
    todos.value.forEach((t) => {
      if (!t.templateId) return
      const tpl = templates.value.find((tp) => tp.id === t.templateId)
      if (!tpl) return

      const cycleStart = getCycleStart(tpl, todayDate)
      const cycleEndExclusive = getCycleEndExclusive(tpl, cycleStart)
      const createdAt = dayjs(t.createdAt)

      // 如果这个任务的创建时间在"本周期开始时间"之后（或相同），说明它是本周期的任务
      if (
        (createdAt.isAfter(cycleStart) || createdAt.isSame(cycleStart)) &&
        createdAt.isBefore(cycleEndExclusive)
      ) {
        coveredTemplateIds.add(t.templateId)
      }
    })

    for (const tpl of templates.value) {
      if (tpl.archived) continue
      // 如果本周期已经有任务了（无论完成与否，或者是rolled over过来的），就不再生成
      if (coveredTemplateIds.has(tpl.id)) continue

      // 生成新任务
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

  // ============================================
  // Watch triggers (DISABLED - no longer auto-saving to localStorage)
  // All data persistence now happens through Supabase in D3TodoList.vue
  // ============================================

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

  const getTodoMinutesPerPunch = (todo: Todo) => {
    if (todo.unit !== 'minutes') return 0
    return typeof todo.minutesPerTime === 'number' ? todo.minutesPerTime : 15
  }

  const preparePunch = (id: string, note?: string, minutes?: number) => {
    const todo = todos.value.find((t) => t.id === id)
    if (!todo) return { kind: 'not_found' as const }

    // 防止打卡过于频繁（例如1分钟内）
    const lastRecord = punchRecords.value[0]
    if (
      lastRecord &&
      lastRecord.todoId === id &&
      Date.now() - lastRecord.timestamp < 60 * 1000 &&
      !lastRecord.note // 允许快速补充备注，但不允许重复空打卡
    ) {
      if (note && !lastRecord.note) {
        // 其实是补充备注，交给 updatePunchRecordNote 处理
        return { kind: 'update_note' as const, recordId: lastRecord.id }
      }
      return { kind: 'too_frequent' as const }
    }

    const now = Date.now()
    const punchDayKey = formatDayKey(now)

    const record: PunchRecord = {
      id: '', // Placeholder, will be set by server
      todoId: todo.id,
      todoTitle: todo.title,
      category: todo.category || '未分类',
      timestamp: now,
      dayKey: punchDayKey,
      unit: todo.unit,
      minutesPerTime:
        todo.unit === 'minutes'
          ? typeof minutes === 'number'
            ? minutes
            : typeof todo.minutesPerTime === 'number'
              ? todo.minutesPerTime
              : 15
          : undefined,
      note,
    }

    return { kind: 'ok' as const, record, todo }
  }

  const addPunchRecordDirectly = (
    record: PunchRecord,
    options?: { skipAutoCompletion?: boolean },
  ) => {
    const todo = todos.value.find((t) => t.id === record.todoId)
    // Add to local list
    punchRecords.value.unshift(record)

    // Update Todo stats
    if (todo) {
      todo.punchIns += 1
      if (todo.punchIns === todo.minFrequency && !todo.done && !options?.skipAutoCompletion) {
        // Auto-complete if reached frequency (unless skipped)
        toggleTodoDone(todo.id, true)
      }
    }

    // Update Day Stats
    const stat = ensureDayStat(record.dayKey)
    stat.punchInsTotal += 1
    incCategory(stat.categoryPunchIns, record.category || '未分类', 1)

    if (record.unit === 'minutes' && typeof record.minutesPerTime === 'number') {
      const mins = record.minutesPerTime
      stat.minutesTotal += mins
      incCategory(stat.categoryMinutes, record.category || '未分类', mins)
    }

    // 限制最大记录数，避免 localStorage 过大，比如最近 5000 条
    if (punchRecords.value.length > 5000) {
      punchRecords.value.pop()
    }
  }

  const updatePunchRecordNote = (id: string, note: string) => {
    const record = punchRecords.value.find((r) => r.id === id)
    if (record) {
      record.note = note
      return true
    }
    return false
  }

  const updatePunchRecordMinutes = (id: string, minutes: number) => {
    const record = punchRecords.value.find((r) => r.id === id)
    if (!record) return false

    const dk = record.dayKey
    const stat = ensureDayStat(dk)
    const categoryKey = record.category || '未分类'

    const oldMinutes = typeof record.minutesPerTime === 'number' ? record.minutesPerTime : 0
    const nextMinutes = Math.max(0, Math.round(minutes))

    const delta = nextMinutes - oldMinutes
    if (delta !== 0) {
      stat.minutesTotal = Math.max(0, (stat.minutesTotal || 0) + delta)
      incCategory(stat.categoryMinutes, categoryKey, delta)
    }

    record.minutesPerTime = nextMinutes
    record.unit = 'minutes'

    return true
  }

  // Goal History Management Functions
  // Goal History Management Functions
  const prepareGoalHistoryRecord = (
    goalId: string,
    content: string,
    type: 'regular' | 'milestone',
    note?: string,
  ) => {
    const goal = todos.value.find((t) => t.id === goalId && t.period === 'once')
    if (!goal) return { kind: 'not_found' as const }

    const trimmedContent = content.trim()
    if (!trimmedContent) return { kind: 'empty_content' as const }

    const record = {
      // id will be assigned by server
      id: '',
      goalId,
      content: trimmedContent,
      type,
      timestamp: Date.now(),
      note: note?.trim() || undefined,
    }

    return { kind: 'ok' as const, record }
  }

  const addGoalHistoryRecordDirectly = (record: GoalHistoryRecord) => {
    goalHistoryRecords.value.unshift(record)
  }

  const updateGoalHistoryRecord = (id: string, content: string, note?: string) => {
    const record = goalHistoryRecords.value.find((r) => r.id === id)
    if (!record) return false

    const trimmedContent = content.trim()
    if (!trimmedContent) return false

    record.content = trimmedContent
    record.note = note?.trim() || undefined
    return true
  }

  const deleteGoalHistoryRecord = (id: string) => {
    const index = goalHistoryRecords.value.findIndex((r) => r.id === id)
    if (index === -1) return false
    goalHistoryRecords.value.splice(index, 1)
    return true
  }

  const getGoalHistoryRecords = (goalId: string) => {
    return goalHistoryRecords.value.filter((r) => r.goalId === goalId)
  }

  const prepareTodo = (params: {
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
    let dk = formatDayKey(now)

    // 对于周期性任务，根据周期类型计算正确的dayKey
    if (params.period !== 'once') {
      const today = new Date(now)
      if (params.period === 'weekly') {
        const dayOfWeek = today.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - diff)
        dk = formatDayKey(weekStart.getTime())
      } else if (params.period === 'monthly') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        dk = formatDayKey(monthStart.getTime())
      } else if (params.period === 'yearly') {
        const yearStart = new Date(today.getFullYear(), 0, 1)
        dk = formatDayKey(yearStart.getTime())
      }
    }

    // Template logic: try to find existing template
    let templateId: string | undefined = undefined
    let newTemplate: TodoTemplate | undefined = undefined

    if (params.period !== 'once') {
      const existingTemplate = templates.value.find(
        (t) =>
          !t.archived &&
          t.title === text &&
          t.period === params.period &&
          t.category === params.category,
      )
      if (existingTemplate) {
        templateId = existingTemplate.id
      } else {
        // Need to create new template
        // We will prepare the object but strict ID generation (if using server)
        // implies we might want to wait. However, for D3TodoList flow,
        // we can return the template object.
        // Note: For 'Server-First', D3TodoList should save this template
        // to Supabase *before* saving the Todo.
        newTemplate = {
          id: '', // Placeholder
          title: text,
          category: params.category,
          period: params.period,
          minFrequency: params.minFrequency,
          unit: params.unit,
          minutesPerTime: params.minutesPerTime,
          description: params.description,
          createdAt: now,
          archived: false,
        }
      }
    }

    const todo: Todo = {
      title: text,
      id: '', // Placeholder
      done: false,
      punchIns: 0,
      category: params.category,
      period: params.period,
      minFrequency: params.minFrequency,
      unit: params.unit,
      minutesPerTime: params.minutesPerTime,
      description: params.description,
      createdAt: now,
      dayKey: dk,
      templateId, // Might be undefined if newTemplate is present
      deadline: params.deadline,
    }

    if (todo.unit === 'minutes' && typeof todo.minutesPerTime !== 'number') {
      todo.minutesPerTime = 15
    }

    return {
      kind: 'prepared' as const,
      todo,
      newTemplate,
    }
  }

  const addTodoDirectly = (todo: Todo) => {
    todos.value.push(todo)

    // Update History
    updateHistory({
      title: todo.title,
      category: todo.category,
      period: todo.period,
      minFrequency: todo.minFrequency,
      unit: todo.unit,
      minutesPerTime: todo.minutesPerTime,
      description: todo.description,
    })

    // Update Day Stats
    const stat = ensureDayStat(todo.dayKey)
    stat.createdCount += 1
    incCategory(stat.categoryCreated, todo.category || '未分类', 1)
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
    if (params.period === 'once') {
      const existingUnfinished = todos.value.find((t) => t.title === text && !t.done)
      if (existingUnfinished) {
        return { kind: 'exists_unfinished' as const }
      }
    } else {
      const existing = todos.value.find((t) => t.title === text)
      if (existing) {
        return { kind: 'exists' as const }
      }
    }

    const now = Date.now()
    let dk = formatDayKey(now)
    if (params.period !== 'once') {
      const today = new Date(now)
      if (params.period === 'weekly') {
        const dayOfWeek = today.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - diff)
        dk = formatDayKey(weekStart.getTime())
      } else if (params.period === 'monthly') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        dk = formatDayKey(monthStart.getTime())
      } else if (params.period === 'yearly') {
        const yearStart = new Date(today.getFullYear(), 0, 1)
        dk = formatDayKey(yearStart.getTime())
      }
    }
    let templateId: string | undefined

    if (params.period !== 'once') {
      const existingTpl = templates.value.find(
        (tpl) =>
          !tpl.archived &&
          tpl.title === text &&
          tpl.period === params.period &&
          tpl.category === params.category,
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

  const archiveTodoById = (id: string) => {
    const target = todos.value.find((t) => t.id === id)
    if (!target) return { kind: 'not_found' as const, removedIds: [] as string[] }

    todos.value = todos.value.filter((todo) => todo.id !== id)

    if (target.templateId) {
      const tpl = templates.value.find((t) => t.id === target.templateId)
      const now = Date.now()
      if (tpl) {
        tpl.archived = true
        tpl.archivedAt = now
      }

      const normalizeCategory = (c: string | undefined) => (c || '未分类').trim() || '未分类'
      const title = (tpl?.title || target.title).trim()
      const category = normalizeCategory(tpl?.category || target.category)
      const period = (tpl?.period || target.period) as TodoPeriod

      const idx = history.value.findIndex(
        (h) =>
          h.title.trim() === title &&
          normalizeCategory(h.category) === category &&
          h.period === period,
      )

      if (idx > -1) {
        const removed = history.value.splice(idx, 1)
        const item = removed[0]
        if (item) {
          archivedHistory.value.unshift({
            ...item,
            archivedAt: now,
          })
        }
      } else {
        archivedHistory.value.unshift({
          title,
          category: tpl?.category || target.category,
          period,
          minFrequency:
            typeof tpl?.minFrequency === 'number'
              ? tpl.minFrequency
              : typeof target.minFrequency === 'number'
                ? target.minFrequency
                : 1,
          unit: (tpl?.unit || target.unit) as TodoUnit,
          minutesPerTime:
            (tpl?.unit || target.unit) === 'minutes'
              ? typeof tpl?.minutesPerTime === 'number'
                ? tpl.minutesPerTime
                : typeof target.minutesPerTime === 'number'
                  ? target.minutesPerTime
                  : 15
              : undefined,
          description: typeof tpl?.description === 'string' ? tpl.description : target.description,
          archivedAt: now,
        })
      }
    }

    return { kind: 'archived' as const, removedIds: [id] }
  }

  const giveUpGoalById = (id: string) => {
    const target = todos.value.find((t) => t.id === id)
    if (!target) return { kind: 'not_found' as const, removedIds: [] as string[] }
    if (target.period !== 'once') return { kind: 'not_goal' as const, removedIds: [] as string[] }

    todos.value = todos.value.filter((todo) => todo.id !== id)

    const now = Date.now()
    abandonedGoals.value.unshift({
      id: nanoid(),
      title: target.title,
      category: target.category,
      createdAt: typeof target.createdAt === 'number' ? target.createdAt : now,
      deadline: typeof target.deadline === 'number' ? target.deadline : undefined,
      description: target.description,
      abandonedAt: now,
    })

    return { kind: 'abandoned' as const, removedIds: [id] }
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

    const oldTitle = todo.title
    const oldCategory = todo.category || '未分类'
    const oldPeriod = todo.period

    const dk = todo.dayKey
    const stat = ensureDayStat(dk)

    const nextCategory = patch.category || '未分类'
    const nextMinFrequency = patch.period === 'once' ? 1 : patch.minFrequency
    const nextMinutesPerTime = patch.unit === 'minutes' ? patch.minutesPerTime : undefined

    const oldMinutes =
      todo.unit === 'minutes' ? (todo.punchIns || 0) * getTodoMinutesPerPunch(todo) : 0
    const newMinutes =
      patch.unit === 'minutes' ? (todo.punchIns || 0) * (nextMinutesPerTime || 15) : 0

    const wasDone = !!todo.done
    const shouldDone = patch.period !== 'once' ? (todo.punchIns || 0) >= nextMinFrequency : wasDone

    if (oldCategory !== nextCategory) {
      incCategory(stat.categoryCreated, oldCategory, -1)
      incCategory(stat.categoryCreated, nextCategory, 1)
      incCategory(stat.categoryPunchIns, oldCategory, -(todo.punchIns || 0))
      incCategory(stat.categoryPunchIns, nextCategory, todo.punchIns || 0)
    }

    if (wasDone) {
      stat.completedCount = Math.max(0, stat.completedCount - 1)
      incCategory(stat.categoryCompleted, oldCategory, -1)
    }
    if (shouldDone) {
      stat.completedCount += 1
      incCategory(stat.categoryCompleted, nextCategory, 1)
    }

    stat.minutesTotal = Math.max(0, stat.minutesTotal - oldMinutes + newMinutes)
    incCategory(stat.categoryMinutes, oldCategory, -oldMinutes)
    incCategory(stat.categoryMinutes, nextCategory, newMinutes)

    todo.title = patch.title
    todo.category = nextCategory
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
          (tpl) => !tpl.archived && tpl.title === patch.title && tpl.period === patch.period,
        )
        tplId = existingTpl ? existingTpl.id : nanoid()
        if (!existingTpl) {
          templates.value.push({
            id: tplId,
            title: patch.title,
            category: nextCategory,
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
          tpl.category = nextCategory
          tpl.period = patch.period
          tpl.minFrequency = nextMinFrequency
          tpl.unit = patch.unit
          tpl.minutesPerTime = patch.unit === 'minutes' ? nextMinutesPerTime : undefined
        }
      }
    } else {
      // 如果改为目标，删除模板关联
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

    // 更新历史记录：如果配置发生了变化，尝试在历史记录中找到旧的并更新它，或者添加新的
    const hasChanged =
      oldTitle !== patch.title || oldCategory !== nextCategory || oldPeriod !== patch.period

    if (hasChanged) {
      // 检查旧配置是否还在使用
      const isOldConfigStillUsed =
        todos.value.some(
          (t) =>
            t.id !== id &&
            t.title === oldTitle &&
            (t.category || '未分类') === oldCategory &&
            t.period === oldPeriod,
        ) ||
        templates.value.some(
          (tpl) =>
            tpl.title === oldTitle &&
            (tpl.category || '未分类') === oldCategory &&
            tpl.period === oldPeriod,
        )

      if (!isOldConfigStillUsed) {
        // 如果旧配置不再使用，从历史记录中移除它
        const oldHistoryIndex = history.value.findIndex(
          (h) => h.title === oldTitle && h.category === oldCategory && h.period === oldPeriod,
        )
        if (oldHistoryIndex > -1) {
          history.value.splice(oldHistoryIndex, 1)
        }
      }

      // 添加/更新新配置到历史记录
      updateHistory({
        title: patch.title,
        category: nextCategory,
        period: patch.period,
        minFrequency: nextMinFrequency,
        unit: patch.unit,
        minutesPerTime: nextMinutesPerTime,
        description: patch.description,
      })
    }

    return true
  }

  const ensureTemplateFromHistory = (item: HistoryItem) => {
    const title = item.title.trim()
    const category = (item.category || '未分类').trim() || '未分类'
    const period = item.period

    const existing = templates.value.find(
      (tpl) =>
        !tpl.archived && tpl.title === title && tpl.category === category && tpl.period === period,
    )
    if (existing) return existing

    const now = Date.now()
    const unitValue = item.unit || 'times'
    const tpl = {
      id: nanoid(),
      title,
      category,
      period,
      minFrequency: typeof item.minFrequency === 'number' ? item.minFrequency : 1,
      unit: unitValue,
      minutesPerTime:
        unitValue === 'minutes'
          ? typeof item.minutesPerTime === 'number'
            ? item.minutesPerTime
            : 15
          : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
      createdAt: now,
      archived: false,
    } satisfies TodoTemplate

    templates.value.push(tpl)
    updateHistory({
      title: tpl.title,
      category: tpl.category,
      period: tpl.period,
      minFrequency: tpl.minFrequency,
      unit: tpl.unit,
      minutesPerTime: tpl.minutesPerTime,
      description: tpl.description,
    })

    return tpl
  }

  const applyTemplateEdit = (
    id: string,
    patch: {
      title: string
      category: string
      period: TodoPeriod
      minFrequency: number
      unit: TodoUnit
      minutesPerTime: number
      description?: string
    },
  ) => {
    const tpl = templates.value.find((t) => t.id === id)
    if (!tpl) return false

    const oldTitle = tpl.title
    const oldCategory = tpl.category || '未分类'
    const oldPeriod = tpl.period

    const nextTitle = patch.title.trim()
    const nextCategory = (patch.category || '未分类').trim() || '未分类'
    const nextMinFrequency = patch.period === 'once' ? 1 : patch.minFrequency
    const nextMinutesPerTime = patch.unit === 'minutes' ? patch.minutesPerTime : undefined

    tpl.title = nextTitle
    tpl.category = nextCategory
    tpl.period = patch.period
    tpl.minFrequency = nextMinFrequency
    tpl.unit = patch.unit
    tpl.minutesPerTime = nextMinutesPerTime
    tpl.description = patch.description

    for (const todo of todos.value) {
      if (todo.templateId !== id) continue
      if ((todo.punchIns || 0) > 0) continue
      if (todo.done) continue

      const oldTodoCategory = todo.category || '未分类'
      if (oldTodoCategory !== nextCategory) {
        const stat = ensureDayStat(todo.dayKey)
        incCategory(stat.categoryCreated, oldTodoCategory, -1)
        incCategory(stat.categoryCreated, nextCategory, 1)
      }

      todo.title = nextTitle
      todo.category = nextCategory
      todo.period = patch.period
      todo.minFrequency = nextMinFrequency
      todo.unit = patch.unit
      todo.minutesPerTime = nextMinutesPerTime
      todo.description = patch.description
    }

    const hasChanged =
      oldTitle !== nextTitle || oldCategory !== nextCategory || oldPeriod !== patch.period
    if (hasChanged) {
      const isOldConfigStillUsed = templates.value.some(
        (t) =>
          t.id !== id &&
          t.title === oldTitle &&
          (t.category || '未分类') === oldCategory &&
          t.period === oldPeriod &&
          !t.archived,
      )

      if (!isOldConfigStillUsed) {
        const oldHistoryIndex = history.value.findIndex(
          (h) => h.title === oldTitle && h.category === oldCategory && h.period === oldPeriod,
        )
        if (oldHistoryIndex > -1) history.value.splice(oldHistoryIndex, 1)
      }

      updateHistory({
        title: nextTitle,
        category: nextCategory,
        period: patch.period,
        minFrequency: nextMinFrequency,
        unit: patch.unit,
        minutesPerTime: nextMinutesPerTime,
        description: patch.description,
      })
    } else {
      const idx = history.value.findIndex(
        (h) => h.title === nextTitle && h.category === nextCategory && h.period === patch.period,
      )
      if (idx > -1) {
        const current = history.value[idx]
        if (current) {
          current.minFrequency = nextMinFrequency
          current.unit = patch.unit
          current.minutesPerTime = nextMinutesPerTime
          current.description = patch.description
        }
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
    archivedHistory,
    abandonedGoals,
    punchRecords,
    todayKey,
    consecutivePunchDays,
    maxConsecutivePunchDays,
    formatDayKey,
    getTodoMinutesPerPunch,

    getTodoById,
    preparePunch,
    addPunchRecordDirectly,
    updatePunchRecordNote,
    updatePunchRecordMinutes,
    prepareTodo,
    addTodoDirectly,
    addTodoFromHistory,
    archiveTodoById,
    giveUpGoalById,
    toggleTodoDone,
    applyTodoEdit,
    ensureTemplateFromHistory,
    applyTemplateEdit,
    removeHistoryItem,
    clearHistoryAll,
    materializeTodayTodosFromTemplates,

    // Goal History
    goalHistoryRecords,
    prepareGoalHistoryRecord,
    addGoalHistoryRecordDirectly,
    updateGoalHistoryRecord,
    deleteGoalHistoryRecord,
    getGoalHistoryRecords,

    // Config
    uiConfig,
    frequencyOptions: computed(() => uiConfig.value.minFrequencies || [1, 2, 3, 4]),
    minutesPerTimeOptions: computed(() => uiConfig.value.minutesPerTimes || [12, 15, 18, 20]),
  }
}
