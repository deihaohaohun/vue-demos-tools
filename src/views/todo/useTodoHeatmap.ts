import { computed, onBeforeUnmount, onMounted, type ComputedRef, type Ref, watch, ref } from 'vue'
import CalHeatmap from 'cal-heatmap'
import Tooltip from 'cal-heatmap/plugins/Tooltip'
import 'cal-heatmap/cal-heatmap.css'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)

type DayStatLike = {
  punchInsTotal?: number
  minutesTotal?: number
  completedCount?: number
}

type CalendarRecord = { ts: number; value: number; minutes: number; completedCount: number }

type CalHeatmapLike = {
  paint: (options: unknown, plugins?: unknown) => unknown
  destroy: () => unknown
}

const getDaysDiff = (a: Date, b: Date) => {
  const day = 24 * 60 * 60 * 1000
  const aa = new Date(a)
  const bb = new Date(b)
  aa.setHours(0, 0, 0, 0)
  bb.setHours(0, 0, 0, 0)
  return Math.floor((bb.getTime() - aa.getTime()) / day)
}

const formatDayKey = (ts: number) => {
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getHeatmapStartDate = () => {
  return dayjs().utc().startOf('year').toDate()
}

export const useTodoHeatmap = (args: {
  todayKey: ComputedRef<string>
  todayPunchInsTotal: ComputedRef<number>
  todayMinutesTotal: ComputedRef<number>
  todayCompletedCount: ComputedRef<number>
  dayStats: Ref<Record<string, DayStatLike>>
}) => {
  let calHeatmap: CalHeatmapLike | null = null
  const heatmapLoading = ref(false)

  const calendarData = computed(() => {
    const start = getHeatmapStartDate()
    const endExclusive = dayjs(start).add(1, 'year').toDate()
    const days = getDaysDiff(start, endExclusive)

    const records: CalendarRecord[] = []
    const minutesByTs: Record<number, number> = {}
    const completedByTs: Record<number, number> = {}

    for (let i = 0; i < days; i += 1) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      const dk = formatDayKey(date.getTime())
      const punches =
        dk === args.todayKey.value
          ? args.todayPunchInsTotal.value
          : args.dayStats.value[dk]?.punchInsTotal || 0
      const minutes =
        dk === args.todayKey.value
          ? args.todayMinutesTotal.value
          : args.dayStats.value[dk]?.minutesTotal || 0
      const completedCount =
        dk === args.todayKey.value
          ? args.todayCompletedCount.value
          : args.dayStats.value[dk]?.completedCount || 0

      const ts = date.getTime()
      records.push({ ts, value: punches, minutes, completedCount })
      minutesByTs[ts] = minutes
      completedByTs[ts] = completedCount
    }

    return { records, minutesByTs, completedByTs }
  })

  const renderCalHeatmap = async () => {
    heatmapLoading.value = true
    const root = document.getElementById('todo-cal-heatmap')
    const legend = document.getElementById('todo-cal-heatmap-legend')
    if (!root) {
      heatmapLoading.value = false
      return
    }

    if (calHeatmap) {
      await calHeatmap.destroy()
      calHeatmap = null
    }

    // 清空 DOM 容器
    root.innerHTML = ''

    if (legend) {
      legend.innerHTML = ''
    }

    dayjs.locale('zh-cn')
    const start = getHeatmapStartDate()

    calHeatmap = new CalHeatmap() as unknown as CalHeatmapLike
    calHeatmap.paint(
      {
        itemSelector: '#todo-cal-heatmap',
        date: { start },
        data: {
          source: calendarData.value.records,
          x: (d: CalendarRecord) => d.ts,
          y: 'value',
          defaultValue: 0,
        },
        scale: {
          color: {
            type: 'threshold',
            domain: [1, 5, 8, 10],
            range: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
          },
        },
        domain: {
          type: 'month',
          range: 12,
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
            text: function (
              date: unknown,
              value: unknown,
              dayjsDate: { format?: (fmt: string) => string } | undefined,
            ) {
              const ts = typeof date === 'number' ? date : date instanceof Date ? date.getTime() : 0
              const punches = typeof value === 'number' ? value : 0
              const minutes = calendarData.value.minutesByTs[ts] || 0
              const dateText =
                dayjsDate?.format?.('YYYY年MM月DD日') || dayjs(ts).format('YYYY年MM月DD日')
              return `<p class="text-lg">${dateText}</p>
                <p class="text-base">打卡次数: ${punches} 次</p>
                <p class="text-base">分钟: ${minutes} 分钟</p>`
            },
          },
        ],
      ],
    )
    heatmapLoading.value = false
  }

  onMounted(() => {
    renderCalHeatmap()
  })

  watch(
    () => [
      args.todayKey.value,
      args.todayPunchInsTotal.value,
      args.todayMinutesTotal.value,
      args.todayCompletedCount.value,
      Object.keys(args.dayStats.value).length,
    ],
    () => {
      renderCalHeatmap()
    },
  )

  onBeforeUnmount(() => {
    if (calHeatmap) {
      calHeatmap.destroy()
      calHeatmap = null
    }
  })

  return {
    calendarData,
    heatmapLoading,
  }
}
