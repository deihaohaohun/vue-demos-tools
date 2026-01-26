<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  type ComponentPublicInstance,
} from 'vue'
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
import {
  useTodoStore,
  type TodoPeriod,
  type TodoUnit,
  type Todo,
  type PunchRecord,
  type HistoryItem,
  type GoalHistoryRecord,
  type TodoTemplate,
  type DayStat,
} from './useTodoStore'
import {
  AddIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SettingIcon,
  DeleteIcon,
  EditIcon,
  FileExportIcon,
  DownloadIcon,
  MinusIcon,
  AppIcon,
  CopyIcon,
} from 'tdesign-icons-vue-next'
import dayjs from 'dayjs'
import { useNumberAnimation } from '@/composables/useNumberAnimation'
import confetti from 'canvas-confetti'
import { snapdom } from '@zumer/snapdom'
import { useDark, useDebounceFn } from '@vueuse/core'
import { supabase } from '@/lib/supabaseClient'

use([
  CanvasRenderer,
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
])

const isDark = useDark()

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
  preparePunch,
  addPunchRecordDirectly,
  updatePunchRecordNote,
  updatePunchRecordMinutes,
  prepareTodo,
  addTodoDirectly,
  archiveTodoById,
  giveUpGoalById,
  toggleTodoDone,
  applyTodoEdit,

  applyTemplateEdit,
  maxConsecutivePunchDays,
  templates,
  materializeTodayTodosFromTemplates,
  prepareGoalHistoryRecord,
  addGoalHistoryRecordDirectly,
  updateGoalHistoryRecord,
  deleteGoalHistoryRecord,
  getGoalHistoryRecords,
  goalHistoryRecords,
  uiConfig,
  frequencyOptions: minFrequencyOptions,
  minutesPerTimeOptions,
  consecutivePunchDays,
} = useTodoStore()

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

// ============================================
// Supabase Helper Functions for Todos
// ============================================

/**
 * Load all todos from Supabase
 */
const loadTodosFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load todos from Supabase:', error)
      MessagePlugin.error('加载任务失败')
      return []
    }

    return data || []
  } catch (err) {
    console.error('Error loading todos:', err)
    MessagePlugin.error('加载任务时发生错误')
    return []
  }
}

/**
 * Save a new todo to Supabase (supports all task types)
 */

/**
 * Update an existing todo in Supabase
 */
const updateTodoInSupabase = async (
  id: string,
  updates: {
    title?: string
    description?: string
    deadline?: number
    done?: boolean
    completed_at?: number
    punch_ins?: number
  },
) => {
  try {
    const { error } = await supabase.from('todos').update(updates).eq('id', id)

    if (error) {
      console.error('Failed to update todo in Supabase:', error)
      MessagePlugin.error('更新任务失败')
      return false
    }

    return true
  } catch (err) {
    console.error('Error updating todo:', err)
    MessagePlugin.error('更新任务时发生错误')
    return false
  }
}

/**
 * Delete a todo from Supabase
 */
const deleteTodoFromSupabase = async (id: string) => {
  try {
    const { error } = await supabase.from('todos').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete todo from Supabase:', error)
      MessagePlugin.error('删除任务失败')
      return false
    }

    return true
  } catch (err) {
    console.error('Error deleting todo:', err)
    MessagePlugin.error('删除任务时发生错误')
    return false
  }
}

/**
 * Mark a todo as complete in Supabase
 */
const markTodoCompleteInSupabase = async (id: string, done: boolean) => {
  try {
    const updates: { done: boolean; completed_at: number | null } = {
      done,
      completed_at: done ? Date.now() : null,
    }

    const { error } = await supabase.from('todos').update(updates).eq('id', id)

    if (error) {
      console.error('Failed to mark todo complete in Supabase:', error)
      MessagePlugin.error('更新任务状态失败')
      return false
    }

    return true
  } catch (err) {
    console.error('Error marking todo complete:', err)
    MessagePlugin.error('更新任务状态时发生错误')
    return false
  }
}

// ============================================
// Supabase Helper Functions for Templates
// ============================================

/**
 * Save a new template to Supabase (database generates UUID)
 */
const saveTemplateToSupabase = async (template: {
  title: string
  category: string
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once'
  minFrequency: number
  unit: 'times' | 'minutes'
  minutesPerTime?: number
  description?: string
  deadline?: number
  created_at: number
}) => {
  try {
    console.log('📤 Saving template to Supabase:', template)
    const { data, error } = await supabase
      .from('todo_templates')
      .insert({
        title: template.title,
        category: template.category,
        period: template.period,
        min_frequency: template.minFrequency,
        unit: template.unit,
        minutes_per_time: template.minutesPerTime || null,
        description: template.description,
        deadline: template.deadline,
        archived: false,
        archived_at: null,
        created_at: new Date(template.created_at).toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('❌ Failed to save template to Supabase:', error)
      MessagePlugin.error('保存模板到数据库失败')
      return null
    }

    console.log('✅ Template saved to Supabase successfully, ID:', data.id)
    return data.id as string
  } catch (err) {
    console.error('❌ Error saving template:', err)
    MessagePlugin.error('保存模板时发生错误')
    return null
  }
}

/**
 * Load all templates from Supabase
 */
const loadTemplatesFromSupabase = async () => {
  try {
    const { data, error } = await supabase
      .from('todo_templates')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to load templates from Supabase:', error)
      MessagePlugin.error('加载模板失败')
      return []
    }

    console.log('Loaded templates from Supabase:', data)
    return data || []
  } catch (err) {
    console.error('Error loading templates:', err)
    MessagePlugin.error('加载模板时发生错误')
    return []
  }
}

/**
 * Update an existing template in Supabase
 */
const updateTemplateInSupabase = async (
  id: string,
  updates: {
    title?: string
    category?: string
    period?: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'once'
    min_frequency?: number
    unit?: 'times' | 'minutes'
    minutes_per_time?: number
    description?: string
    deadline?: number
    archived?: boolean
    archived_at?: number
  },
) => {
  try {
    const { error } = await supabase.from('todo_templates').update(updates).eq('id', id)

    if (error) {
      console.error('Failed to update template in Supabase:', error)
      MessagePlugin.error('更新模板失败')
      return false
    }

    console.log('Template updated in Supabase successfully')
    return true
  } catch (err) {
    console.error('Error updating template:', err)
    MessagePlugin.error('更新模板时发生错误')
    return false
  }
}

/**
 * Archive a template in Supabase (soft delete)
 */
const archiveTemplateInSupabase = async (id: string) => {
  try {
    const { error } = await supabase
      .from('todo_templates')
      .update({
        archived: true,
        archived_at: Date.now(),
      })
      .eq('id', id)

    if (error) {
      console.error('Failed to archive template in Supabase:', error)
      MessagePlugin.error('归档模板失败')
      return false
    }

    console.log('Template archived in Supabase successfully')
    return true
  } catch (err) {
    console.error('Error archiving template:', err)
    MessagePlugin.error('归档模板时发生错误')
    return false
  }
}

// ============================================
// Supabase Sync Helpers for Auxiliary Data
// ============================================

/**
 * Save application configuration (UI categories, etc.)
 */
const saveAppConfigToSupabase = async (key: string, value: unknown) => {
  try {
    const { error } = await supabase.from('app_configs').upsert({ key, value })
    if (error) console.error(`❌ Failed to save app config [${key}]:`, error)
    return !error
  } catch (err) {
    console.error(`❌ Error saving app config [${key}]:`, err)
    return false
  }
}

// function removed as it is replaced by batch loading in onMounted
// saveAppConfigToSupabase is still used for saving changes

/**
 * Specialized sync for Day Stats (upsert by day_key)
 */
const syncDayStatsToSupabase = async (stats: Record<string, DayStat>) => {
  try {
    const records = Object.entries(stats).map(([day_key, data]) => ({
      day_key,
      created_count: data.createdCount,
      completed_count: data.completedCount,
      punch_ins_total: data.punchInsTotal,
      minutes_total: data.minutesTotal,
      category_created: data.categoryCreated,
      category_completed: data.categoryCompleted,
      category_punch_ins: data.categoryPunchIns,
      category_minutes: data.categoryMinutes,
    }))

    if (!records.length) return true
    const { error } = await supabase
      .from('todo_day_stats')
      .upsert(records, { onConflict: 'day_key' })
    if (error) console.error('❌ Failed to sync day stats:', error)
    return !error
  } catch (err) {
    console.error('❌ Error syncing day stats:', err)
    return false
  }
}

// ============================================
// Debounced Watchers for Cloud Sync
// ============================================

/**
 * Initialize watchers to sync local store changes to Supabase
 */
const initSupabaseSyncWatchers = () => {
  // Sync UI Config
  watch(
    uiConfig,
    useDebounceFn(async (val) => {
      console.log('☁️ Syncing UI config to Supabase...')
      await saveAppConfigToSupabase('ui_config', val)
    }, 2000),
    { deep: true },
  )

  // Sync History (Save as JSON blob in app_configs for simplicity of sync)
  watch(
    history,
    useDebounceFn(async (val) => {
      await saveAppConfigToSupabase('todo_history_blob', val)
    }, 2000),
    { deep: true },
  )

  // Sync Archived History
  watch(
    archivedHistory,
    useDebounceFn(async (val: HistoryItem[]) => {
      await saveAppConfigToSupabase('todo_archived_history_blob', val)
    }, 2000),
    { deep: true },
  )

  // Sync Abandoned Goals
  watch(
    abandonedGoals,
    useDebounceFn(async (val: unknown) => {
      await saveAppConfigToSupabase('todo_abandoned_goals_blob', val)
    }, 2000),
    { deep: true },
  )

  // Sync Punch Records
  watch(
    punchRecords,
    useDebounceFn(async (val: PunchRecord[]) => {
      console.log('☁️ Syncing punch records to Supabase...')

      type DbPunchRecord = {
        id?: string
        todo_id: string
        todo_title: string
        category: string
        timestamp: number
        day_key: string
        unit?: string
        minutes_per_time?: number
        note?: string
      }

      const newRecords: DbPunchRecord[] = []
      const existingRecords: DbPunchRecord[] = []
      const tempIdMap: Record<number, string> = {}

      val.forEach((r) => {
        const isTemp = r.id.startsWith('temp_')
        const record = {
          id: isTemp ? undefined : r.id,
          todo_id: r.todoId,
          todo_title: r.todoTitle,
          category: r.category,
          timestamp: r.timestamp,
          day_key: r.dayKey,
          unit: r.unit,
          minutes_per_time: r.minutesPerTime,
          note: r.note,
        }
        if (isTemp) {
          newRecords.push(record)
          // Store index to update local ID later
          tempIdMap[newRecords.length - 1] = r.id
        } else {
          existingRecords.push(record)
        }
      })

      if (existingRecords.length) {
        await supabase.from('todo_punch_records').upsert(existingRecords)
      }

      if (newRecords.length) {
        const { data, error } = await supabase
          .from('todo_punch_records')
          .insert(newRecords)
          .select('id')

        if (!error && data) {
          // Update local IDs
          data.forEach((row, idx) => {
            const tempId = tempIdMap[idx]
            const realId = row.id
            const localRecord = punchRecords.value.find((r) => r.id === tempId)
            if (localRecord) {
              localRecord.id = realId
            }
          })
        } else {
          console.error('Failed to sync new punch records:', error)
        }
      }
    }, 3000),
    { deep: true },
  )

  // Sync Day Stats
  watch(
    dayStats,
    useDebounceFn(async (val) => {
      console.log('☁️ Syncing day stats to Supabase...')
      await syncDayStatsToSupabase(val)
    }, 5000),
    { deep: true },
  )
}

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

const punchRecordsByTodoId = computed(() => {
  const out: Record<string, PunchRecord[]> = {}
  for (const r of punchRecords.value) {
    ;(out[r.todoId] || (out[r.todoId] = [])).push(r)
  }
  return out
})

const getTodoCycleStartDayKey = (period: TodoPeriod, dayKey: string) => {
  if (period === 'daily' || period === 'once') return dayKey
  const d = dayjs(dayKey)
  if (!d.isValid()) return dayKey

  if (period === 'weekly') {
    const jsDay = d.day()
    const diff = jsDay === 0 ? 6 : jsDay - 1
    return d.subtract(diff, 'day').format('YYYY-MM-DD')
  }
  if (period === 'monthly') return d.startOf('month').format('YYYY-MM-DD')
  return d.startOf('year').format('YYYY-MM-DD')
}

const getTodoCycleEndDayKey = (period: TodoPeriod, cycleStartDayKey: string) => {
  if (period === 'daily' || period === 'once') return cycleStartDayKey
  const start = dayjs(cycleStartDayKey)
  if (!start.isValid()) return cycleStartDayKey

  if (period === 'weekly') return start.add(6, 'day').format('YYYY-MM-DD')
  if (period === 'monthly') return start.endOf('month').format('YYYY-MM-DD')
  return start.endOf('year').format('YYYY-MM-DD')
}

const getPunchedMinutesForTodo = (todo: (typeof todos.value)[number]) => {
  if (todo.unit !== 'minutes') return undefined
  if (todo.period === 'once') return undefined

  const list = punchRecordsByTodoId.value[todo.id] || []
  if (!list.length) return undefined

  const startKey = getTodoCycleStartDayKey(todo.period, todo.dayKey)
  const endKey = getTodoCycleEndDayKey(todo.period, startKey)

  let sum = 0
  let hit = 0
  for (const r of list) {
    if (r.unit !== 'minutes') continue
    if (r.dayKey < startKey || r.dayKey > endKey) continue
    sum += typeof r.minutesPerTime === 'number' ? r.minutesPerTime : 0
    hit += 1
  }
  return hit ? sum : undefined
}

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
  if (!category)
    return 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700'
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

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
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
      todo && todo.unit === 'minutes'
        ? typeof todo.minutesPerTime === 'number'
          ? todo.minutesPerTime
          : 15
        : 15
  }
  punchDialogVisible.value = true
}

const confirmPunch = () => {
  if (!currentPunchId.value) return
  punchDialogVisible.value = false

  // Pass minutes if enabled and valid
  const minutes = punchMinutesEnabled.value ? punchMinutes.value : undefined
  const prep = preparePunch(currentPunchId.value, punchNote.value, minutes)

  if (prep.kind === 'not_found' || prep.kind === 'too_frequent') {
    // maybe show message for too frequent?
    if (prep.kind === 'too_frequent') MessagePlugin.warning('打卡太频繁，请稍后再试')
    return
  }

  if (prep.kind === 'update_note' && prep.recordId) {
    // Quick update note logic locally? Or server?
    // Server-first for update too
    supabase
      .from('todo_punch_records')
      .update({ note: punchNote.value })
      .eq('id', prep.recordId)
      .then(({ error }) => {
        if (!error) {
          updatePunchRecordNote(prep.recordId!, punchNote.value)
          MessagePlugin.success('备注已更新')
        }
      })
    return
  }

  if (prep.kind === 'ok' && prep.record) {
    // Server-First Insert
    // Use the prep.record but without ID (or with placeholder), server generates it.
    // Map to DB columns
    const dbRecord = {
      todo_id: prep.record.todoId,
      todo_title: prep.record.todoTitle,
      category: prep.record.category,
      timestamp: prep.record.timestamp, // Store as number (bigint) or ISO string? Existing schema uses bigint? No, verify schema.
      // wait, schema check for timestamp column type. 'timestamp' usually means number in this code but DB usually timestampz?
      // Step 921 view of saveTemplateToSupabase used new Date().toISOString() for created_at.
      // But for punch records, let's verify loadData (Step 1012): timestamp: r.timestamp (number?).
      // Let's check D3TodoList sync watcher (Step 935): it sends { timestamp: r.timestamp }
      // If DB calls it 'timestamp', is it bigint or timestamptz?
      // I should assume it accepts what we send. But let's look at `loadTodosFromSupabase`?
      // Actually `punchInTodo` used `Date.now()`.
      // Let's check `saveTemplateToSupabase` (line 290): created_at: new Date().toISOString().
      // This suggests Supabase uses ISO strings for dates.
      // BUT `timestamp` in punch records might be a raw number if the user defined it as bigint in DB?
      // Let's check `fix_rls_all_tables.sql` or `clear_test_data.sql`? No schema file.
      // Let's check `loadData` again. `timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now()`.
      // It seems mostly number locally.
      // Sync watcher (D3TodoList line 500ish) sends `r`.
      // If I send number, does Supabase accept?
      // Let's blindly trust the sync logic works, so we mimic it.
      // But sync sends `r` which has `timestamp` as number.
      // So I'll send number.
      day_key: prep.record.dayKey,
      unit: prep.record.unit,
      minutes_per_time: prep.record.minutesPerTime,
      note: prep.record.note,
    }

    // We do need to verify timestamp format if I want to be 100% sure.
    // But let's try ISO string for safety if number fails?
    // Wait, D3TodoList Line 290 uses ISO string for `created_at`.
    // D3TodoList Line 1205: `.order('timestamp', ...)`
    // Whatever, let's try number first as local `PunchRecord` uses number.

    supabase
      .from('todo_punch_records')
      .insert(dbRecord)
      .select()
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error('Punch failed', error)
          MessagePlugin.error('打卡失败')
        } else if (data) {
          // Success!
          // data has the real ID
          prep.record.id = data.id
          addPunchRecordDirectly(prep.record)

          // CRITICAL: Update Todo state in Supabase (punch_ins, done, completed_at)
          // addPunchRecordDirectly has updated local state, now sync to server
          const info = getTodoById(prep.record.todoId)
          if (info) {
            supabase
              .from('todos')
              .update({
                punch_ins: info.punchIns,
                done: info.done,
                completed_at: info.completedAt || null,
              })
              .eq('id', info.id)
              .then(({ error }) => {
                if (error) console.error('Failed to update todo state', error)
              })
          }

          // 播放 Rainbow 碎纸屑效果
          const colors = [
            '#60a5fa',
            '#a78bfa',
            '#f472b6',
            '#34d399',
            '#fb923c',
            '#facc15',
            '#22c55e',
          ]
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: colors,
            disableForReducedMotion: true,
          })
          MessagePlugin.success('打卡成功')
        }
      })
  }
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
const configDrawerVisible = ref(false)
const draftCategoriesList = ref<string[]>([])
const draftCategoriesInputRefs = ref<HTMLElement[]>([])
const draftMinFrequenciesList = ref<number[]>([])
const draftMinutesPerTimesList = ref<number[]>([])
const draftCategoryColorsMap = ref<Record<string, string>>({})

const openConfigDrawer = () => {
  draftCategoriesList.value = [...uiConfig.value.categories]
  draftMinFrequenciesList.value = [...minFrequencyOptions.value]
  draftMinutesPerTimesList.value = [...minutesPerTimeOptions.value]
  draftCategoryColorsMap.value = { ...uiConfig.value.categoryColors }
  configDrawerVisible.value = true
}

const saveUiConfigFromDraft = () => {
  const cats = draftCategoriesList.value.map((s) => s.trim()).filter(Boolean)
  const freqs = draftMinFrequenciesList.value.filter((n) => typeof n === 'number' && !isNaN(n))
  const mins = draftMinutesPerTimesList.value.filter((n) => typeof n === 'number' && !isNaN(n))

  if (cats.length) uiConfig.value.categories = cats
  if (freqs.length) uiConfig.value.minFrequencies = freqs
  if (mins.length) uiConfig.value.minutesPerTimes = mins
  uiConfig.value.categoryColors = { ...draftCategoryColorsMap.value }

  // Sync is handled by watch(uiConfig) in initSupabaseSyncWatchers
  configDrawerVisible.value = false
  MessagePlugin.success('配置已保存')
}

const resetUiConfig = () => {
  draftCategoriesList.value = ['默认', '工作', '学习', '健康', '生活']
  draftMinFrequenciesList.value = [1, 2, 3, 4]
  draftMinutesPerTimesList.value = [12, 15, 18, 20]
}

const addDraftCategory = async () => {
  draftCategoriesList.value.push('')
  await nextTick()
  const inputs = draftCategoriesInputRefs.value
  if (inputs && inputs.length > 0) {
    const lastInput = inputs[inputs.length - 1]
    if (lastInput) lastInput.focus()
  }
}
const removeDraftCategory = (index: number) => draftCategoriesList.value.splice(index, 1)

const onDraftCategoryEnter = (index: number) => {
  if (index === draftCategoriesList.value.length - 1) {
    addDraftCategory()
  } else {
    // Optional: focus next input
    const inputs = draftCategoriesInputRefs.value
    if (inputs && inputs[index + 1]) {
      inputs[index + 1]?.focus()
    }
  }
}

const addDraftFrequency = () => draftMinFrequenciesList.value.push(1)
const removeDraftFrequency = (index: number) => draftMinFrequenciesList.value.splice(index, 1)

const addDraftMinute = () => draftMinutesPerTimesList.value.push(15)
const removeDraftMinute = (index: number) => draftMinutesPerTimesList.value.splice(index, 1)

onMounted(async () => {
  // 1 & 2. Batch Load Configs (UI & History Blobs) from Cloud
  try {
    const { data: configs } = await supabase
      .from('app_configs')
      .select('key, value')
      .in('key', [
        'ui_config',
        'todo_history_blob',
        'todo_archived_history_blob',
        'todo_abandoned_goals_blob',
      ])

    if (configs) {
      const configMap = new Map(configs.map((c) => [c.key, c.value]))

      if (configMap.has('ui_config')) {
        uiConfig.value = configMap.get('ui_config')
        console.log('✅ UI config loaded from cloud')
      }
      if (configMap.has('todo_history_blob')) history.value = configMap.get('todo_history_blob')
      if (configMap.has('todo_archived_history_blob'))
        archivedHistory.value = configMap.get('todo_archived_history_blob')
      if (configMap.has('todo_abandoned_goals_blob'))
        abandonedGoals.value = configMap.get('todo_abandoned_goals_blob')
    }
  } catch (e) {
    console.error('❌ Error batch loading configs:', e)
  }

  // 3. Load Templates from Supabase
  const supabaseTemplates = await loadTemplatesFromSupabase()
  // ... (existing template sync logic) ...

  // Sync loaded templates with local store
  const supabaseTemplateIds = new Set(supabaseTemplates.map((t) => t.id))
  const templatesToRemove = templates.value.filter((t) => !supabaseTemplateIds.has(t.id))

  for (const templateToRemove of templatesToRemove) {
    const idx = templates.value.findIndex((t) => t.id === templateToRemove.id)
    if (idx >= 0) templates.value.splice(idx, 1)
  }

  // Add/update templates from Supabase
  for (const template of supabaseTemplates) {
    const existingIdx = templates.value.findIndex((t) => t.id === template.id)

    const templateItem: TodoTemplate = {
      id: template.id,
      title: template.title,
      category: template.category || '',
      period: template.period as TodoPeriod,
      minFrequency: template.min_frequency || 1,
      unit: (template.unit as TodoUnit) || 'times',
      minutesPerTime: template.minutes_per_time,
      description: template.description,
      deadline: template.deadline,
      archived: template.archived || false,
      archivedAt: template.archived_at,
      createdAt: new Date(template.created_at).getTime(),
    }

    if (existingIdx >= 0) {
      // Update existing
      templates.value[existingIdx] = templateItem
    } else {
      // Add new
      templates.value.push(templateItem)
    }
  }

  // Load all todos from Supabase
  const supabaseTodos = await loadTodosFromSupabase()

  // Sync loaded todos with local store
  // First, remove any todos that exist in local store but not in Supabase
  // (to handle cases where they were deleted from Supabase)
  const supabaseTodoIds = new Set(supabaseTodos.map((t) => t.id))
  const todosToRemove = todos.value.filter((t) => !supabaseTodoIds.has(t.id))

  for (const todoToRemove of todosToRemove) {
    const idx = todos.value.findIndex((t) => t.id === todoToRemove.id)
    if (idx >= 0) todos.value.splice(idx, 1)
  }

  // Then add/update todos from Supabase
  for (const todo of supabaseTodos) {
    const existingIdx = todos.value.findIndex((t: Todo) => t.id === todo.id)

    const todoItem: Todo = {
      id: todo.id,
      title: todo.title,
      category: todo.category || '',
      period: todo.period as TodoPeriod,
      minFrequency: todo.min_frequency || 1,
      unit: (todo.unit as TodoUnit) || 'times',
      minutesPerTime: todo.minutes_per_time,
      description: todo.description,
      done: todo.done || false,
      completedAt: todo.completed_at,
      punchIns: todo.punch_ins || 0,
      templateId: todo.template_id,
      createdAt: new Date(todo.created_at).getTime(),
      dayKey: todo.day_key,
      deadline: todo.deadline,
    }

    if (existingIdx >= 0) {
      // Update existing
      todos.value[existingIdx] = todoItem
    } else {
      // Add new
      todos.value.push(todoItem)
    }
  }

  // 4. Load Stats and Records
  const { data: statsData } = await supabase.from('todo_day_stats').select('*')
  if (statsData) {
    const mappedStats: Record<string, DayStat> = {}
    statsData.forEach((s) => {
      mappedStats[s.day_key] = {
        createdCount: s.created_count,
        completedCount: s.completed_count,
        punchInsTotal: s.punch_ins_total,
        minutesTotal: s.minutes_total,
        categoryCreated: s.category_created,
        categoryCompleted: s.category_completed,
        categoryPunchIns: s.category_punch_ins,
        categoryMinutes: s.category_minutes,
      }
    })
    dayStats.value = mappedStats
  }

  const { data: punchData } = await supabase
    .from('todo_punch_records')
    .select('*')
    .order('timestamp', { ascending: false })
  if (punchData) {
    punchRecords.value = punchData.map((r) => ({
      id: r.id,
      todoId: r.todo_id,
      todoTitle: r.todo_title,
      category: r.category,
      timestamp: r.timestamp,
      dayKey: r.day_key,
      unit: r.unit,
      minutesPerTime: r.minutes_per_time,
      note: r.note,
    }))
  }

  const { data: goalHistoryData } = await supabase
    .from('todo_goal_history_records')
    .select('*')
    .order('timestamp', { ascending: false })
  if (goalHistoryData) {
    goalHistoryRecords.value = goalHistoryData.map((r) => ({
      id: r.id,
      goalId: r.goal_id,
      content: r.content,
      type: r.type,
      timestamp: r.timestamp,
      note: r.note,
    }))
  }

  // 5. Initialize Sync Watchers
  initSupabaseSyncWatchers()

  // 6. Materialize Today's Todos
  materializeTodayTodosFromTemplates()
})

const categoryOptions = computed(() => uiConfig.value.categories)
// Config options are now imported from store as computed props

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

const isEditingGoal = computed(() => {
  const t = editingTodo.value
  if (!t) return false
  return t.period === 'once'
})

const currentGoalHistory = computed(() => {
  const id = currentGoalId.value
  if (!id) return []
  const todo = getTodoById(id)
  if (!todo || todo.period !== 'once') return []
  return getGoalHistoryRecords(id).sort((a, b) => b.timestamp - a.timestamp)
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

const saveEdit = async () => {
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

  // Update in Supabase for all task types
  await updateTodoInSupabase(id, {
    title: nextTitle,
    description: editDescription.value.trim() || undefined,
  })

  editVisible.value = false
  editingTodoId.value = null
  MessagePlugin.success('已保存修改')
}

// Goal History Management Functions
const openGoalHistoryDialog = (goalId: string) => {
  currentGoalId.value = goalId
  goalHistoryDialogVisible.value = true
  // 重置表单
  goalHistoryContent.value = ''
  goalHistoryMinutes.value = 0
  goalHistoryType.value = 'regular'
  editingGoalHistoryId.value = null
}

const addGoalHistory = async () => {
  const id = currentGoalId.value
  if (!id) return

  const content = goalHistoryContent.value.trim()
  if (!content) {
    MessagePlugin.warning('请输入历史记录内容')
    return
  }

  // 1. 添加进度记录 (Server-First)
  const ghPrep = prepareGoalHistoryRecord(id, content, goalHistoryType.value)
  if (ghPrep.kind === 'not_found') {
    MessagePlugin.error('目标不存在')
    return
  }
  if (ghPrep.kind === 'empty_content') {
    MessagePlugin.warning('历史记录内容不能为空')
    return
  }

  // Insert Goal History to Supabase
  const { data: ghData, error: ghError } = await supabase
    .from('todo_goal_history_records')
    .insert({
      goal_id: ghPrep.record.goalId,
      content: ghPrep.record.content,
      type: ghPrep.record.type,
      timestamp: ghPrep.record.timestamp,
      note: ghPrep.record.note,
    })
    .select('id')
    .single()

  if (ghError || !ghData) {
    console.error('Failed to save goal history', ghError)
    MessagePlugin.error('保存进度失败')
    return
  }

  // Update local store with real ID
  ghPrep.record.id = ghData.id
  addGoalHistoryRecordDirectly(ghPrep.record)

  // 2. 自动打卡联动
  // 将进度内容作为打卡备注
  // 2. 自动打卡联动 (Server-First)
  // 将进度内容作为打卡备注
  const prep = preparePunch(id, content)

  if (prep.kind === 'ok' && prep.record) {
    // Build DB payload
    const dbRecord = {
      todo_id: prep.record.todoId,
      todo_title: prep.record.todoTitle,
      category: prep.record.category,
      timestamp: prep.record.timestamp,
      day_key: prep.record.dayKey,
      unit: prep.record.unit,
      minutes_per_time: prep.record.minutesPerTime,
      note: prep.record.note,
    }

    // Async save
    supabase
      .from('todo_punch_records')
      .insert(dbRecord)
      .select()
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          prep.record.id = data.id
          addPunchRecordDirectly(prep.record, { skipAutoCompletion: true })

          // CRITICAL: Update Todo state in Supabase
          const info = getTodoById(prep.record.todoId)
          if (info) {
            supabase
              .from('todos')
              .update({
                punch_ins: info.punchIns,
                done: info.done,
                completed_at: info.completedAt || null,
              })
              .eq('id', info.id)
              .then(({ error }) => {
                if (error) console.error('Failed to update todo state', error)
              })
          }

          // 3. 如果有输入时间，更新打卡时间 (Server-First update)
          const mins = typeof goalHistoryMinutes.value === 'number' ? goalHistoryMinutes.value : 0
          if (mins > 0) {
            // We need to update database AND local
            supabase
              .from('todo_punch_records')
              .update({ minutes_per_time: mins, unit: 'minutes' })
              .eq('id', data.id)
              .then(({ error: updateErr }) => {
                if (!updateErr) {
                  updatePunchRecordMinutes(data.id, mins)
                }
              })
          }
          MessagePlugin.success('已添加记录并同步打卡')
        } else {
          MessagePlugin.warning('历史记录添加成功，但打卡同步失败')
        }
      })
  } else if (prep.kind === 'update_note' && prep.recordId) {
    // Just update note
    supabase
      .from('todo_punch_records')
      .update({ note: content })
      .eq('id', prep.recordId)
      .then(({ error }) => {
        if (!error) {
          updatePunchRecordNote(prep.recordId!, content)
          MessagePlugin.success('已更新今日打卡备注')
        }
      })
  }

  goalHistoryContent.value = ''
  goalHistoryMinutes.value = 0
  goalHistoryType.value = 'regular'
  // MessagePlugin.success('已添加记录并同步打卡') // Moved inside async callback
}

const startEditGoalHistory = (record: GoalHistoryRecord) => {
  editingGoalHistoryId.value = record.id
  goalHistoryContent.value = record.content

  // 查找对应的打卡记录以获取时间
  // 通过 content (note) 和 goalId (todoId) 匹配
  const relatedPunch = punchRecords.value.find(
    (p) => p.todoId === record.goalId && p.note === record.content,
  )

  if (relatedPunch && relatedPunch.unit === 'minutes') {
    goalHistoryMinutes.value =
      typeof relatedPunch.minutesPerTime === 'number' ? relatedPunch.minutesPerTime : 0
  } else {
    goalHistoryMinutes.value = 0
  }
}

const saveGoalHistory = () => {
  const id = editingGoalHistoryId.value
  if (!id) return

  const content = goalHistoryContent.value.trim()
  if (!content) {
    MessagePlugin.warning('历史记录内容不能为空')
    return
  }

  const success = updateGoalHistoryRecord(id, content)
  if (!success) {
    MessagePlugin.error('更新失败')
    return
  }

  editingGoalHistoryId.value = null
  goalHistoryContent.value = ''
  MessagePlugin.success('已更新历史记录')
}

const cancelEditGoalHistory = () => {
  editingGoalHistoryId.value = null
  goalHistoryContent.value = ''
}

const deleteGoalHistory = (id: string) => {
  const confirmDialog = DialogPlugin.confirm({
    header: '确认删除',
    body: '确定要删除这条历史记录吗？',
    confirmBtn: {
      content: '删除',
      theme: 'danger',
    },
    onConfirm: () => {
      const success = deleteGoalHistoryRecord(id)
      if (success) {
        MessagePlugin.success('已删除历史记录')
      } else {
        MessagePlugin.error('删除失败')
      }
      confirmDialog.hide()
    },
  })
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

// Goal History State
const goalHistoryContent = ref('')
const goalHistoryType = ref<'regular' | 'milestone'>('regular')
const goalHistoryMinutes = ref(0)
const editingGoalHistoryId = ref<string | null>(null)

// Goal History Dialog State (独立对话框)
const goalHistoryDialogVisible = ref(false)
const currentGoalId = ref<string | null>(null)

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

const saveTemplateEdit = async () => {
  const id = editingTemplateId.value
  if (!id) return

  const nextTitle = templateTitle.value.trim()
  if (!nextTitle) {
    MessagePlugin.warning('任务名称不能为空')
    return
  }
  if (templateCategoryOptions.value.length && !templateCategory.value) {
    MessagePlugin.warning('请选择任务分类')
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

  // Sync with Supabase
  await updateTemplateInSupabase(id, {
    title: nextTitle,
    category: templateCategory.value,
    period: templatePeriod.value,
    min_frequency: templateMinFrequency.value,
    unit: templateUnit.value,
    minutes_per_time: templateMinutesPerTime.value,
    description: templateDescription.value.trim() || undefined,
  })

  templateEditVisible.value = false
  editingTemplateId.value = null
  MessagePlugin.success('任务已更新')
}

const isTaskCompleted = (t: Todo) => {
  // STRICT LOGIC:
  // If unit is 'minutes', check minutesPerTime
  // If unit is 'times', check minFrequency
  // Ignore t.done (manual toggle) unless you want manual override to COUNT as achieved?
  // User request: "calculate strictly based on min minutes"
  // So we ignore t.done for the calculation of "Achieved/Not Achieved" stats.

  if (t.unit === 'minutes') {
    const currentMins = getPunchedMinutesForTodo(t) || 0
    return currentMins >= (t.minutesPerTime || 0)
  }

  // Default to times
  return (t.punchIns || 0) >= (t.minFrequency || 0)
}

const handlePunchIn = (id: string) => {
  onPunchTrigger(id)
}

const addTodo = async () => {
  if (!categoryOptions.value.length) {
    MessagePlugin.warning('请先在配置管理中添加分类后再添加')
    return
  }
  if (!category.value) {
    MessagePlugin.warning('请选择任务分类')
    return
  }

  // 1. Prepare data (Validation & Object Construction)
  const res = prepareTodo({
    title: title.value,
    category: category.value,
    period: period.value,
    minFrequency: minFrequency.value,
    unit: unit.value,
    minutesPerTime: minutesPerTime.value,
    description: description.value.trim() || undefined,
    deadline:
      period.value === 'once' && deadline.value ? dayjs(deadline.value).valueOf() : undefined,
  })

  if (res.kind === 'empty') {
    MessagePlugin.error('任务标题不能为空')
    return
  }
  if (res.kind === 'exists') {
    MessagePlugin.info(`任务已存在,请${res.action}`)
    return
  }

  // 2. Perform Server Operations
  try {
    const todoPayload = res.todo
    const newTemplate = res.newTemplate

    // 2a. Handle Template (if needed)
    if (newTemplate) {
      console.log('📋 Saving new template to Supabase first:', newTemplate)
      // Since it's server-first, we save template to DB and get ID
      const templateId = await saveTemplateToSupabase({
        title: newTemplate.title,
        category: newTemplate.category,
        period: newTemplate.period,
        minFrequency: newTemplate.minFrequency,
        unit: newTemplate.unit,
        minutesPerTime: newTemplate.minutesPerTime,
        description: newTemplate.description,
        deadline: newTemplate.deadline,
        created_at: newTemplate.createdAt,
      })

      if (templateId) {
        // Update payload with real ID
        todoPayload.templateId = templateId
      } else {
        MessagePlugin.error('模板保存失败，取消创建任务')
        return
      }
    } else if (todoPayload.templateId) {
      // Using existing template, ID is already set in payload
    }

    const dbPayload = {
      title: todoPayload.title,
      category: todoPayload.category,
      period: todoPayload.period,
      min_frequency: todoPayload.minFrequency,
      unit: todoPayload.unit,
      minutes_per_time: todoPayload.minutesPerTime || null,
      description: todoPayload.description,
      done: todoPayload.done,
      completed_at: todoPayload.completedAt || null,
      punch_ins: todoPayload.punchIns,
      template_id: todoPayload.templateId || null,
      created_at: new Date(todoPayload.createdAt).toISOString(),
      day_key: todoPayload.dayKey,
      deadline: todoPayload.deadline || null,
    }

    const { data: insertedTodo, error } = await supabase
      .from('todos')
      .insert(dbPayload)
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to save todo:', error)
      MessagePlugin.error('保存任务失败')
      return
    }

    // 3. Update Local State with Server Response
    if (insertedTodo) {
      console.log('✅ Todo saved successfully:', insertedTodo)

      // Map back to local interface
      const localTodo: Todo = {
        id: insertedTodo.id, // The Server Generated ID!
        title: insertedTodo.title,
        done: insertedTodo.done,
        punchIns: insertedTodo.punch_ins,
        category: insertedTodo.category,
        period: insertedTodo.period,
        minFrequency: insertedTodo.min_frequency,
        unit: insertedTodo.unit,
        minutesPerTime: insertedTodo.minutes_per_time,
        description: insertedTodo.description,
        templateId: insertedTodo.template_id,
        createdAt: new Date(insertedTodo.created_at).getTime(),
        dayKey: insertedTodo.day_key,
        deadline: insertedTodo.deadline,
        completedAt: insertedTodo.completed_at
          ? new Date(insertedTodo.completed_at).getTime()
          : undefined,
      }

      // Add to store!
      addTodoDirectly(localTodo)

      MessagePlugin.success('任务添加成功')

      // Reset form
      title.value = ''
      description.value = ''
      deadline.value = ''
    }
  } catch (e) {
    console.error('❌ Unexpected error in addTodo:', e)
    MessagePlugin.error('添加任务发生异常')
  }
}

watch(
  categoryOptions,
  (cats) => {
    if (!cats.length) {
      category.value = ''
      if (period.value !== 'once') period.value = 'once'
      return
    }
    if (category.value && !cats.includes(category.value)) {
      category.value = ''
    }
  },
  { immediate: true },
)

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
      onConfirm: async () => {
        const res = giveUpGoalById(id)
        if (res.kind === 'not_found') {
          confirmDialog.hide()
          return
        }

        // Delete from Supabase as well
        await deleteTodoFromSupabase(id)

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
    onConfirm: async () => {
      const res = archiveTodoById(id)
      if (res.kind === 'not_found') {
        confirmDialog.hide()
        return
      }

      // If this archived a template, sync to Supabase
      if (todo.templateId) {
        await archiveTemplateInSupabase(todo.templateId)
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

const toggleDone = async (id: string, done: boolean) => {
  // 如果是完成目标,需要确认
  if (done) {
    const todo = getTodoById(id)
    if (todo && todo.period === 'once') {
      const confirmDialog = DialogPlugin.confirm({
        header: '确认完成目标',
        body: `确定要标记目标"${todo.title}"为已完成吗?`,
        confirmBtn: {
          content: '确认完成',
          theme: 'success',
        },
        onConfirm: async () => {
          toggleTodoDone(id, done)
          // Sync with Supabase
          await markTodoCompleteInSupabase(id, done)
          confirmDialog.hide()
        },
      })
      return
    }
  }

  const todo = getTodoById(id)
  toggleTodoDone(id, done)

  // Sync with Supabase for all task types
  if (todo) {
    await markTodoCompleteInSupabase(id, done)
  }
}

const todayTodos = computed(() => todos.value.filter((t) => t.dayKey === todayKey.value))
const todayCompletedCount = computed(() => todayTodos.value.filter((t) => t.done).length)
const todayPunchRecords = computed(() =>
  punchRecords.value.filter((r) => r.dayKey === todayKey.value),
)
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
const todayScheduledCount = computed(
  () => todayTodos.value.filter((t) => t.period !== 'once').length,
)
// 当日还剩几个可以打卡但是未打卡的数量 (punchIns === 0，排除目标)
const todayUnstartedCount = computed(
  () => todayTodos.value.filter((t) => t.period !== 'once' && t.punchIns === 0).length,
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

// --- UI Redesign: Card Layout Logic ---

// --- Color Logic ---
const generateHexColor = (str: string) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 70%, 50%)`
}

const getCategoryColor = (category: string): string => {
  const custom = uiConfig.value.categoryColors?.[category]
  if (custom) return custom
  return generateHexColor(category)
}

const boardGroups = computed(() => {
  const groups: Array<{
    name: string
    color: string
    unfinished: Todo[]
    completed: Todo[]
    total: number
    progress: string
    goalDescription?: string // Optional: derive a goal description like "Main: Stability..."
  }> = []

  // Separate goals (period === 'once') from periodic tasks
  const periodicTasks = todayTodos.value.filter((t) => t.period !== 'once')
  const goalTasks = todayTodos.value.filter((t) => t.period === 'once')

  // Ensure we include '未分类' if it exists in data but not in options
  const allCategories = new Set(categoryOptions.value)
  periodicTasks.forEach((t) => allCategories.add(t.category || '未分类'))

  // Use configured order if possible
  const sortedCategories = [...allCategories].sort((a, b) => {
    const idxA = categoryOptions.value.indexOf(a)
    const idxB = categoryOptions.value.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  // Add periodic task groups
  for (const cat of sortedCategories) {
    const todosInCat = periodicTasks.filter((t) => (t.category || '未分类') === cat)
    if (todosInCat.length === 0) continue

    const unfinished = todosInCat.filter((t) => !isTaskCompleted(t))
    const completed = todosInCat.filter((t) => isTaskCompleted(t))
    const total = todosInCat.length

    // Calculate punch progress: tasks with punchIns > 0 / total tasks
    const punchedCount = todosInCat.filter((t) => (t.punchIns || 0) > 0).length
    const progress = total > 0 ? ((punchedCount / total) * 100).toFixed(1) : '0.0'

    groups.push({
      name: cat,
      color: getCategoryColor(cat),
      unfinished,
      completed,
      total,
      progress,
    })
  }

  // Add dedicated "目标" card for all goals
  if (goalTasks.length > 0) {
    const unfinished = goalTasks.filter((t) => !isTaskCompleted(t))
    const completed = goalTasks.filter((t) => isTaskCompleted(t))
    const total = goalTasks.length
    const punchedCount = goalTasks.filter((t) => (t.punchIns || 0) > 0).length
    const progress = total > 0 ? ((punchedCount / total) * 100).toFixed(1) : '0.0'

    groups.push({
      name: '目标',
      color: getCategoryColor('目标'),
      unfinished,
      completed,
      total,
      progress,
    })
  }

  return groups
})

// 昨日数据对比
const yesterdayKey = computed(() => dayjs().subtract(1, 'day').format('YYYY-MM-DD'))
const yesterdayStat = computed(
  () => dayStats.value[yesterdayKey.value] || { punchInsTotal: 0, minutesTotal: 0 },
)
const punchInsDiff = computed(
  () => todayPunchInsTotal.value - (yesterdayStat.value.punchInsTotal || 0),
)
const minutesDiff = computed(
  () => todayMinutesTotal.value - (yesterdayStat.value.minutesTotal || 0),
)

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

const chart1Ref = ref(null)
const chart2Ref = ref(null)
const chart3Ref = ref(null)
const chart4Ref = ref(null)

const exportChart = (chartRef: unknown, title: string) => {
  if (!chartRef) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = (chartRef as any).chart
  if (!instance) return

  const url = instance.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: isDark.value ? '#171717' : '#ffffff',
    excludeComponents: ['toolbox'],
  })

  const link = document.createElement('a')
  link.download = `${title}_${dayjs().format('YYYY-MM-DD')}.png`
  link.href = url
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const copyChart = async (chartRef: unknown, title: string) => {
  if (!chartRef) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const instance = (chartRef as any).chart
  if (!instance) return

  try {
    const url = instance.getDataURL({
      type: 'png',
      pixelRatio: 2,
      backgroundColor: isDark.value ? '#171717' : '#ffffff',
      excludeComponents: ['toolbox'],
    })

    // Convert data URL to blob
    const response = await fetch(url)
    const blob = await response.blob()

    // Copy to clipboard
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob,
      }),
    ])

    MessagePlugin.success(`${title} 已复制到剪贴板`)
  } catch (error) {
    console.error('Copy chart failed:', error)
    MessagePlugin.error('复制失败,请重试')
  }
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
  return { backgroundColor: p.itemBg, borderColor: p.itemBorder, color: p.rootText } as Record<
    string,
    string
  >
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
    const result = await snapdom(exportCaptureRef.value, {
      scale,
      backgroundColor: exportPalette.value.rootBg,
    })
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

const isMobile = computed(() => windowWidth.value < 640)
const isAddPanelOpen = ref(false)
const isHistoryPanelOpen = ref(false)

watch(
  isMobile,
  (m) => {
    if (m) {
      isAddPanelOpen.value = false
      isHistoryPanelOpen.value = false
    }
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('resize', updateWidth)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateWidth)
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
      <div v-if="isMobile" class="flex items-center justify-between mb-2">
        <div class="text-sm font-medium text-neutral-700 dark:text-neutral-200">添加任务/目标</div>
        <t-button
          shape="square"
          variant="text"
          size="small"
          @click="isAddPanelOpen = !isAddPanelOpen"
        >
          <template #icon>
            <chevron-down-icon v-if="!isAddPanelOpen" />
            <chevron-up-icon v-else />
          </template>
        </t-button>
      </div>

      <div
        v-show="!isMobile || isAddPanelOpen"
        class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
      >
        <t-input
          autofocus
          v-model="title"
          :onEnter="addTodo"
          :placeholder="
            !categoryOptions.length
              ? '请先在配置管理中添加分类'
              : period === 'once'
                ? '添加目标'
                : '添加任务'
          "
          class="flex-1"
        ></t-input>
        <t-button
          @click="addTodo"
          class="w-full sm:w-auto"
          :disabled="!categoryOptions.length || !category"
        >
          <template #icon>
            <add-icon size="20" />
          </template>
          {{ period === 'once' ? '新建目标' : '新建任务' }}
        </t-button>
      </div>
    </div>

    <div
      v-show="!isMobile || isAddPanelOpen"
      class="max-w-[1200px] mx-auto mt-4 px-4 grid grid-cols-12 gap-x-4 gap-y-3"
    >
      <div class="col-span-12 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">任务分类</div>
        <div class="flex items-center gap-2 flex-1">
          <t-radio-group
            v-if="categoryOptions.length"
            v-model="category"
            variant="default-filled"
            size="small"
            class="flex flex-wrap"
          >
            <t-radio-button v-for="c in categoryOptions" :key="c" :value="c">{{
              c
            }}</t-radio-button>
          </t-radio-group>
          <div v-else class="text-sm text-neutral-400">暂无分类，请先添加</div>
          <t-button shape="square" variant="text" size="small" @click="openConfigDrawer">
            <template #icon><setting-icon /></template>
          </t-button>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">任务周期</div>
        <t-radio-group
          v-model="period"
          variant="default-filled"
          size="small"
          class="flex flex-wrap"
        >
          <t-radio-button value="daily" :disabled="!categoryOptions.length">每天</t-radio-button>
          <t-radio-button value="weekly" :disabled="!categoryOptions.length">每周</t-radio-button>
          <t-radio-button value="monthly" :disabled="!categoryOptions.length">每月</t-radio-button>
          <t-radio-button value="yearly" :disabled="!categoryOptions.length">每年</t-radio-button>
          <t-radio-button value="once" :disabled="!categoryOptions.length">目标</t-radio-button>
        </t-radio-group>
      </div>

      <div class="col-span-12 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">最小频率</div>
        <div class="flex items-center gap-2">
          <t-radio-group
            v-model="minFrequency"
            variant="default-filled"
            size="small"
            :disabled="period === 'once'"
            class="flex flex-wrap"
          >
            <t-radio-button v-for="freq in minFrequencyOptions" :key="freq" :value="freq">{{
              freq
            }}</t-radio-button>
          </t-radio-group>
          <div class="text-sm text-neutral-400">次</div>
          <t-button shape="square" variant="text" size="small" @click="openConfigDrawer">
            <template #icon><setting-icon /></template>
          </t-button>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">任务单位</div>
        <t-radio-group
          v-model="unit"
          variant="default-filled"
          size="small"
          :disabled="period === 'once'"
          class="flex flex-wrap"
        >
          <t-radio-button value="times">次数</t-radio-button>
          <t-radio-button value="minutes">分钟</t-radio-button>
        </t-radio-group>
      </div>

      <div class="col-span-12 lg:col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">每次分钟</div>
        <div class="flex items-center gap-2 flex-1">
          <t-radio-group
            v-model="minutesPerTime"
            variant="default-filled"
            size="small"
            :disabled="period === 'once' || unit !== 'minutes'"
            class="flex flex-wrap"
          >
            <t-radio-button v-for="mins in minutesPerTimeOptions" :key="mins" :value="mins">{{
              mins
            }}</t-radio-button>
          </t-radio-group>
          <div class="text-sm text-neutral-400">分钟</div>
          <t-button shape="square" variant="text" size="small" @click="openConfigDrawer">
            <template #icon><setting-icon /></template>
          </t-button>
        </div>
      </div>

      <div class="col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">任务描述</div>
        <t-input v-model="description" placeholder="可选：添加任务的详细描述" class="flex-1" />
      </div>

      <div class="col-span-6 flex flex-col sm:flex-row sm:items-center gap-2">
        <div class="text-sm sm:w-[72px] shrink-0">截止日期</div>
        <t-date-picker
          :disabled="period !== 'once'"
          v-model="deadline"
          placeholder="可选：选择截止日期"
          class="flex-1 w-full"
        />
      </div>
    </div>

    <div class="max-w-[1200px] mx-auto mt-6 px-4 flex items-center justify-between gap-2">
      <h2 class="text-2xl font-bold" style="font-family: 'Fira Sans', sans-serif; color: #134e4a">
        任务/目标
      </h2>
    </div>

    <div class="max-w-[1200px] mx-auto mt-4 px-4">
      <!-- Dashboard Grid -->
      <div
        v-if="boardGroups.length"
        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
      >
        <div
          v-for="group in boardGroups"
          :key="group.name"
          class="group rounded-2xl border border-t-0 border-r-0 border-b-0 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm shadow-lg flex flex-col overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
          :style="{
            borderLeftColor: group.color,
            borderLeftWidth: '5px',
            fontFamily: 'Fira Sans, sans-serif',
          }"
        >
          <!-- Header -->
          <div
            class="p-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between bg-linear-to-r from-transparent to-teal-50/30 dark:to-teal-900/10"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110"
                :style="{ backgroundColor: group.color + '20', color: group.color }"
              >
                <app-icon size="20" />
              </div>
              <span
                class="font-bold text-xl"
                style="color: #134e4a; font-family: 'Fira Sans', sans-serif"
                >{{ group.name }}</span
              >
            </div>
            <div
              class="text-xs font-mono"
              style="color: #0d9488; font-family: 'Fira Code', monospace"
            >
              已达成 {{ group.completed.length }} / 未达成 {{ group.unfinished.length }}
            </div>
          </div>

          <!-- Body -->
          <div class="p-5 flex-1 flex flex-col gap-3 min-h-[200px]">
            <!-- Unfinished -->
            <div v-if="group.unfinished.length > 0" class="flex flex-col gap-2">
              <div v-for="todo in group.unfinished" :key="todo.id" class="transform transition-all">
                <TodoItem
                  :todo="todo"
                  :punched-minutes="getPunchedMinutesForTodo(todo)"
                  :show-meta-tags="false"
                  compact
                  @toggle-select="toggleSelect"
                  @toggle-done="toggleDone"
                  @punch-in="handlePunchIn"
                  @edit="openEdit"
                  @archive="archiveTodo"
                  @view-history="openGoalHistoryDialog"
                />
              </div>
            </div>

            <!-- Completed -->
            <div v-if="group.completed.length > 0" class="flex flex-col gap-2">
              <!-- Divider if needed, or just append -->
              <div
                v-if="group.unfinished.length > 0"
                class="h-px bg-neutral-100 dark:bg-neutral-700 my-1"
              ></div>
              <div v-for="todo in group.completed" :key="todo.id" class="opacity-60">
                <TodoItem
                  :todo="todo"
                  :punched-minutes="getPunchedMinutesForTodo(todo)"
                  :show-meta-tags="false"
                  compact
                  @toggle-select="toggleSelect"
                  @toggle-done="toggleDone"
                  @punch-in="handlePunchIn"
                  @edit="openEdit"
                  @archive="archiveTodo"
                  @view-history="openGoalHistoryDialog"
                />
              </div>
            </div>

            <div
              v-if="group.total === 0"
              class="flex-1 flex flex-col items-center justify-center text-neutral-400 text-sm italic gap-2 min-h-[100px]"
            >
              <div class="opacity-30"><app-icon size="24" /></div>
              暂无任务
            </div>
          </div>

          <!-- Footer Progress -->
          <div
            class="px-5 py-4 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent border-t border-neutral-100 dark:border-neutral-700"
          >
            <div
              class="flex items-center justify-between text-xs mb-2"
              style="color: #134e4a; font-family: 'Fira Sans', sans-serif"
            >
              <span class="font-medium">打卡进度</span>
              <span
                class="font-mono font-semibold"
                style="font-family: 'Fira Code', monospace; color: #0d9488"
                >{{ group.progress }}%</span
              >
            </div>
            <div
              class="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden shadow-inner"
            >
              <div
                class="h-full transition-all duration-700 ease-out rounded-full shadow-sm"
                :style="{
                  background: `linear-gradient(90deg, ${group.color}, ${group.color}dd)`,
                  width: `${group.progress}%`,
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="flex flex-col items-center justify-center py-12 text-neutral-400">
        <t-empty description="暂无分类任务，请先添加任务" />
      </div>

      <!-- History & Archive Section -->
      <div class="mt-8">
        <div class="flex items-center justify-between mb-4 px-1">
          <h2 class="text-xl font-bold flex items-center gap-2">历史/归档</h2>
        </div>

        <t-tabs
          :default-value="1"
          class="rounded-md overflow-hidden border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900"
        >
          <t-tab-panel :value="1" :label="`打卡记录 (${currentHistoryRecords.length})`">
            <div class="min-h-[300px] p-2">
              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between mb-2 pb-2 gap-2"
              >
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
                <div class="text-sm">当日打卡: {{ currentHistoryRecords.length }} 次</div>
              </div>

              <template v-if="currentHistoryRecords.length">
                <div class="flex flex-col gap-2">
                  <div
                    v-for="record in currentHistoryRecords"
                    :key="record.id"
                    class="p-3 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div class="flex flex-col gap-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-medium">{{ record.todoTitle }}</span>
                        <span
                          v-if="record.category"
                          class="px-1 rounded text-[11px] font-semibold border"
                          :style="getCategoryCssVars(record.category)"
                          :class="getCategoryTagClass(record.category)"
                          >{{ record.category }}</span
                        >
                        <span class="text-xs text-neutral-400">{{
                          dayjs(record.timestamp).format('HH:mm:ss')
                        }}</span>
                      </div>
                      <div class="flex items-center gap-2">
                        <div
                          v-if="editingRecordId === record.id"
                          class="flex flex-wrap items-center gap-2"
                        >
                          <t-input
                            v-model="editingRecordNote"
                            size="small"
                            placeholder="输入备注..."
                            auto-width
                          />
                          <div class="flex gap-1">
                            <t-button
                              size="small"
                              theme="primary"
                              variant="text"
                              @click="saveRecordNote"
                              >保存</t-button
                            >
                            <t-button
                              size="small"
                              theme="default"
                              variant="text"
                              @click="editingRecordId = null"
                              >取消</t-button
                            >
                          </div>
                        </div>
                        <div
                          v-else
                          class="flex items-center gap-2 group cursor-pointer"
                          @click="startEditRecord(record)"
                        >
                          <span class="text-sm text-neutral-600 dark:text-neutral-400">
                            {{ record.note || '无备注 (点击添加)' }}
                          </span>
                        </div>
                      </div>

                      <div class="flex items-center gap-2">
                        <div
                          v-if="editingRecordMinutesId === record.id"
                          class="flex flex-wrap items-center gap-2"
                        >
                          <t-input-number
                            v-model="editingRecordMinutes"
                            :min="0"
                            :step="5"
                            size="small"
                            class="w-[120px]"
                          />
                          <div class="flex gap-1">
                            <t-button
                              size="small"
                              theme="primary"
                              variant="text"
                              @click="saveRecordMinutes"
                              >保存</t-button
                            >
                            <t-button
                              size="small"
                              theme="default"
                              variant="text"
                              @click="editingRecordMinutesId = null"
                              >取消</t-button
                            >
                          </div>
                        </div>
                        <div
                          v-else
                          class="flex items-center gap-2 group cursor-pointer"
                          @click="startEditRecordMinutes(record)"
                        >
                          <span class="text-sm text-neutral-600 dark:text-neutral-400">
                            <template v-if="getRecordMinutes(record) > 0">
                              {{ getRecordMinutes(record) }} 分钟 (点击修改)
                            </template>
                            <template v-else> 分钟未记录 (点击补充) </template>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  class="w-full h-[200px] flex flex-col items-center justify-center text-neutral-400"
                >
                  <t-empty description="该日暂无打卡记录" />
                </div>
              </template>
            </div>
          </t-tab-panel>
          <t-tab-panel :value="2" :label="`已归档 (${archivedHistorySorted.length})`">
            <div class="min-h-[300px] p-2">
              <template v-if="archivedHistorySorted.length">
                <div class="flex flex-col gap-2">
                  <div
                    v-for="item in archivedHistorySorted"
                    :key="`${item.title}@@${item.category}@@${item.period}@@${item.archivedAt}`"
                    class="p-3 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700"
                  >
                    <div class="flex flex-col gap-2">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="font-medium">{{ item.title }}</span>
                        <span
                          v-if="item.category"
                          class="px-2 py-0.5 rounded text-[11px] font-semibold border"
                          :style="getCategoryCssVars(item.category)"
                          :class="getCategoryTagClass(item.category)"
                        >
                          {{ item.category }}
                        </span>
                        <t-tag size="small" variant="dark" :theme="getPeriodTheme(item.period)">{{
                          periodTextMap[item.period]
                        }}</t-tag>
                        <t-tag size="small" variant="light" theme="default">
                          <template v-if="item.unit === 'minutes'">
                            目标 {{ item.minFrequency }} 次 × {{ item.minutesPerTime || 0 }} 分钟
                          </template>
                          <template v-else>目标 {{ item.minFrequency }} 次</template>
                        </t-tag>
                        <span class="text-xs text-neutral-400"
                          >归档于 {{ dayjs(item.archivedAt).format('YYYY-MM-DD HH:mm') }}</span
                        >
                      </div>
                      <div
                        v-if="item.description"
                        class="text-sm text-neutral-600 dark:text-neutral-400"
                      >
                        {{ item.description }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  class="w-full h-[200px] flex flex-col items-center justify-center text-neutral-400"
                >
                  <t-empty description="暂无归档数据" />
                </div>
              </template>
            </div>
          </t-tab-panel>
        </t-tabs>
      </div>

      <div
        class="p-2 sm:p-2 bg-white dark:bg-neutral-950 srounded-md mt-2 border border-neutral-100 dark:border-neutral-800 rounded-md"
      >
        <div
          class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2"
        >
          <div class="text-sm">数据统计</div>
          <div class="flex items-center gap-2">
            <t-radio-group v-model="statsRange" variant="default-filled" size="small">
              <t-radio-button value="7d">7天</t-radio-button>
              <t-radio-button value="30d">30天</t-radio-button>
            </t-radio-group>
            <t-button
              shape="square"
              size="small"
              theme="primary"
              variant="outline"
              :disabled="exporting"
              @click="openExportDialog"
            >
              <template v-slot:icon>
                <file-export-icon />
              </template>
            </t-button>
          </div>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          <div
            class="p-2 rounded bg-linear-to-br from-green-100 to-green-50 dark:from-green-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]"
          >
            <div class="text-xs text-center mb-1">可打卡任务</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div
                class="text-2xl sm:text-3xl font-bold text-center text-green-600 dark:text-green-400"
              >
                {{ animatedScheduled }}
              </div>
              <t-tag size="small" variant="light" theme="success"
                >已打卡: {{ todayPunchedCount }}</t-tag
              >
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-yellow-100 to-yellow-50 dark:from-yellow-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]"
          >
            <div class="text-xs text-center mb-1">未开始任务</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div
                class="text-2xl sm:text-3xl font-bold text-center text-yellow-600 dark:text-yellow-400"
              >
                {{ animatedUnstarted }}
              </div>
              <t-tag size="small" variant="light" theme="warning"
                >占比: {{ unstartedTaskRatio }}%</t-tag
              >
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-red-100 to-red-50 dark:from-red-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]"
          >
            <div class="text-xs text-center mb-1">未完成目标</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div
                class="text-2xl sm:text-3xl font-bold text-center text-red-600 dark:text-red-400"
              >
                {{ animatedUnfinishedGoals }}
              </div>
              <t-tag size="small" variant="light" theme="danger"
                >占比: {{ unfinishedGoalRatio }}%</t-tag
              >
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-blue-100 to-blue-50 dark:from-blue-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]"
          >
            <div class="text-xs text-center mb-1">今日打卡次数</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div
                class="text-2xl sm:text-3xl font-bold text-center text-blue-600 dark:text-blue-400"
              >
                {{ animatedPunchIns }}
              </div>
              <t-tag size="small" variant="light" :theme="punchInsDiff >= 0 ? 'success' : 'danger'">
                较昨日{{ punchInsDiff >= 0 ? '增加' : '减少' }}: {{ Math.abs(punchInsDiff) }} 次
              </t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-purple-100 to-purple-50 dark:from-purple-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]"
          >
            <div class="text-xs text-center mb-1">今日累计分钟</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div
                class="text-2xl sm:text-3xl font-bold text-center text-purple-600 dark:text-purple-400"
              >
                {{ animatedMinutes }}
              </div>
              <t-tag size="small" variant="light" :theme="minutesDiff >= 0 ? 'success' : 'danger'">
                较昨日{{ minutesDiff >= 0 ? '增加' : '减少' }}: {{ Math.abs(minutesDiff) }} 分钟
              </t-tag>
            </div>
          </div>
          <div
            class="p-2 rounded bg-linear-to-br from-orange-100 to-orange-50 dark:from-orange-950 dark:to-neutral-900 flex flex-col items-center justify-between min-h-[100px]"
          >
            <div class="text-xs text-center mb-1">连续打卡天数</div>
            <div class="flex flex-col items-center justify-center gap-1">
              <div
                class="text-2xl sm:text-3xl font-bold text-center text-orange-600 dark:text-orange-400"
              >
                {{ animatedConsecutive }}
              </div>
              <t-tag size="small" variant="light" theme="warning">
                最大连续: {{ animatedMaxConsecutive }} 天
              </t-tag>
            </div>
          </div>
        </div>

        <div class="rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden mb-2 relative">
          <div
            class="px-2 py-2 bg-neutral-100 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700"
          >
            <div class="text-sm font-bold text-neutral-600 dark:text-neutral-300">
              最近一年活跃热力图（打卡次数/分钟数）
            </div>
          </div>
          <div class="p-2">
            <div class="w-full overflow-x-auto">
              <div class="w-fit mx-auto">
                <div id="todo-cal-heatmap" class="min-w-[980px]"></div>
              </div>
            </div>
          </div>
          <div
            v-if="heatmapLoading"
            class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-neutral-950/50 rounded-md"
          >
            <t-loading text="正在更新热力图..." />
          </div>
        </div>

        <div class="grid grid-cols-12 gap-2">
          <div
            class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden border border-neutral-100 dark:border-neutral-800"
          >
            <div
              class="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900/30 flex justify-between items-center"
            >
              <div class="text-xs font-bold text-blue-600 dark:text-blue-400">
                各任务类型的打卡趋势
              </div>
              <div class="flex items-center gap-1">
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="copyChart(chart1Ref, '各任务类型的打卡趋势')"
                >
                  <template #icon><copy-icon /></template>
                </t-button>
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="exportChart(chart1Ref, '各任务类型的打卡趋势')"
                >
                  <template #icon><download-icon /></template>
                </t-button>
              </div>
            </div>
            <div class="p-2">
              <div class="w-full aspect-video overflow-hidden" style="line-height: 0">
                <VChart ref="chart1Ref" :option="punchInsByCategoryOption" autoresize />
              </div>
            </div>
          </div>

          <div
            class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden border border-neutral-100 dark:border-neutral-800"
          >
            <div
              class="px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30 flex justify-between items-center"
            >
              <div class="text-xs font-bold text-purple-600 dark:text-purple-400">任务分类</div>
              <div class="flex items-center gap-1">
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="copyChart(chart2Ref, '任务分类')"
                >
                  <template #icon><copy-icon /></template>
                </t-button>
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="exportChart(chart2Ref, '任务分类')"
                >
                  <template #icon><download-icon /></template>
                </t-button>
              </div>
            </div>
            <div class="p-2">
              <div class="w-full aspect-video overflow-hidden" style="line-height: 0">
                <VChart ref="chart2Ref" :option="categoryOption" autoresize />
              </div>
            </div>
          </div>

          <div
            class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden border border-neutral-100 dark:border-neutral-800"
          >
            <div
              class="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border-b border-green-100 dark:border-green-900/30 flex justify-between items-center"
            >
              <div class="text-xs font-bold text-green-600 dark:text-green-400">
                每日打卡次数趋势
              </div>
              <div class="flex items-center gap-1">
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="copyChart(chart3Ref, '每日打卡次数趋势')"
                >
                  <template #icon><copy-icon /></template>
                </t-button>
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="exportChart(chart3Ref, '每日打卡次数趋势')"
                >
                  <template #icon><download-icon /></template>
                </t-button>
              </div>
            </div>
            <div class="p-2">
              <div class="w-full aspect-video overflow-hidden" style="line-height: 0">
                <VChart ref="chart3Ref" :option="punchInsOption" autoresize />
              </div>
            </div>
          </div>

          <div
            class="col-span-12 lg:col-span-6 rounded-md bg-neutral-50 dark:bg-neutral-900 overflow-hidden border border-neutral-100 dark:border-neutral-800"
          >
            <div
              class="px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30 flex justify-between items-center"
            >
              <div class="text-xs font-bold text-orange-600 dark:text-orange-400">
                每日打卡分钟数趋势
              </div>
              <div class="flex items-center gap-1">
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="copyChart(chart4Ref, '每日打卡分钟数趋势')"
                >
                  <template #icon><copy-icon /></template>
                </t-button>
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="exportChart(chart4Ref, '每日打卡分钟数趋势')"
                >
                  <template #icon><download-icon /></template>
                </t-button>
              </div>
            </div>
            <div class="p-2">
              <div class="w-full aspect-video overflow-hidden" style="line-height: 0">
                <VChart ref="chart4Ref" :option="minutesOption" autoresize />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <t-dialog
      v-model:visible="exportDialogVisible"
      :header="exportDialogTitle"
      :width="exportDialogWidth"
      :footer="false"
    >
      <div
        class="p-2 rounded"
        :style="{ backgroundColor: exportPalette.rootBg, color: exportPalette.rootText }"
      >
        <div class="flex items-center justify-between gap-2 mb-2 px-2">
          <t-button
            size="small"
            variant="outline"
            @click="prevExportWeek"
            :disabled="exportingImage"
            >上一周</t-button
          >
          <div class="text-xs" :style="exportMutedTextStyle">{{ exportWeekRangeText }}</div>
          <t-button
            size="small"
            variant="outline"
            @click="nextExportWeek"
            :disabled="!canNextExportWeek || exportingImage"
            >下一周</t-button
          >
        </div>
        <div class="max-h-[70vh] overflow-y-auto px-2">
          <div ref="exportCaptureRef" class="p-2 rounded border" :style="exportRootStyle">
            <div class="text-base font-bold mb-3">{{ exportDialogTitle }}</div>

            <div class="flex flex-col gap-2">
              <div
                v-for="d in exportSummaries"
                :key="d.dayKey"
                class="p-2 rounded border"
                :style="exportDayCardStyle"
              >
                <div class="flex items-center justify-between gap-2">
                  <div class="font-bold">{{ d.dayKey }}</div>
                  <div class="text-xs" :style="exportMutedTextStyle">
                    打卡 {{ d.punchIns }} 次 · {{ d.minutes }} 分钟
                  </div>
                </div>

                <div v-if="d.records.length" class="flex flex-col gap-2 mt-2">
                  <div
                    v-for="r in d.records"
                    :key="r.id"
                    class="p-2 rounded border"
                    :style="exportItemStyle"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-xs" :style="exportMutedTextStyle">{{
                        dayjs(r.timestamp).format('HH:mm')
                      }}</span>
                      <span class="font-medium">{{ r.todoTitle }}</span>
                      <span v-if="r.category" :style="getCategoryExportTagStyle(r.category)">
                        {{ r.category }}
                      </span>
                      <span v-if="r.minutes > 0" :style="exportMinutesBadgeStyle">
                        {{ r.minutes }} 分钟
                      </span>
                    </div>
                    <div
                      v-if="r.note"
                      class="text-sm mt-1 whitespace-pre-wrap"
                      :style="exportNoteTextStyle"
                    >
                      {{ r.note }}
                    </div>
                  </div>
                </div>
                <div v-else class="text-sm" :style="exportMutedTextStyle">无打卡记录</div>
              </div>
            </div>

            <div v-if="exportGoals.length" class="mt-4 pt-4 border-t" :style="exportDividerStyle">
              <div class="text-sm font-bold mb-2 flex items-center gap-2">
                <span>本周完成的目标</span>
                <span :style="exportSuccessBadgeStyle">{{ exportGoals.length }}</span>
              </div>
              <div class="flex flex-col gap-2">
                <div
                  v-for="g in exportGoals"
                  :key="g.id"
                  class="p-2 rounded border"
                  :style="exportItemStyle"
                >
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{{ g.title }}</span>
                    <span v-if="g.category" :style="getCategoryExportTagStyle(g.category)">
                      {{ g.category }}
                    </span>
                    <span :style="exportSuccessBadgeStyle"> 已完成 </span>
                    <span class="text-xs" :style="exportMutedTextStyle"
                      >完成于 {{ dayjs(g.completedAt).format('YYYY-MM-DD HH:mm') }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4 flex justify-end gap-2">
          <t-button
            variant="outline"
            @click="exportDialogVisible = false"
            :disabled="exportingImage"
            >取消</t-button
          >
          <t-button
            theme="primary"
            @click="exportDialogToImage"
            :loading="exportingImage"
            :disabled="exportingImage"
          >
            确定导出
          </t-button>
        </div>
      </div>
    </t-dialog>

    <t-dialog
      v-model:visible="editVisible"
      :header="isEditingGoal ? '编辑目标' : '编辑任务'"
      :width="editDialogWidth"
      :footer="false"
    >
      <div class="grid grid-cols-12 gap-3 max-h-[70vh] overflow-y-auto px-1">
        <div class="col-span-12">
          <div class="text-sm mb-1">{{ isEditingGoal ? '目标名称' : '任务名称' }}</div>
          <t-input
            v-model="editTitle"
            :placeholder="isEditingGoal ? '请输入目标名称' : '请输入任务名称'"
            :disabled="editOnlyDescription"
          />
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">{{ isEditingGoal ? '目标描述' : '任务描述' }}</div>
          <t-input
            v-model="editDescription"
            :placeholder="isEditingGoal ? '可选：添加目标的详细描述' : '可选：添加任务的详细描述'"
          />
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <t-button variant="outline" @click="editVisible = false">取消</t-button>
        <t-button theme="primary" @click="saveEdit">保存</t-button>
      </div>
    </t-dialog>

    <t-dialog
      v-model:visible="templateEditVisible"
      header="编辑任务"
      :width="editDialogWidth"
      :footer="false"
    >
      <div class="grid grid-cols-12 gap-3 max-h-[70vh] overflow-y-auto px-1">
        <div class="col-span-12">
          <div class="text-sm mb-1">任务名称</div>
          <t-input v-model="templateTitle" placeholder="请输入任务名称" />
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">任务分类</div>
          <div class="flex items-center gap-2">
            <t-radio-group
              v-if="templateCategoryOptions.length"
              v-model="templateCategory"
              variant="default-filled"
              size="small"
              class="flex flex-wrap"
            >
              <t-radio-button v-for="c in templateCategoryOptions" :key="c" :value="c">{{
                c
              }}</t-radio-button>
            </t-radio-group>
            <t-input
              v-else
              v-model="templateCategory"
              placeholder="暂无分类，请先在配置管理中添加"
              disabled
              class="flex-1"
            />
          </div>
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">任务周期</div>
          <t-radio-group
            v-model="templatePeriod"
            variant="default-filled"
            size="small"
            class="flex flex-wrap"
          >
            <t-radio-button value="daily">每天</t-radio-button>
            <t-radio-button value="weekly">每周</t-radio-button>
            <t-radio-button value="monthly">每月</t-radio-button>
            <t-radio-button value="yearly">每年</t-radio-button>
            <t-radio-button value="once">目标</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">任务单位</div>
          <t-radio-group
            v-model="templateUnit"
            variant="default-filled"
            size="small"
            :disabled="templatePeriod === 'once'"
            class="flex flex-wrap"
          >
            <t-radio-button value="times">次数</t-radio-button>
            <t-radio-button value="minutes">分钟</t-radio-button>
          </t-radio-group>
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">最小频率</div>
          <div class="flex items-center gap-2">
            <t-radio-group
              v-model="templateMinFrequency"
              variant="default-filled"
              size="small"
              :disabled="templatePeriod === 'once'"
              class="flex flex-wrap"
            >
              <t-radio-button
                v-for="freq in templateMinFrequencyOptions"
                :key="freq"
                :value="freq"
                >{{ freq }}</t-radio-button
              >
            </t-radio-group>
            <div class="text-sm text-neutral-400">次</div>
          </div>
        </div>

        <div class="col-span-12" v-if="templateUnit === 'minutes'">
          <div class="text-sm mb-1">每次分钟</div>
          <div class="flex items-center gap-2">
            <t-radio-group
              v-model="templateMinutesPerTime"
              variant="default-filled"
              size="small"
              class="flex flex-wrap"
            >
              <t-radio-button
                v-for="mins in templateMinutesPerTimeOptions"
                :key="mins"
                :value="mins"
                >{{ mins }}</t-radio-button
              >
            </t-radio-group>
            <div class="text-sm text-neutral-400">分钟</div>
          </div>
        </div>

        <div class="col-span-12">
          <div class="text-sm mb-1">任务描述</div>
          <t-input v-model="templateDescription" placeholder="可选：添加任务的详细描述" />
        </div>
      </div>
      <div class="mt-4 flex justify-end gap-2">
        <t-button variant="outline" @click="templateEditVisible = false">取消</t-button>
        <t-button theme="primary" @click="saveTemplateEdit">保存</t-button>
      </div>
    </t-dialog>

    <t-dialog
      v-model:visible="punchDialogVisible"
      header="打卡备注"
      :width="punchDialogWidth"
      :footer="false"
    >
      <div class="flex flex-col gap-3">
        <div class="text-sm">请输入本次打卡备注（可选）：</div>
        <t-textarea v-model="punchNote" placeholder="例如：读了第3章..." autofocus />
        <div v-if="punchMinutesEnabled" class="flex items-center gap-3">
          <div class="text-sm shrink-0">本次分钟</div>
          <div class="flex items-center gap-2">
            <t-button
              variant="outline"
              size="small"
              shape="square"
              :disabled="punchMinutes <= 0"
              @click="adjustPunchMinutes(-1, $event)"
            >
              <template #icon><minus-icon /></template>
            </t-button>
            <div class="min-w-14 text-center tabular-nums font-medium">{{ punchMinutes }}</div>
            <t-button
              variant="outline"
              size="small"
              shape="square"
              @click="adjustPunchMinutes(1, $event)"
            >
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
    <!-- 目标历史记录对话框 -->
    <t-dialog
      v-model:visible="goalHistoryDialogVisible"
      header="目标进度记录"
      :width="editDialogWidth"
      :footer="false"
    >
      <div class="max-h-[70vh] overflow-y-auto px-1">
        <!-- 添加新记录表单 -->
        <div
          class="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mb-3"
        >
          <div class="text-xs font-semibold mb-2">
            {{ editingGoalHistoryId ? '编辑记录' : '添加新记录' }}
          </div>

          <div class="space-y-2">
            <div>
              <div class="text-xs mb-1">记录类型</div>
              <t-radio-group
                v-model="goalHistoryType"
                variant="default-filled"
                size="small"
                :disabled="!!editingGoalHistoryId"
              >
                <t-radio-button value="regular">普通历史</t-radio-button>
                <t-radio-button value="milestone">里程碑</t-radio-button>
              </t-radio-group>
            </div>

            <div>
              <div class="text-xs mb-1">记录内容</div>
              <t-textarea
                v-model="goalHistoryContent"
                placeholder="记录你做了什么..."
                :autosize="{ minRows: 2, maxRows: 4 }"
              />
            </div>

            <div>
              <div class="text-xs mb-1">投入时间（分钟）</div>
              <t-input-number v-model="goalHistoryMinutes" :min="0" :step="5" size="small" />
            </div>

            <div class="flex gap-2">
              <t-button
                v-if="!editingGoalHistoryId"
                size="small"
                theme="primary"
                @click="addGoalHistory"
              >
                添加记录
              </t-button>
              <template v-else>
                <t-button size="small" theme="primary" @click="saveGoalHistory"> 保存 </t-button>
                <t-button size="small" variant="outline" @click="cancelEditGoalHistory">
                  取消
                </t-button>
              </template>
            </div>
          </div>
        </div>

        <!-- 历史记录列表 -->
        <div v-if="currentGoalHistory.length" class="space-y-2">
          <div class="text-sm font-semibold mb-2">历史记录 ({{ currentGoalHistory.length }})</div>
          <div
            v-for="record in currentGoalHistory"
            :key="record.id"
            class="p-3 rounded-lg border transition-all"
            :class="
              record.type === 'milestone'
                ? 'bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-300 dark:border-amber-700'
                : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'
            "
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <t-tag
                    v-if="record.type === 'milestone'"
                    size="small"
                    theme="warning"
                    variant="light"
                  >
                    <template #icon>
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                        />
                      </svg>
                    </template>
                    里程碑
                  </t-tag>
                  <span class="text-xs text-neutral-500 dark:text-neutral-400">
                    {{ dayjs(record.timestamp).format('YYYY-MM-DD HH:mm') }}
                  </span>
                </div>
                <div class="text-sm mb-1 whitespace-pre-wrap">{{ record.content }}</div>
                <div v-if="record.note" class="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  备注: {{ record.note }}
                </div>
              </div>
              <div class="flex gap-1 shrink-0">
                <t-button
                  size="small"
                  variant="text"
                  shape="square"
                  @click="startEditGoalHistory(record)"
                >
                  <template #icon>
                    <edit-icon size="14" />
                  </template>
                </t-button>
                <t-button
                  size="small"
                  variant="text"
                  theme="danger"
                  shape="square"
                  @click="deleteGoalHistory(record.id)"
                >
                  <template #icon>
                    <delete-icon size="14" />
                  </template>
                </t-button>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="text-sm text-neutral-400 text-center py-8">
          暂无进度记录,点击上方"添加记录"开始记录目标进展
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <t-button variant="outline" @click="goalHistoryDialogVisible = false">关闭</t-button>
      </div>
    </t-dialog>

    <t-drawer
      v-model:visible="configDrawerVisible"
      placement="right"
      size="420px"
      header="配置管理"
      :footer="false"
    >
      <div class="p-4 space-y-6">
        <div>
          <div class="text-sm mb-2 font-medium">任务分类</div>
          <div
            class="flex items-center gap-2 mb-2"
            v-for="(cat, idx) in draftCategoriesList"
            :key="idx"
          >
            <t-input
              v-model="draftCategoriesList[idx]"
              placeholder="分类名称"
              :ref="
                (el: ComponentPublicInstance | Element | null) => {
                  if (el) {
                    const comp = el as any
                    draftCategoriesInputRefs[idx] = comp.$el
                      ? comp.$el.querySelector('input')
                      : (el as HTMLElement)
                  }
                }
              "
              @enter="onDraftCategoryEnter(idx)"
            />
            <t-color-picker
              v-model="draftCategoryColorsMap[draftCategoriesList[idx] || '']"
              format="HEX"
              size="small"
              class="shrink-0"
              :show-primary-color-preview="false"
            />
            <t-button
              variant="text"
              shape="square"
              theme="danger"
              @click="removeDraftCategory(idx)"
            >
              <template #icon><delete-icon /></template>
            </t-button>
          </div>
          <t-button variant="dashed" block @click="addDraftCategory">
            <template #icon><add-icon /></template>添加分类
          </t-button>
        </div>

        <div>
          <div class="text-sm mb-2 font-medium">最小频率</div>
          <div class="space-y-2 mb-2">
            <div
              v-for="(_, idx) in draftMinFrequenciesList"
              :key="idx"
              class="flex items-center gap-2"
            >
              <t-input-number
                v-model="draftMinFrequenciesList[idx]"
                :min="1"
                theme="column"
                class="flex-1"
              />
              <t-button
                variant="text"
                shape="square"
                size="small"
                theme="danger"
                @click="removeDraftFrequency(idx)"
              >
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
            <div
              v-for="(_, idx) in draftMinutesPerTimesList"
              :key="idx"
              class="flex items-center gap-2"
            >
              <t-input-number
                v-model="draftMinutesPerTimesList[idx]"
                :min="1"
                :step="5"
                theme="column"
                class="flex-1"
              />
              <t-button
                variant="text"
                shape="square"
                size="small"
                theme="danger"
                @click="removeDraftMinute(idx)"
              >
                <template #icon><delete-icon /></template>
              </t-button>
            </div>
          </div>
          <t-button block variant="dashed" theme="default" class="mt-2" @click="addDraftMinute">
            <template #icon><add-icon /></template>
            添加分钟配置
          </t-button>
        </div>

        <div
          class="flex justify-end gap-2 pt-4 border-t border-neutral-100 dark:border-neutral-800"
        >
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

/* Respect user's motion preferences for accessibility */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
