<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onUnmounted,
  nextTick,
  type ComponentPublicInstance,
  type Component,
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
  type UiConfig,
} from './useTodoStore'
import {
  AddIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SettingIcon,
  DeleteIcon,
  EditIcon,
  FileExportIcon,
  DownloadIcon,
  MinusIcon,
  AppIcon,
  CopyIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  MoneyIcon,
  UserIcon,
  HeartIcon,
  StarIcon,
  RootListIcon,
  TaskIcon,
  FingerprintIcon,
  CheckCircleIcon,
  ImageIcon,
  HistoryIcon,
  BrowseIcon,
} from 'tdesign-icons-vue-next'
import WallpaperDialog from './components/WallpaperDialog.vue'
import dayjs from 'dayjs'
import { useNumberAnimation } from '@/composables/useNumberAnimation'
import confetti from 'canvas-confetti'
import { snapdom } from '@zumer/snapdom'
import { useDark, useDebounceFn } from '@vueuse/core'
import { supabase } from '@/lib/supabaseClient'
import {
  isPlatformAuthenticatorAvailable,
  registerCredential,
  verifyCredential,
} from './webauthnUtils'

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

// Loading state for page initialization
const pageLoading = ref(true)
const loadingProgress = ref(0)
const loadingMessage = ref('正在初始化...')

// Authentication state
const isAuthenticated = ref(false)
const authDialogVisible = ref(false)
const authPassword = ref('')
const authPasswordRef = ref()

// Loading states for async operations
const isAddingTodo = ref(false)
const isSavingEdit = ref(false)
const isPunchingIn = ref(false)
const isAddingGoalHistory = ref(false) // 添加目标历史记录时的loading状态

// Wallpaper
const wallpaperDialogVisible = ref(false)
const currentWallpaper = ref(localStorage.getItem('todo_wallpaper') || '')
const wallpaperHistory = ref<string[]>([])
const isWallpaperPreview = ref(false)

const loadWallpaperHistory = () => {
  try {
    const history = localStorage.getItem('todo_wallpaper_history')
    if (history) {
      wallpaperHistory.value = JSON.parse(history)
    }
  } catch (e) {
    console.error('Failed to load wallpaper history', e)
  }
}

const randomWallpaper = () => {
  if (wallpaperHistory.value.length === 0) return
  const current = currentWallpaper.value
  let next = current
  // Try to find a different one
  if (wallpaperHistory.value.length > 1) {
    while (next === current) {
      const idx = Math.floor(Math.random() * wallpaperHistory.value.length)
      const val = wallpaperHistory.value[idx]
      if (val) next = val
    }
  } else {
    const val = wallpaperHistory.value[0]
    if (val) next = val
  }
  handleWallpaperUpdate(next)
  MessagePlugin.success('已切换壁纸')
}

onMounted(() => {
  loadWallpaperHistory()
})

const wallpaperStyle = computed(() => {
  if (!currentWallpaper.value) return {}
  return {
    backgroundImage: `url("${currentWallpaper.value}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
  }
})

const handleWallpaperUpdate = (url: string) => {
  try {
    localStorage.setItem('todo_wallpaper', url)
    currentWallpaper.value = url
    if (!url) {
      localStorage.removeItem('todo_wallpaper')
    }
  } catch (e) {
    console.error('Failed to save wallpaper', e)
    MessagePlugin.error('图片太大，无法保存到本地存储，请尝试更小的图片')
    // Reset if failed
    currentWallpaper.value = localStorage.getItem('todo_wallpaper') || ''
  }
}

watch(
  () => authDialogVisible.value,
  (val) => {
    if (val) {
      // 使用setTimeout确保对话框完全渲染后再聚焦
      setTimeout(() => {
        authPasswordRef.value?.focus()
      }, 100)
    }
  },
)
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

/**
 * Mark a todo as complete in Supabase
 */
const markTodoCompleteInSupabase = async (id: string, done: boolean) => {
  try {
    const todo = getTodoById(id)
    if (!todo) return false

    // 只有目标任务需要更新模板状态
    if (todo.period === 'once') {
      const updates: { done: boolean; completed_at: number | null } = {
        done,
        completed_at: done ? Date.now() : null,
      }

      const { error } = await supabase.from('todo_templates').update(updates).eq('id', id)

      if (error) {
        console.error('Failed to mark goal complete in Supabase:', error)
        MessagePlugin.error('更新目标状态失败')
        return false
      }
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

/**
 * Generate a todo from a template using server-first approach
 * This ensures all auto-generated todos have proper UUIDs from the database
 */

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
  // 对于目标任务，从goalHistoryRecords的inputTime字段中获取投入时间
  if (todo.period === 'once') {
    const records = goalHistoryRecords.value.filter((r) => r.goalId === todo.id)
    if (!records.length) return undefined

    // 累加所有历史记录中的投入时间（从input_time字段）
    return records.reduce((sum, r) => {
      const minutes = typeof r.inputTime === 'number' ? r.inputTime : 0
      return sum + minutes
    }, 0)
  }

  // 非目标任务，从punchRecords中获取
  if (todo.unit !== 'minutes') return undefined

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

const confirmPunch = async () => {
  if (isPunchingIn.value) return
  if (!currentPunchId.value) return

  // Pass minutes if enabled and valid
  const minutes = punchMinutesEnabled.value ? punchMinutes.value : undefined
  const prep = preparePunch(currentPunchId.value, punchNote.value, minutes)

  if (prep.kind === 'not_found' || prep.kind === 'too_frequent') {
    if (prep.kind === 'too_frequent') MessagePlugin.warning('打卡太频繁，请稍后再试')
    punchDialogVisible.value = false
    return
  }

  isPunchingIn.value = true

  try {
    if (prep.kind === 'update_note' && prep.recordId) {
      // Server-first for update
      const { error } = await supabase
        .from('todo_punch_records')
        .update({ note: punchNote.value })
        .eq('id', prep.recordId)

      if (!error) {
        updatePunchRecordNote(prep.recordId!, punchNote.value)
        MessagePlugin.success('备注已更新')
        punchDialogVisible.value = false
      } else {
        throw error
      }
      return
    }

    if (prep.kind === 'ok' && prep.record) {
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

      const { data, error } = await supabase
        .from('todo_punch_records')
        .insert(dbRecord)
        .select()
        .single()

      if (error) {
        console.error('Punch failed', error)
        MessagePlugin.error('打卡失败')
        return
      }

      if (data) {
        // Success!
        // data has the real ID
        prep.record.id = data.id
        addPunchRecordDirectly(prep.record)

        // Close dialog ONLY after success
        punchDialogVisible.value = false

        // 播放 Rainbow 碎纸屑效果
        const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fb923c', '#facc15', '#22c55e']
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: colors,
        })

        MessagePlugin.success('打卡成功')

        // Reset form inputs (optional but good practice)
        punchNote.value = ''
        punchMinutes.value = 15
      }
    }
  } catch (err) {
    console.error('Punch error:', err)
    MessagePlugin.error('操作异常，请重试')
  } finally {
    isPunchingIn.value = false
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
  // Prioritize the actual minutesPerTime value from the record
  if (typeof record.minutesPerTime === 'number' && record.minutesPerTime > 0) {
    return record.minutesPerTime
  }

  // Fallback to template settings if record has no minutesPerTime
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
const isSavingConfig = ref(false)
const configDrawerVisible = ref(false)
const draftCategoriesList = ref<string[]>([])
const draftCategoriesInputRefs = ref<HTMLElement[]>([])
const draftMinFrequenciesList = ref<number[]>([])
const draftMinutesPerTimesList = ref<number[]>([])
const draftCategoryColorsMap = ref<Record<string, string>>({})
const iconMap: Record<string, Component> = {
  'app-icon': AppIcon,
  'calendar-icon': CalendarIcon,
  'chart-icon': ChartIcon,
  'money-icon': MoneyIcon,
  'user-icon': UserIcon,
  'book-icon': BookIcon,
  'heart-icon': HeartIcon,
  'star-icon': StarIcon,
  'root-list-icon': RootListIcon,
  'task-icon': TaskIcon,
}

const availableIcons = [
  { name: '应用', icon: 'app-icon' },
  { name: '日历', icon: 'calendar-icon' },
  { name: '图表', icon: 'chart-icon' },
  { name: '金钱', icon: 'money-icon' },
  { name: '用户', icon: 'user-icon' },
  { name: '书籍', icon: 'book-icon' },
  { name: '心形', icon: 'heart-icon' },
  { name: '星形', icon: 'star-icon' },
  { name: '列表', icon: 'root-list-icon' },
  { name: '任务', icon: 'task-icon' },
]

const categoryEditDialogVisible = ref(false)
const editingCategory = ref({
  name: '',
  color: '#0d9488',
  icon: 'app-icon',
})

const openCategoryEdit = (group: { name: string; color: string; icon: string }) => {
  editingCategory.value = {
    name: group.name,
    color: group.color || '#0d9488',
    icon: group.icon || 'app-icon',
  }
  categoryEditDialogVisible.value = true
}

const saveCategoryConfig = async () => {
  const name = editingCategory.value.name
  // 防御性：确保嵌套对象存在
  if (!uiConfig.value.categoryColors) uiConfig.value.categoryColors = {}
  if (!uiConfig.value.categoryIcons) uiConfig.value.categoryIcons = {}

  uiConfig.value.categoryColors[name] = editingCategory.value.color
  uiConfig.value.categoryIcons[name] = editingCategory.value.icon

  categoryEditDialogVisible.value = false
  MessagePlugin.success(`分类 "${name}" 配置已更新`)
}

const openConfigDrawer = () => {
  draftCategoriesList.value = [...uiConfig.value.categories]
  draftMinFrequenciesList.value = [...minFrequencyOptions.value]
  draftMinutesPerTimesList.value = [...minutesPerTimeOptions.value]
  draftCategoryColorsMap.value = { ...uiConfig.value.categoryColors }
  configDrawerVisible.value = true
}

const saveUiConfigFromDraft = async () => {
  const cats = draftCategoriesList.value.map((s) => s.trim()).filter(Boolean)
  const freqs = draftMinFrequenciesList.value.filter((n) => typeof n === 'number' && !isNaN(n))
  const mins = draftMinutesPerTimesList.value.filter((n) => typeof n === 'number' && !isNaN(n))

  isSavingConfig.value = true
  try {
    if (cats.length) uiConfig.value.categories = cats
    if (freqs.length) uiConfig.value.minFrequencies = freqs
    if (mins.length) uiConfig.value.minutesPerTimes = mins
    uiConfig.value.categoryColors = { ...draftCategoryColorsMap.value }

    // Force sync immediately
    await saveAppConfigToSupabase('ui_config', uiConfig.value)

    configDrawerVisible.value = false
    MessagePlugin.success('配置已保存')
  } catch (e) {
    console.error(e)
    MessagePlugin.error('保存失败')
  } finally {
    isSavingConfig.value = false
  }
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
  await checkBiometrics()
  try {
    // Step 1: Batch Load Configs (0% -> 20%)
    loadingMessage.value = '加载配置...'
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
          const loaded = configMap.get('ui_config') as UiConfig
          // 确保嵌套对象存在，防止旧数据导致报错
          if (!loaded.categoryColors) loaded.categoryColors = {}
          if (!loaded.categoryIcons) loaded.categoryIcons = {}
          uiConfig.value = { ...uiConfig.value, ...loaded }
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
    loadingProgress.value = 20

    // Step 2: Load Templates (20% -> 40%)
    loadingMessage.value = '加载模板...'
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
        done: template.done || false,
        completedAt: template.completed_at,
      }

      if (existingIdx >= 0) {
        // Update existing
        templates.value[existingIdx] = templateItem
      } else {
        // Add new
        templates.value.push(templateItem)
      }
    }
    loadingProgress.value = 30

    // Step 2.5: Legacy mapping skipped (todos table removed)
    const legacyIdMap = new Map<string, string>()

    loadingProgress.value = 40

    // Step 3: 从模板在内存中生成当天的 todos (40% -> 65%)
    // 不再从数据库加载 todos，而是根据模板直接生成
    loadingMessage.value = '生成今日任务...'

    const todayKey = dayjs().format('YYYY-MM-DD')
    const todayDate = new Date()

    // 计算各周期的起始日期
    const getCycleStartKey = (period: TodoPeriod): string => {
      if (period === 'daily') return todayKey
      if (period === 'weekly') {
        const dayOfWeek = todayDate.getDay()
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        const weekStart = new Date(todayDate)
        weekStart.setDate(todayDate.getDate() - diff)
        return dayjs(weekStart).format('YYYY-MM-DD')
      }
      if (period === 'monthly') {
        return dayjs(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)).format(
          'YYYY-MM-DD',
        )
      }
      if (period === 'yearly') {
        return dayjs(new Date(todayDate.getFullYear(), 0, 1)).format('YYYY-MM-DD')
      }
      return todayKey
    }

    // 清空当前的 todos
    todos.value = []

    // 遍历所有模板，在内存中生成 todos
    for (const template of templates.value) {
      // 跳过已归档的模板
      if (template.archived) continue

      // 目标任务（once）：只显示未完成的
      if (template.period === 'once') {
        if (template.done) continue // 已完成的目标不显示

        const todo: Todo = {
          id: template.id, // 直接使用模板 ID
          title: template.title,
          done: false,
          punchIns: 0, // 后续从打卡记录计算
          category: template.category,
          period: 'once',
          minFrequency: template.minFrequency,
          unit: template.unit,
          minutesPerTime: template.minutesPerTime,
          description: template.description,
          templateId: template.id,
          createdAt: template.createdAt,
          dayKey: todayKey,
          deadline: template.deadline,
        }
        todos.value.push(todo)
        continue
      }

      // 周期任务：根据当前周期生成
      const cycleStartKey = getCycleStartKey(template.period)

      const todo: Todo = {
        id: template.id, // 直接使用模板 ID
        title: template.title,
        done: false, // 后续从打卡记录计算
        punchIns: 0, // 后续从打卡记录计算
        category: template.category,
        period: template.period,
        minFrequency: template.minFrequency,
        unit: template.unit,
        minutesPerTime: template.minutesPerTime,
        description: template.description,
        templateId: template.id,
        createdAt: template.createdAt,
        dayKey: cycleStartKey,
        deadline: template.deadline,
      }
      todos.value.push(todo)
    }

    console.log(
      `✅ Generated ${todos.value.length} todos from ${templates.value.length} templates (in memory)`,
    )
    loadingProgress.value = 65

    // Step 4: Load Punch Records & Day Stats (65% -> 100%)
    loadingMessage.value = '加载打卡记录...'

    // 只加载今年的统计数据
    const yearStartKey = dayjs(todayKey).startOf('year').format('YYYY-MM-DD')
    const { data: statsData } = await supabase
      .from('todo_day_stats')
      .select('*')
      .gte('day_key', yearStartKey)
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
      console.log(`✅ Loaded ${statsData.length} day stats (this year)`)
    }

    // 加载今年的打卡记录(用于图表统计)
    const { data: punchData } = await supabase
      .from('todo_punch_records')
      .select('*')
      .gte('day_key', yearStartKey)
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
      console.log(`✅ Loaded ${punchData.length} punch records (this year)`)
    }

    // 加载所有未完成目标的历史记录（用于显示投入时间）
    // 关键修复：使用 legacyIdMap 来转换 goal_id
    const activeGoalTemplateIds = todos.value
      .filter((t) => t.period === 'once' && !t.done)
      .map((t) => t.id)

    // 我们需要查找：
    // 1. goal_id = templateId (新数据)
    // 2. goal_id = oldId (旧数据，通过 legacyIdMap 查找)

    // 反向映射：templateId -> [oldId1, oldId2...]
    const templateToLegacyIds = new Map<string, string[]>()
    legacyIdMap.forEach((templateId, oldId) => {
      const list = templateToLegacyIds.get(templateId) || []
      list.push(oldId)
      templateToLegacyIds.set(templateId, list)
    })

    // 收集所有可能的 goal_id (包括新的 templateId 和旧的 oldId)
    const allPossibleGoalIds = new Set<string>()
    activeGoalTemplateIds.forEach((tid) => {
      allPossibleGoalIds.add(tid)
      const oldIds = templateToLegacyIds.get(tid)
      if (oldIds) oldIds.forEach((oid) => allPossibleGoalIds.add(oid))
    })

    if (allPossibleGoalIds.size > 0) {
      const { data: goalHistoryData } = await supabase
        .from('todo_goal_history_records')
        .select('*')
        .in('goal_id', Array.from(allPossibleGoalIds))
        .order('timestamp', { ascending: false })

      if (goalHistoryData && goalHistoryData.length > 0) {
        // 加载后需要标准化 goalId 为 templateId
        goalHistoryRecords.value = goalHistoryData.map((r) => {
          // 尝试找到对应的 templateId
          let normalizedGoalId = r.goal_id
          if (legacyIdMap.has(r.goal_id)) {
            normalizedGoalId = legacyIdMap.get(r.goal_id)
          } else if (activeGoalTemplateIds.includes(r.goal_id)) {
            normalizedGoalId = r.goal_id
          }

          return {
            id: r.id,
            goalId: normalizedGoalId!, // 归一化为 Template ID
            content: r.content,
            type: r.type,
            timestamp: r.timestamp,
            note: r.note,
            inputTime: r.input_time || 0,
          }
        })
        console.log(`✅ Loaded ${goalHistoryData.length} goal history records for active goals`)
      } else {
        goalHistoryRecords.value = []
      }
    } else {
      goalHistoryRecords.value = []
      console.log(`✅ No active goals, skipped loading goal history records`)
    }
    loadingProgress.value = 90

    // Step 5: 从打卡记录更新 todo 进度
    loadingMessage.value = '计算任务进度...'

    // 按 todoId 分组统计当天的打卡记录
    for (const todo of todos.value) {
      if (todo.period === 'once') continue // 目标的进度从 goalHistoryRecords 计算

      // 获取当前周期内的打卡记录 (支持旧ID匹配)
      // FIX: 必须过滤时间范围，否则会把历史周期的打卡记录算进来，导致每日任务无法重置
      const cycleStartKey = getTodoCycleStartDayKey(todo.period, todo.dayKey)
      const cycleEndKey = getTodoCycleEndDayKey(todo.period, cycleStartKey)

      const todoRecords = punchRecords.value.filter(
        (r) =>
          (r.todoId === todo.id || legacyIdMap.get(r.todoId) === todo.id) &&
          r.dayKey >= cycleStartKey &&
          r.dayKey <= cycleEndKey,
      )

      if (todoRecords.length > 0) {
        todo.punchIns = todoRecords.length

        // 自动判断是否完成
        if (todo.unit === 'minutes') {
          const totalMinutes = todoRecords.reduce(
            (sum, r) => sum + (typeof r.minutesPerTime === 'number' ? r.minutesPerTime : 0),
            0,
          )
          const targetMinutes = todo.minFrequency * (todo.minutesPerTime || 0)
          todo.done = totalMinutes >= targetMinutes
        } else {
          todo.done = todo.punchIns >= todo.minFrequency
        }

        if (todo.done) {
          const latestRecord = todoRecords[0]
          if (latestRecord) {
            todo.completedAt = latestRecord.timestamp // 最新打卡时间
          }
        }
      }
    }

    console.log(`✅ Updated todo progress from punch records`)
    loadingProgress.value = 100

    // 5. Initialize Sync Watchers
    initSupabaseSyncWatchers()
  } catch (error) {
    console.error('❌ Error during page initialization:', error)
    loadingProgress.value = 100
  } finally {
    // Hide loading overlay after short delay
    setTimeout(async () => {
      pageLoading.value = false

      // Try Biometric Login First
      if (biometricCredId.value) {
        await loginWithBiometrics()
        // If failed or cancelled, show dialog
        if (!isAuthenticated.value) {
          authDialogVisible.value = true
        }
      } else {
        // Show authentication dialog
        authDialogVisible.value = true
      }
    }, 300)
  }
})

// Authentication functions
watch(authPassword, (val) => {
  const envPassword = import.meta.env.VITE_TODO_PASSWORD
  if (val && val === envPassword) {
    verifyAuth()
  }
})

const verifyAuth = () => {
  if (!authPassword.value.trim()) {
    MessagePlugin.warning({ content: '请输入密码' })
    return
  }

  const envPassword = import.meta.env.VITE_TODO_PASSWORD
  if (!envPassword) {
    MessagePlugin.error({ content: '未配置环境变量 VITE_TODO_PASSWORD' })
    return
  }

  if (authPassword.value === envPassword) {
    isAuthenticated.value = true
    authDialogVisible.value = false
    authPassword.value = ''
    MessagePlugin.success({ content: '验证成功' })

    if (isBiometricAvailable.value && !biometricCredId.value) {
      const confirmDialog = DialogPlugin.confirm({
        header: '启用生物识别',
        body: '检测到您的设备支持生物识别（指纹/人脸），是否启用以便下次直接解锁？',
        onConfirm: () => {
          // 先关闭确认对话框
          confirmDialog.hide()
          // 然后启用生物识别
          enableBiometrics()
        },
      })
    }
  } else {
    MessagePlugin.error({ content: '密码错误' })
    authPassword.value = ''
  }
}

// Biometric Auth State
const isBiometricAvailable = ref(false)
const biometricCredId = ref(localStorage.getItem('todo_auth_credential_id') || '')

const checkBiometrics = async () => {
  try {
    isBiometricAvailable.value = await isPlatformAuthenticatorAvailable()
  } catch (e) {
    console.error('Biometric check failed', e)
    isBiometricAvailable.value = false
  }
}

const enableBiometrics = async () => {
  if (!isBiometricAvailable.value) {
    // MessagePlugin.warning('您的设备可能不支持生物识别，尝试强制启用...')
  }
  const credId = await registerCredential('User')
  if (credId) {
    localStorage.setItem('todo_auth_credential_id', credId)
    biometricCredId.value = credId
    MessagePlugin.success('生物识别已启用，下次可直接解锁')
  } else {
    MessagePlugin.error('启用失败')
  }
}

const loginWithBiometrics = async () => {
  if (!biometricCredId.value) return
  const ok = await verifyCredential(biometricCredId.value)
  if (ok) {
    isAuthenticated.value = true
    authDialogVisible.value = false
    authPassword.value = ''
    MessagePlugin.success('验证成功')
  } else {
    MessagePlugin.warning('生物识别验证失败')
  }
}

const categoryOptions = computed(() => uiConfig.value.categories)
// Config options are now imported from store as computed props

const selectedIds = ref<Set<string>>(new Set())

const editVisible = ref(false)
const editingTodoId = ref<string | null>(null)
const editTitle = ref('')
const editDescription = ref('')
// 编辑任务时的模板属性
const editCategory = ref<string>('')
const editPeriod = ref<TodoPeriod>('daily')
const editMinFrequency = ref<number>(1)
const editUnit = ref<TodoUnit>('times')
const editMinutesPerTime = ref<number>(15)

const editingTodo = computed(() => {
  const id = editingTodoId.value
  if (!id) return null
  return getTodoById(id) || null
})

const editOnlyDescription = computed(() => {
  const t = editingTodo.value
  if (!t) return false
  // 目标且已完成，只能编辑描述
  return t.period === 'once' && t.done
})

// 编辑时可用的分类选项
const editCategoryOptions = computed(() => {
  const cats = [...categoryOptions.value]
  const cur = editCategory.value
  if (cur && !cats.includes(cur)) cats.unshift(cur)
  return cats
})

// 编辑时可用的最小频率选项
const editMinFrequencyOptions = computed(() => {
  const opts = [...minFrequencyOptions.value]
  const cur = editMinFrequency.value
  if (typeof cur === 'number' && cur > 0 && !opts.includes(cur)) opts.push(cur)
  return opts.sort((a, b) => a - b)
})

// 编辑时可用的每次分钟选项
const editMinutesPerTimeOptions = computed(() => {
  const opts = [...minutesPerTimeOptions.value]
  const cur = editMinutesPerTime.value
  if (typeof cur === 'number' && cur > 0 && !opts.includes(cur)) opts.push(cur)
  return opts.sort((a, b) => a - b)
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

const viewedGoalTotalMinutes = computed(() => {
  return currentGoalHistory.value.reduce(
    (acc, r) => acc + (typeof r.inputTime === 'number' ? r.inputTime : 0),
    0,
  )
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

  // 如果任务来自模板，加载模板的完整信息以便编辑
  if (todo.templateId) {
    const template = templates.value.find((t) => t.id === todo.templateId)
    if (template) {
      editCategory.value = template.category
      editPeriod.value = template.period
      editMinFrequency.value = template.minFrequency
      editUnit.value = template.unit
      editMinutesPerTime.value = template.minutesPerTime || 15
    }
  } else {
    // 如果不是来自模板，使用任务自身的属性
    editCategory.value = todo.category
    editPeriod.value = todo.period
    editMinFrequency.value = todo.minFrequency
    editUnit.value = todo.unit
    editMinutesPerTime.value = todo.minutesPerTime || 15
  }

  editVisible.value = true
}

const saveEdit = async () => {
  if (isSavingEdit.value) return // Prevent double submission

  const id = editingTodoId.value
  if (!id) return

  const todo = getTodoById(id)
  if (!todo) return

  const isCompletedGoal = todo.period === 'once' && todo.done

  const nextTitle = isCompletedGoal ? todo.title : editTitle.value.trim()

  if (!nextTitle) {
    MessagePlugin.warning('任务标题不能为空')
    return
  }

  // 如果不是已完成的目标，验证分类
  if (!isCompletedGoal && editCategoryOptions.value.length && !editCategory.value) {
    MessagePlugin.warning('请选择任务分类')
    return
  }

  isSavingEdit.value = true

  try {
    // 应用编辑到任务
    const ok = applyTodoEdit(id, {
      title: nextTitle,
      category: isCompletedGoal ? todo.category || '' : editCategory.value,
      period: isCompletedGoal ? todo.period : editPeriod.value,
      minFrequency: isCompletedGoal ? todo.minFrequency : editMinFrequency.value,
      unit: isCompletedGoal ? todo.unit : editUnit.value,
      minutesPerTime: isCompletedGoal ? todo.minutesPerTime || 15 : editMinutesPerTime.value,
      description: editDescription.value.trim() || undefined,
      deadline: todo.deadline,
    })
    if (!ok) return

    // 更新模板到 Supabase (替代原updateTodoInSupabase)
    await updateTemplateInSupabase(id, {
      title: nextTitle,
      category: isCompletedGoal ? todo.category || '' : editCategory.value,
      period: isCompletedGoal ? todo.period : editPeriod.value,
      min_frequency: isCompletedGoal ? todo.minFrequency : editMinFrequency.value,
      unit: isCompletedGoal ? todo.unit : editUnit.value,
      minutes_per_time: isCompletedGoal ? todo.minutesPerTime || 15 : editMinutesPerTime.value,
      description: editDescription.value.trim() || undefined,
    })

    // 如果任务来自模板，同时更新模板
    if (!isCompletedGoal && todo.templateId) {
      const template = templates.value.find((t) => t.id === todo.templateId)
      if (template) {
        // 更新模板
        const templateOk = applyTemplateEdit(todo.templateId, {
          title: nextTitle,
          category: editCategory.value,
          period: editPeriod.value,
          minFrequency: editMinFrequency.value,
          unit: editUnit.value,
          minutesPerTime: editMinutesPerTime.value,
          description: editDescription.value.trim() || undefined,
        })

        if (templateOk) {
          // 同步模板到 Supabase
          await updateTemplateInSupabase(todo.templateId, {
            title: nextTitle,
            category: editCategory.value,
            period: editPeriod.value,
            min_frequency: editMinFrequency.value,
            unit: editUnit.value,
            minutes_per_time: editMinutesPerTime.value,
            description: editDescription.value.trim() || undefined,
          })
        }
      }
    }

    // 更新打卡记录中的任务标题
    const { error: punchUpdateError } = await supabase
      .from('todo_punch_records')
      .update({
        todo_title: nextTitle,
        category: isCompletedGoal ? todo.category : editCategory.value,
      })
      .eq('todo_id', id)
      .select()

    if (punchUpdateError) {
      console.error('Failed to update punch record titles:', punchUpdateError)
    } else {
      punchRecords.value = punchRecords.value.map((record) =>
        record.todoId === id
          ? {
              ...record,
              todoTitle: nextTitle,
              category: isCompletedGoal ? todo.category : editCategory.value,
            }
          : record,
      )
    }

    editVisible.value = false
    editingTodoId.value = null
    MessagePlugin.success('已保存修改')
  } finally {
    isSavingEdit.value = false
  }
}

// Goal History Management Functions
const adjustGoalHistoryMinutes = (delta: number, event: MouseEvent) => {
  const step = event.shiftKey ? 5 : 1
  const newVal = (goalHistoryMinutes.value || 0) + delta * step
  goalHistoryMinutes.value = Math.max(0, newVal)
}

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
  if (isAddingGoalHistory.value) return // 防止重复提交
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

  isAddingGoalHistory.value = true // 开始loading

  // 获取投入时间
  const inputMinutes = typeof goalHistoryMinutes.value === 'number' ? goalHistoryMinutes.value : 0

  // Insert Goal History to Supabase
  const { data: ghData, error: ghError } = await supabase
    .from('todo_goal_history_records')
    .insert({
      goal_id: ghPrep.record.goalId,
      content: ghPrep.record.content,
      type: ghPrep.record.type,
      timestamp: ghPrep.record.timestamp,
      note: ghPrep.record.note,
      input_time: inputMinutes, // 保存投入时间到新字段
    })
    .select('id')
    .single()

  if (ghError || !ghData) {
    console.error('Failed to save goal history', ghError)
    MessagePlugin.error('保存进度失败')
    isAddingGoalHistory.value = false // 结束loading
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
    // Include time investment if specified
    const mins = typeof goalHistoryMinutes.value === 'number' ? goalHistoryMinutes.value : 0
    if (mins > 0) {
      prep.record.minutesPerTime = mins
      prep.record.unit = 'minutes'
    }

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
  isAddingGoalHistory.value = false // 结束loading
  // MessagePlugin.success('已添加记录并同步打卡') // Moved inside async callback
}

const startEditGoalHistory = (record: GoalHistoryRecord) => {
  editingGoalHistoryId.value = record.id
  goalHistoryContent.value = record.content

  // 直接从record获取投入时间
  goalHistoryMinutes.value = typeof record.inputTime === 'number' ? record.inputTime : 0
}

const saveGoalHistory = async () => {
  const id = editingGoalHistoryId.value
  if (!id) return

  const content = goalHistoryContent.value.trim()
  if (!content) {
    MessagePlugin.warning('历史记录内容不能为空')
    return
  }

  // 获取当前的投入时间
  const inputMinutes = typeof goalHistoryMinutes.value === 'number' ? goalHistoryMinutes.value : 0

  // 更新到 Supabase
  const { error } = await supabase
    .from('todo_goal_history_records')
    .update({
      content: content,
      input_time: inputMinutes,
    })
    .eq('id', id)

  if (error) {
    console.error('Failed to update goal history record:', error)
    MessagePlugin.error('更新失败')
    return
  }

  // 更新本地状态
  const success = updateGoalHistoryRecord(id, content)
  if (!success) {
    MessagePlugin.error('本地更新失败')
    return
  }

  // 同时更新本地的 inputTime
  const record = goalHistoryRecords.value.find((r) => r.id === id)
  if (record) {
    record.inputTime = inputMinutes
  }

  editingGoalHistoryId.value = null
  goalHistoryContent.value = ''
  goalHistoryMinutes.value = 0
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
  // We prioritize calculating based on targets.
  // "Done" flag is only primary for 'once' goals or if the task type has no calculated target.

  if (t.period === 'once') {
    return !!t.done
  }

  if (t.unit === 'minutes') {
    const currentMins = getPunchedMinutesForTodo(t) || 0
    const targetMins = (t.minFrequency || 1) * (t.minutesPerTime || 0)
    return currentMins >= targetMins
  }

  // Default to times
  return (t.punchIns || 0) >= (t.minFrequency || 0)
}

const handlePunchIn = (id: string) => {
  onPunchTrigger(id)
}

const addTodo = async () => {
  if (isAddingTodo.value) return // Prevent double submission

  if (!categoryOptions.value.length) {
    MessagePlugin.warning('请先在配置管理中添加分类后再添加')
    return
  }
  if (!category.value) {
    MessagePlugin.warning('请选择任务分类')
    return
  }

  isAddingTodo.value = true

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

  // 2. Perform Server Operations - 只保存模板，不保存 todo
  try {
    const todoPayload = res.todo
    const newTemplate = res.newTemplate

    // 保存模板到数据库（所有任务都需要模板，包括目标）
    let templateId = todoPayload.templateId

    if (newTemplate) {
      console.log('📋 Saving new template to Supabase:', newTemplate)
      const savedId = await saveTemplateToSupabase({
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
      templateId = savedId || undefined

      if (!templateId) {
        MessagePlugin.error('保存模板失败')
        return
      }

      // 将模板添加到本地 store
      newTemplate.id = templateId
      templates.value.push(newTemplate)
      console.log('✅ Template saved successfully, ID:', templateId)
    }

    // 在内存中生成 todo（不保存到数据库）
    const localTodo: Todo = {
      id: templateId || todoPayload.id, // 使用模板 ID
      title: todoPayload.title,
      done: false,
      punchIns: 0,
      category: todoPayload.category,
      period: todoPayload.period,
      minFrequency: todoPayload.minFrequency,
      unit: todoPayload.unit,
      minutesPerTime: todoPayload.minutesPerTime,
      description: todoPayload.description,
      templateId: templateId,
      createdAt: todoPayload.createdAt,
      dayKey: todoPayload.dayKey,
      deadline: todoPayload.deadline,
    }

    // 添加到内存中的 todos 列表
    addTodoDirectly(localTodo)

    MessagePlugin.success('任务添加成功')

    // Reset form
    title.value = ''
    description.value = ''
    deadline.value = ''
  } catch (e) {
    console.error('❌ Unexpected error in addTodo:', e)
    MessagePlugin.error('添加任务发生异常')
  } finally {
    isAddingTodo.value = false
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

        // Archive the template instead of deleting todo
        await archiveTemplateInSupabase(id)

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

const todayTodos = computed(() => {
  return todos.value.filter((t) => {
    // 1. Exact match (Daily, Once, or same-day creation)
    if (t.dayKey === todayKey.value) return true

    // 2. Periodic tasks (Weekly, Monthly, Yearly) - check if todayKey falls within the cycle
    if (t.period === 'once' || t.period === 'daily') return false

    const taskDate = dayjs(t.dayKey)
    const targetDate = dayjs(todayKey.value)

    if (t.period === 'weekly') {
      const diff = targetDate.diff(taskDate, 'day')
      // Assuming week starts on Monday as per useTodoStore logic
      return diff >= 0 && diff < 7
    }
    if (t.period === 'monthly') {
      return taskDate.isSame(targetDate, 'month')
    }
    if (t.period === 'yearly') {
      return taskDate.isSame(targetDate, 'year')
    }
    return false
  })
})
const todayCompletedCount = computed(() => todayTodos.value.filter((t) => t.done).length)
const todayPunchRecords = computed(() =>
  punchRecords.value.filter((r) => r.dayKey === todayKey.value),
)
const todayPunchInsTotal = computed(() => todayPunchRecords.value.length)
const todayMinutesTotal = computed(() => {
  return todayPunchRecords.value.reduce((sum, r) => sum + getRecordMinutes(r), 0)
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
    icon: string
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
    groups.push({
      name: cat,
      color: getCategoryColor(cat),
      icon: uiConfig.value.categoryIcons?.[cat] || 'app-icon',
      unfinished,
      completed,
      total,
      progress: total === 0 ? '0' : ((completed.length / total) * 100).toFixed(0),
    })
  }

  // Add dedicated "目标" card for all goals
  if (goalTasks.length > 0) {
    // Sort goal tasks: those with invested time comes first
    const sortedGoals = [...goalTasks].sort((a, b) => {
      // Prioritize undone tasks
      if (a.done !== b.done) return a.done ? 1 : -1

      // Then prioritize those with invested time
      const aMins = getPunchedMinutesForTodo(a) || 0
      const bMins = getPunchedMinutesForTodo(b) || 0

      if (aMins !== bMins) return bMins - aMins

      // Finally create time
      return b.createdAt - a.createdAt
    })

    const unfinished = sortedGoals.filter((t) => !isTaskCompleted(t))
    const completed = sortedGoals.filter((t) => isTaskCompleted(t))
    const total = sortedGoals.length
    const punchedCount = sortedGoals.filter((t) => (t.punchIns || 0) > 0).length
    const progress = total > 0 ? ((punchedCount / total) * 100).toFixed(1) : '0.0'

    groups.push({
      name: '目标',
      color: getCategoryColor('目标'),
      icon: uiConfig.value.categoryIcons?.['目标'] || 'calendar-icon',
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
const heatmapContainerRef = ref<HTMLElement | null>(null)

const { heatmapLoading } = useTodoHeatmap({
  todayKey,
  todayPunchInsTotal,
  todayMinutesTotal,
  todayCompletedCount,
  dayStats,
  heatmapRef: heatmapContainerRef,
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
  const start = exportWeekStartDate.value
  // dayjs(start).week() returns the week of year
  // Need to ensure locale is correct
  const w = dayjs(start).week()
  return `${dayjs(start).year()}年 第${w}周`
})

const exportDialogTitle = computed(() => {
  const keys = exportWeekDayKeys.value
  if (!keys.length) return '打卡统计'
  const start = keys[0]
  const end = keys[keys.length - 1]
  return `打卡统计(${start}到${end})`
})

const exportImageFileName = computed(() => {
  const keys = exportWeekDayKeys.value
  const start = keys[0] || 'start'
  const end = keys[keys.length - 1] || 'end'
  return `${start}_to_${end}_打卡统计.png`
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
      const todo = todos.value.find((t) => t.id === r.todoId) // Find the associated todo

      // Only count minutes for non-goal tasks
      if (todo?.period !== 'once') {
        if (r.unit === 'minutes') {
          const mins = typeof r.minutesPerTime === 'number' ? r.minutesPerTime : 15
          recordMinutes = mins
          minutesTotal += mins
        } else {
          // If punch record unit is not minutes, check template
          const tpl = templates.value.find(
            (t) => t.title === r.todoTitle && (t.category || '未分类') === (r.category || '未分类'),
          )
          if (tpl && tpl.unit === 'minutes') {
            const mins = typeof tpl.minutesPerTime === 'number' ? tpl.minutesPerTime : 15
            recordMinutes = mins
            minutesTotal += mins
          }
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

  // Clone strategy to avoid viewport clipping issues + scrolling issues
  // We'll create a clone, force it to be full width off-screen, and capture that.
  let clone: HTMLElement | null = null

  try {
    await nextTick()

    // 1. Create Clone
    const original = exportCaptureRef.value
    clone = original.cloneNode(true) as HTMLElement

    // 2. Set styles to ensure full render
    // fixed positioning to take it out of flow, z-index to hide it behind things (or just offscreen)
    // IMPORTANT: Top/Left offscreen might cause issues with some capture tools if they rely on viewport intersection.
    // Safest is top:0, left:0, z-index: -9999.
    Object.assign(clone.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: '-9999',
      width: 'max-content', // Force full width
      height: 'max-content',
      maxWidth: 'none',
      maxHeight: 'none',
      overflow: 'visible',
      transform: 'none',
      margin: '0',
      padding: '20px', // Add padding to avoid edge clipping and give breathing room
    })

    // 3. Append to body
    document.body.appendChild(clone)

    // 4. Capture
    const scale = Math.max(2, window.devicePixelRatio || 1)
    const result = await snapdom(clone, {
      scale,
      backgroundColor: exportPalette.value.rootBg,
    })

    await result.download({
      type: 'png',
      filename: exportImageFileName.value,
      backgroundColor: exportPalette.value.rootBg,
    })

    MessagePlugin.success('已导出图片')
    // Don't close dialog automatically, user might want to adjust
    // exportDialogVisible.value = false
  } catch (e) {
    console.error(e)
    MessagePlugin.error('导出失败，请重试')
  } finally {
    if (clone && clone.parentNode) {
      clone.parentNode.removeChild(clone)
    }
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
  // Initialize with all configured categories to 0 to ensure they appear in charts
  const map: Record<string, number> = {}

  if (uiConfig.value.categories) {
    uiConfig.value.categories.forEach((c) => {
      map[c] = 0
    })
  }

  // Merge template counts
  const tplCounts = templateCategoryCounts.value
  for (const [k, v] of Object.entries(tplCounts)) {
    map[k] = (map[k] || 0) + v
  }

  return map
})

const { punchInsByCategoryOption, punchInsOption, minutesOption, categoryOption } = useTodoCharts({
  todos,
  dayStats,
  punchRecords,
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
</script>

<template>
  <!-- Full-Screen Loading Overlay -->
  <div
    v-if="pageLoading"
    class="fixed inset-0 z-50 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm flex items-center justify-center"
  >
    <div class="w-full max-w-md px-8">
      <!-- Loading Message -->
      <div class="text-center mb-6">
        <div
          class="text-2xl font-bold mb-2"
          style="font-family: 'Fira Sans', sans-serif; color: #0d9488"
        >
          {{ loadingMessage }}
        </div>
        <div class="text-sm text-neutral-500" style="font-family: 'Fira Code', monospace">
          {{ loadingProgress }}%
        </div>
      </div>

      <!-- Progress Bar -->
      <div
        class="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden shadow-inner"
      >
        <div
          class="h-full bg-linear-to-r from-teal-500 to-teal-600 transition-all duration-500 ease-out rounded-full shadow-sm"
          :style="{ width: `${loadingProgress}%` }"
        ></div>
      </div>
    </div>
  </div>

  <!-- Authentication Setup Dialog (First Time) -->
  <!-- Authentication Verification Dialog -->
  <t-dialog
    v-model:visible="authDialogVisible"
    header="身份验证"
    :close-on-overlay-click="false"
    :close-btn="false"
    width="400px"
    :confirm-btn="{ content: '验证', theme: 'primary' }"
    :cancel-btn="null"
    @confirm="() => verifyAuth()"
  >
    <div class="p-2">
      <div class="text-center mb-2">
        <div class="text-4xl mb-2">🔒</div>
        <div class="text-sm text-neutral-600 dark:text-neutral-400">请输入密码以访问待办事项</div>
      </div>

      <t-input
        v-model="authPassword"
        type="password"
        placeholder="输入密码"
        ref="authPasswordRef"
        @enter="() => verifyAuth()"
      />
      <div v-if="biometricCredId" class="mt-4 text-center">
        <t-button variant="outline" shape="circle" size="large" @click="loginWithBiometrics">
          <template #icon><fingerprint-icon size="24" /></template>
        </t-button>
        <div class="text-xs text-neutral-500 mt-2">点击进行指纹/面部验证</div>
      </div>
    </div>
  </t-dialog>

  <div
    v-if="isAuthenticated"
    class="w-full min-h-screen dark:bg-neutral-900 overflow-x-hidden bg-neutral-50"
    :style="wallpaperStyle"
  >
    <div
      class="max-w-[1200px] mx-auto pt-2 px-4 transition-opacity duration-300"
      :class="{ 'opacity-0': isWallpaperPreview }"
    >
      <div
        class="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-lg p-2 shadow-sm flex items-center gap-2"
      >
        <div class="w-1 h-5 bg-teal-500 rounded-full"></div>
        <div class="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {{ todayDisplay }}
        </div>
        <div class="ml-auto flex items-center gap-1">
          <t-button
            v-if="currentWallpaper && !isMobile"
            variant="text"
            shape="square"
            @mouseenter="isWallpaperPreview = true"
            @mouseleave="isWallpaperPreview = false"
            title="预览壁纸 (长按)"
          >
            <template #icon><browse-icon /></template>
          </t-button>

          <t-button
            v-if="wallpaperHistory.length > 0 && !isMobile"
            variant="text"
            shape="square"
            @click="randomWallpaper"
            title="随机切换历史壁纸"
          >
            <template #icon><history-icon /></template>
          </t-button>

          <t-button
            v-if="!isMobile"
            variant="text"
            shape="square"
            @click="wallpaperDialogVisible = true"
            title="设置壁纸"
          >
            <template #icon><image-icon /></template>
          </t-button>
        </div>
      </div>
    </div>

    <!-- Content Wrapper with opacity transition -->
    <div
      class="transition-opacity duration-300"
      :class="{
        'opacity-0': isWallpaperPreview,
        'touch-none pointer-events-none': isWallpaperPreview,
      }"
    >
      <!-- Add Task/Goal Section (Desktop only) -->
      <div v-if="!isMobile" class="max-w-[1200px] mx-auto mt-2 px-4">
        <div class="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-lg p-2 shadow-sm">
          <div class="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
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
              :disabled="!categoryOptions.length || !category || isAddingTodo"
              :loading="isAddingTodo"
            >
              <template #icon>
                <add-icon v-if="!isAddingTodo" size="20" />
              </template>
              {{ isAddingTodo ? '提交中...' : period === 'once' ? '新建目标' : '新建任务' }}
            </t-button>
          </div>

          <div class="grid grid-cols-12 gap-x-4 gap-y-3 mt-2">
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
                <t-radio-button value="daily" :disabled="!categoryOptions.length"
                  >每天</t-radio-button
                >
                <t-radio-button value="weekly" :disabled="!categoryOptions.length"
                  >每周</t-radio-button
                >
                <t-radio-button value="monthly" :disabled="!categoryOptions.length"
                  >每月</t-radio-button
                >
                <t-radio-button value="yearly" :disabled="!categoryOptions.length"
                  >每年</t-radio-button
                >
                <t-radio-button value="once" :disabled="!categoryOptions.length"
                  >目标</t-radio-button
                >
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
              <t-input
                v-model="description"
                placeholder="可选：添加任务的详细描述"
                class="flex-1"
              />
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
        </div>
      </div>
      <div v-else class="max-w-[1200px] mx-auto mt-2 px-4">
        <div
          class="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-6 border border-dashed border-neutral-200 dark:border-neutral-700 flex flex-col items-center justify-center text-neutral-400"
        >
          <div class="text-2xl mb-2">💻</div>
          <div class="text-sm font-medium">移动端暂不支持添加数据</div>
          <div class="text-xs mt-1">请前往电脑端进行管理</div>
        </div>
      </div>

      <!-- Section Title: Tasks/Goals -->
      <div class="max-w-[1200px] mx-auto mt-2 px-4">
        <div
          class="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-lg p-2 shadow-sm flex items-center gap-2"
        >
          <div class="w-1 h-5 bg-teal-500 rounded-full"></div>
          <h2 class="text-lg font-bold text-neutral-900 dark:text-neutral-100">任务/目标</h2>
        </div>
      </div>

      <div class="max-w-[1200px] mx-auto mt-2 px-4">
        <!-- Dashboard Grid -->
        <div
          v-if="boardGroups.length"
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-2"
        >
          <div
            v-for="group in boardGroups"
            :key="group.name"
            class="group rounded-lg border border-t-0 border-r-0 border-b-0 bg-white/90 dark:bg-neutral-800/90 backdrop-blur-sm shadow-lg flex flex-col overflow-hidden transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl cursor-pointer"
            :style="{
              borderLeftColor: group.color,
              borderLeftWidth: '5px',
            }"
          >
            <!-- Header -->
            <div
              class="p-2 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between bg-linear-to-r from-transparent to-teal-50/30 dark:to-teal-900/10"
            >
              <div
                class="flex items-center gap-2 cursor-pointer group/icon"
                @click.stop="openCategoryEdit(group)"
              >
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 group-hover/icon:scale-110"
                  :style="{ backgroundColor: group.color + '20', color: group.color }"
                >
                  <component :is="iconMap[group.icon] || AppIcon" size="16" />
                </div>
                <span class="font-bold text-base text-neutral-900 dark:text-neutral-100">{{
                  group.name
                }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="text-xs font-mono text-teal-600 dark:text-teal-400">
                  已达成 {{ group.completed.length }} / 未达成 {{ group.unfinished.length }}
                </div>
                <t-button
                  variant="text"
                  shape="square"
                  size="small"
                  @click.stop="openCategoryEdit(group)"
                >
                  <template #icon><edit-icon size="14" /></template>
                </t-button>
              </div>
            </div>

            <!-- Body -->
            <div class="p-2 flex-1 flex flex-col gap-2 min-h-[100px]">
              <!-- Unfinished -->
              <div v-if="group.unfinished.length > 0" class="flex flex-col gap-2">
                <div
                  v-for="todo in group.unfinished"
                  :key="todo.id"
                  class="transform transition-all"
                >
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
                <div v-for="todo in group.completed" :key="todo.id" class="opacity-40">
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
          </div>
        </div>
        <div
          v-else
          class="flex flex-col items-center justify-center py-12 text-neutral-400 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-lg shadow-sm"
        >
          <t-empty description="暂无分类任务，请先添加任务" />
        </div>
      </div>

      <!-- Section Title: History/Archive -->
      <div class="max-w-[1200px] mx-auto mt-2 px-4">
        <div
          class="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-lg p-2 shadow-sm flex items-center gap-2"
        >
          <div class="w-1 h-5 bg-teal-500 rounded-full"></div>
          <h2 class="text-lg font-bold text-neutral-900 dark:text-neutral-100">历史/归档</h2>
        </div>
      </div>

      <!-- History & Archive Content -->
      <div class="max-w-[1200px] mx-auto mt-2 px-4">
        <t-tabs
          :default-value="1"
          class="rounded-lg overflow-hidden border border-neutral-100 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-sm"
        >
          <t-tab-panel :value="1" :label="`打卡记录 (${currentHistoryRecords.length})`">
            <div class="min-h-[100px] p-2">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
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
                <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                  <div
                    v-for="record in currentHistoryRecords"
                    :key="record.id"
                    class="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
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
            <div class="min-h-[100px] p-2">
              <template v-if="archivedHistorySorted.length">
                <div class="flex flex-col gap-2">
                  <div
                    v-for="item in archivedHistorySorted"
                    :key="`${item.title}@@${item.category}@@${item.period}@@${item.archivedAt}`"
                    class="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700"
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

      <!-- Section Title: Data Statistics -->
      <div class="max-w-[1200px] mx-auto mt-2 px-4">
        <div
          class="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-lg p-2 shadow-sm flex items-center gap-2"
        >
          <div class="w-1 h-5 bg-teal-500 rounded-full"></div>
          <h2 class="text-lg font-bold text-neutral-900 dark:text-neutral-100">数据统计</h2>
        </div>
      </div>

      <!-- Data Statistics Content -->
      <div class="max-w-[1200px] mx-auto mt-2 px-4 pb-2">
        <div
          class="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-md rounded-lg shadow-sm overflow-hidden"
        >
          <div class="p-2">
            <div
              class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2"
            >
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

            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-2">
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
                  <t-tag
                    size="small"
                    variant="light"
                    :theme="punchInsDiff >= 0 ? 'success' : 'danger'"
                  >
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
                  <t-tag
                    size="small"
                    variant="light"
                    :theme="minutesDiff >= 0 ? 'success' : 'danger'"
                  >
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
                  打卡热力图
                </div>
              </div>
              <div class="p-2">
                <div class="w-full overflow-x-auto">
                  <div class="w-fit mx-auto">
                    <div
                      id="todo-cal-heatmap"
                      ref="heatmapContainerRef"
                      class="min-w-[980px] min-h-[140px] overflow-x-auto"
                    ></div>
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
      </div>

      <t-dialog
        v-model:visible="exportDialogVisible"
        :header="exportDialogTitle"
        width="95%"
        placement="top"
        :top="'5vh'"
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
          <div class="max-h-[60vh] overflow-auto px-2">
            <div ref="exportCaptureRef" class="w-fit" :style="exportRootStyle">
              <div class="flex gap-2 items-start">
                <div
                  v-for="d in exportSummaries"
                  :key="d.dayKey"
                  class="p-2 rounded border min-w-[300px] shrink-0"
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

              <div v-if="exportGoals.length" class="mt-2 pt-2 border-t" :style="exportDividerStyle">
                <div class="text-sm font-bold mb-2 flex items-center gap-2">
                  <span>本周完成的目标</span>
                  <span :style="exportSuccessBadgeStyle">{{ exportGoals.length }}</span>
                </div>
                <div class="flex flex-row flex-wrap gap-2">
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
                      <span class="text-xs" :style="exportMutedTextStyle">{{
                        dayjs(g.completedAt).format('MM-DD HH:mm')
                      }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="mt-2 flex justify-end gap-2">
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
        <div class="grid grid-cols-12 gap-2 max-h-[70vh] overflow-y-auto px-1">
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

          <!-- 如果不是已完成的目标，显示可编辑的分类、周期等字段 -->
          <template v-if="!editOnlyDescription">
            <div class="col-span-12">
              <div class="text-sm mb-1">任务分类</div>
              <div class="flex items-center gap-2">
                <t-radio-group
                  v-if="editCategoryOptions.length"
                  v-model="editCategory"
                  variant="default-filled"
                  size="small"
                  class="flex flex-wrap"
                >
                  <t-radio-button v-for="c in editCategoryOptions" :key="c" :value="c">{{
                    c
                  }}</t-radio-button>
                </t-radio-group>
                <t-input
                  v-else
                  v-model="editCategory"
                  placeholder="暂无分类，请先在配置管理中添加"
                  disabled
                  class="flex-1"
                />
              </div>
            </div>

            <div class="col-span-12">
              <div class="text-sm mb-1">任务周期</div>
              <t-radio-group
                v-model="editPeriod"
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
                v-model="editUnit"
                variant="default-filled"
                size="small"
                :disabled="editPeriod === 'once'"
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
                  v-model="editMinFrequency"
                  variant="default-filled"
                  size="small"
                  :disabled="editPeriod === 'once'"
                  class="flex flex-wrap"
                >
                  <t-radio-button
                    v-for="freq in editMinFrequencyOptions"
                    :key="freq"
                    :value="freq"
                    >{{ freq }}</t-radio-button
                  >
                </t-radio-group>
                <div class="text-sm text-neutral-400">次</div>
              </div>
            </div>

            <div class="col-span-12" v-if="editUnit === 'minutes'">
              <div class="text-sm mb-1">每次分钟</div>
              <div class="flex items-center gap-2">
                <t-radio-group
                  v-model="editMinutesPerTime"
                  variant="default-filled"
                  size="small"
                  class="flex flex-wrap"
                >
                  <t-radio-button v-for="m in editMinutesPerTimeOptions" :key="m" :value="m">{{
                    m
                  }}</t-radio-button>
                </t-radio-group>
                <div class="text-sm text-neutral-400">分钟</div>
              </div>
            </div>
          </template>
        </div>
        <div class="mt-2 flex justify-end gap-2">
          <t-button variant="outline" @click="editVisible = false" :disabled="isSavingEdit"
            >取消</t-button
          >
          <t-button
            theme="primary"
            @click="saveEdit"
            :loading="isSavingEdit"
            :disabled="isSavingEdit"
          >
            {{ isSavingEdit ? '保存中...' : '保存' }}
          </t-button>
        </div>
      </t-dialog>

      <t-dialog
        v-model:visible="templateEditVisible"
        header="编辑任务"
        :width="editDialogWidth"
        :footer="false"
      >
        <div class="grid grid-cols-12 gap-2 max-h-[70vh] overflow-y-auto px-1">
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
        <div class="mt-2 flex justify-end gap-2">
          <t-button variant="outline" @click="templateEditVisible = false">取消</t-button>
          <t-button theme="primary" @click="saveTemplateEdit">保存</t-button>
        </div>
      </t-dialog>

      <t-dialog
        v-model:visible="punchDialogVisible"
        :header="currentPunchTodo ? `打卡: ${currentPunchTodo.title}` : '打卡备注'"
        :width="punchDialogWidth"
        :footer="false"
      >
        <div class="flex flex-col gap-2">
          <div class="text-sm">请输入本次打卡备注（可选）：</div>
          <t-textarea v-model="punchNote" placeholder="例如：读了第3章..." autofocus />
          <div v-if="punchMinutesEnabled" class="flex items-center gap-2">
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
            <t-button variant="outline" @click="punchDialogVisible = false" :disabled="isPunchingIn"
              >取消</t-button
            >
            <t-button
              theme="primary"
              @click="confirmPunch"
              :loading="isPunchingIn"
              :disabled="isPunchingIn"
            >
              {{ isPunchingIn ? '打卡中...' : '确认打卡' }}
            </t-button>
          </div>
        </div>
      </t-dialog>

      <!-- 目标历史记录对话框 -->
      <t-dialog
        v-model:visible="goalHistoryDialogVisible"
        :header="`目标进度记录 (已投入 ${viewedGoalTotalMinutes} 分钟)`"
        :width="editDialogWidth"
        :footer="false"
      >
        <div class="max-h-[70vh] overflow-y-auto px-1">
          <!-- 添加新记录表单 -->
          <div
            class="p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 mb-3"
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
                <div class="flex items-center gap-2">
                  <t-button
                    variant="outline"
                    size="small"
                    shape="square"
                    :disabled="goalHistoryMinutes <= 0"
                    @click="adjustGoalHistoryMinutes(-1, $event)"
                  >
                    <template #icon><minus-icon /></template>
                  </t-button>
                  <div class="min-w-14 text-center tabular-nums font-medium">
                    {{ goalHistoryMinutes }}
                  </div>
                  <t-button
                    variant="outline"
                    size="small"
                    shape="square"
                    @click="adjustGoalHistoryMinutes(1, $event)"
                  >
                    <template #icon><add-icon /></template>
                  </t-button>
                </div>
              </div>

              <div class="flex gap-2">
                <t-button
                  v-if="!editingGoalHistoryId"
                  size="small"
                  theme="primary"
                  :loading="isAddingGoalHistory"
                  :disabled="isAddingGoalHistory"
                  @click="addGoalHistory"
                >
                  {{ isAddingGoalHistory ? '添加中...' : '添加记录' }}
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
              class="p-2 rounded-lg border transition-all"
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
                    <!-- 显示投入时间 -->
                    <t-tag
                      v-if="record.inputTime && record.inputTime > 0"
                      size="small"
                      theme="primary"
                      variant="light"
                    >
                      {{ record.inputTime }} 分钟
                    </t-tag>
                  </div>
                  <div class="text-sm mb-1 whitespace-pre-wrap">{{ record.content }}</div>
                  <div
                    v-if="record.note"
                    class="text-xs text-neutral-600 dark:text-neutral-400 mt-1"
                  >
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
        <div class="mt-2 flex justify-end">
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
        <div class="p-2 space-y-6">
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
            <t-button
              block
              variant="dashed"
              theme="default"
              class="mt-2"
              @click="addDraftFrequency"
            >
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

          <div class="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <div class="text-sm font-medium mb-2">安全设置</div>
            <div class="flex items-center justify-between">
              <span class="text-sm text-neutral-600 dark:text-neutral-400"
                >生物识别解锁 (TouchID/FaceID)</span
              >
              <t-button
                v-if="!biometricCredId"
                size="small"
                variant="outline"
                @click="enableBiometrics"
              >
                启用
              </t-button>
              <span v-else class="text-xs text-green-500 font-medium flex items-center gap-1">
                <check-circle-icon /> 已启用
              </span>
            </div>
          </div>

          <div
            class="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800"
          >
            <t-button variant="outline" @click="resetUiConfig">恢复默认</t-button>
            <t-button
              theme="primary"
              @click="saveUiConfigFromDraft"
              :loading="isSavingConfig"
              :disabled="isSavingConfig"
              >保存</t-button
            >
          </div>
        </div>
      </t-drawer>

      <!-- Category Edit Dialog -->
      <t-dialog
        v-model:visible="categoryEditDialogVisible"
        :header="`编辑分类: ${editingCategory.name}`"
        @confirm="saveCategoryConfig"
      >
        <div class="space-y-4 pt-2">
          <div>
            <div class="text-sm font-medium mb-2">卡片颜色</div>
            <t-color-picker
              v-model="editingCategory.color"
              format="HEX"
              :show-primary-color-preview="false"
              class="w-full"
            />
          </div>
          <div>
            <div class="text-sm font-medium mb-2">分类图标</div>
            <div class="grid grid-cols-5 gap-2">
              <div
                v-for="item in availableIcons"
                :key="item.icon"
                class="flex items-center justify-center p-2 rounded-lg border cursor-pointer transition-all"
                :class="[
                  editingCategory.icon === item.icon
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-600'
                    : 'border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-500',
                ]"
                @click="editingCategory.icon = item.icon"
              >
                <component :is="iconMap[item.icon] || AppIcon" size="20" />
              </div>
            </div>
          </div>
        </div>
      </t-dialog>
    </div>

    <!-- Wallpaper Dialog -->
    <WallpaperDialog
      v-model:visible="wallpaperDialogVisible"
      :current-wallpaper="currentWallpaper"
      @update:wallpaper="handleWallpaperUpdate"
      @close-dialog="loadWallpaperHistory"
    />
  </div>

  <!-- Unauthenticated State -->
  <div
    v-else
    class="w-full min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-900"
  >
    <div class="text-center">
      <div class="text-6xl mb-2">🔒</div>
      <div
        class="text-xl font-bold mb-2"
        style="font-family: 'Fira Sans', sans-serif; color: #0d9488"
      >
        等待身份验证
      </div>
      <div class="text-sm text-neutral-500">请完成身份验证以访问待办事项</div>
    </div>
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
