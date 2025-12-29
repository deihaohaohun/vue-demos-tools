import { computed, onMounted, ref, watch } from 'vue'
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

  const getTodoMinutesPerPunch = (todo: Todo) => {
    if (todo.unit !== 'minutes') return 0
    return typeof todo.minutesPerTime === 'number' ? todo.minutesPerTime : 15
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

  const getCycleStart = (tpl: TodoTemplate, today: Date) => {
    const anchor = dayjs(tpl.createdAt).startOf('day')
    const now = dayjs(today).startOf('day')

    if (tpl.period === 'daily') {
      return now
    } else if (tpl.period === 'weekly') {
      const diffDays = now.diff(anchor, 'day')
      const weeksElapsed = Math.floor(diffDays / 7)
      return anchor.add(weeksElapsed * 7, 'day')
    } else if (tpl.period === 'monthly') {
      const diffMonths = now.diff(anchor, 'month')
      return anchor.add(diffMonths, 'month')
    } else if (tpl.period === 'yearly') {
      const diffYears = now.diff(anchor, 'year')
      return anchor.add(diffYears, 'year')
    }
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
    // - once: 一次性任务，如果没完成，必须顺延，否则就丢了
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

      // 处理一次性任务
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
          categoryMinutes: {},
        }
      }
      grouped[dk].createdCount += 1
      incCategory(grouped[dk].categoryCreated, t.category || '未分类', 1)
      if (t.done) grouped[dk].completedCount += 1
      if (t.done) incCategory(grouped[dk].categoryCompleted, t.category || '未分类', 1)
    }

    for (const [dk, stat] of Object.entries(grouped)) {
      const target = ensureDayStat(dk)
      target.createdCount = Math.max(target.createdCount, stat.createdCount)
      target.completedCount = Math.max(target.completedCount, stat.completedCount)

      for (const [c, v] of Object.entries(stat.categoryCreated)) {
        target.categoryCreated[c] = Math.max(target.categoryCreated[c] || 0, v)
      }
      for (const [c, v] of Object.entries(stat.categoryCompleted)) {
        target.categoryCompleted[c] = Math.max(target.categoryCompleted[c] || 0, v)
      }
    }
  }

  const rebuildPunchStatsFromRecords = () => {
    const newStats: Record<
      string,
      {
        punchInsTotal: number
        minutesTotal: number
        categoryPunchIns: Record<string, number>
        categoryMinutes: Record<string, number>
      }
    > = {}

    for (const r of punchRecords.value) {
      if (!r.dayKey) continue
      if (!newStats[r.dayKey]) {
        newStats[r.dayKey] = {
          punchInsTotal: 0,
          minutesTotal: 0,
          categoryPunchIns: {},
          categoryMinutes: {},
        }
      }
      const s = newStats[r.dayKey]
      if (s) {
        s.punchInsTotal += 1
        incCategory(s.categoryPunchIns, r.category || '未分类', 1)

        let mins = 0
        if (r.unit === 'minutes') {
          mins = typeof r.minutesPerTime === 'number' ? r.minutesPerTime : 15
        } else {
          const tpl = templates.value.find(
            (t) => t.title === r.todoTitle && (t.category || '未分类') === (r.category || '未分类'),
          )
          if (tpl && tpl.unit === 'minutes') {
            mins = typeof tpl.minutesPerTime === 'number' ? tpl.minutesPerTime : 15
          }
        }

        if (mins > 0) {
          s.minutesTotal += mins
          incCategory(s.categoryMinutes, r.category || '未分类', mins)
        }
      }
    }

    // 更新 dayStats，保留 createdCount 等其他统计
    for (const [dk, s] of Object.entries(newStats)) {
      const target = ensureDayStat(dk)
      target.punchInsTotal = s.punchInsTotal
      target.minutesTotal = s.minutesTotal
      target.categoryPunchIns = { ...s.categoryPunchIns }
      target.categoryMinutes = { ...s.categoryMinutes }
    }

    // 对于没有打卡记录的日期，也要清空打卡统计（以防是删除记录后的重建）
    for (const [dk, target] of Object.entries(dayStats.value)) {
      if (!newStats[dk]) {
        target.punchInsTotal = 0
        target.minutesTotal = 0
        target.categoryPunchIns = {}
        target.categoryMinutes = {}
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
            let createdAt = typeof t.createdAt === 'number' ? t.createdAt : undefined
            if (!createdAt && typeof t.dayKey === 'string') {
              // 尝试从 dayKey 恢复创建时间
              const d = dayjs(t.dayKey)
              if (d.isValid()) {
                createdAt = d.valueOf()
              }
            }
            if (!createdAt) createdAt = Date.now()

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
            categoryMinutes: (obj.categoryMinutes as Record<string, number>) || {},
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
            unit: item.unit === 'minutes' || item.unit === 'times' ? item.unit : undefined,
            minutesPerTime:
              typeof item.minutesPerTime === 'number' ? item.minutesPerTime : undefined,
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

    syncTemplatesFromTodos()
    materializeTodayTodosFromTemplates()
    rebuildStatsFromTodos()
    rebuildPunchStatsFromRecords()
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

    const punchDayKey = formatDayKey(Date.now())

    todo.punchIns = (todo.punchIns || 0) + 1
    const stat = ensureDayStat(punchDayKey)
    stat.punchInsTotal += 1
    if (todo.unit === 'minutes') {
      const mins = getTodoMinutesPerPunch(todo)
      stat.minutesTotal += mins
      incCategory(stat.categoryMinutes, todo.category || '未分类', mins)
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
      dayKey: punchDayKey,
      unit: todo.unit,
      minutesPerTime: todo.unit === 'minutes' ? getTodoMinutesPerPunch(todo) : undefined,
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

    // 仅从当前任务列表中移除，不修改历史统计数据和打卡记录
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
    incCategory(stat.categoryMinutes, oldCategory, -oldMinutes)
    incCategory(stat.categoryMinutes, newCategory, newMinutes)

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
    consecutivePunchDays,
    maxConsecutivePunchDays,
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
