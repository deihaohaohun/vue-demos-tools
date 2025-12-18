import { computed, type ComputedRef, type Ref } from 'vue'
import type { EChartsOption } from 'echarts'

type TodoLike = {
  dayKey: string
  category: string
  punchIns: number
}

type DayStatLike = {
  categoryPunchIns?: Record<string, number>
}

type LineSeriesLike = {
  name: string
  type: 'line'
  data: number[]
  smooth: boolean
  symbol: string
  symbolSize: number
  itemStyle: { color: string }
  areaStyle: { color: string }
}

const toRgba = (hex: string, alpha: number) => {
  const h = hex.replace('#', '')
  if (h.length !== 6) return `rgba(0,0,0,${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export const useTodoCharts = (args: {
  todos: Ref<TodoLike[]>
  dayStats?: Ref<Record<string, DayStatLike>>
  rangeDayKeys: ComputedRef<string[]>
  rangeLabels: ComputedRef<string[]>
  punchInsSeries: ComputedRef<number[]>
  minutesSeries: ComputedRef<number[]>
  rangeCategoryCreated: ComputedRef<Record<string, number>>
}) => {
  const palette = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fb923c', '#facc15', '#22c55e']

  const punchInsByCategory = computed((): { categories: string[]; series: LineSeriesLike[] } => {
    const dayKeys = args.rangeDayKeys.value
    const byDay: Record<string, Record<string, number>> = {}
    const categorySet = new Set<string>()
    const daysFromStats = new Set<string>()

    for (const dk of dayKeys) byDay[dk] = {}

    for (const dk of dayKeys) {
      const stat = args.dayStats?.value?.[dk]
      const entries = stat?.categoryPunchIns ? Object.entries(stat.categoryPunchIns) : []
      if (!entries.length) continue
      daysFromStats.add(dk)
      for (const [c, v] of entries) {
        if (!v) continue
        categorySet.add(c)
        const bucket = byDay[dk] || (byDay[dk] = {})
        bucket[c] = (bucket[c] || 0) + (v || 0)
      }
    }

    for (const t of args.todos.value) {
      const dk = t.dayKey
      if (!byDay[dk]) continue
      if (daysFromStats.has(dk)) continue
      const c = t.category || '未分类'
      categorySet.add(c)
      const bucket = byDay[dk] || (byDay[dk] = {})
      bucket[c] = (bucket[c] || 0) + (t.punchIns || 0)
    }

    const categories = Array.from(categorySet)
    categories.sort((a, b) => a.localeCompare(b, 'zh'))

    const series = categories.map((c, idx) => {
      const color = palette[idx % palette.length] ?? '#60a5fa'
      return {
        name: c,
        type: 'line' as const,
        data: dayKeys.map((dk) => byDay[dk]?.[c] || 0),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color },
        areaStyle: { color: toRgba(color, 0.12) },
      }
    })

    return { categories, series }
  })

  const punchInsByCategoryOption = computed((): EChartsOption => {
    const hasData = punchInsByCategory.value.series.some((s) => s.data.some((v) => v > 0))
    if (!hasData) {
      return {
        backgroundColor: 'transparent',
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 14,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }
    }
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: punchInsByCategory.value.categories, top: 0 },
      grid: { left: 24, right: 24, top: 40, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: args.rangeLabels.value, axisTick: { show: false } },
      yAxis: { type: 'value', name: '次', minInterval: 1 },
      series: punchInsByCategory.value.series as unknown as EChartsOption['series'],
    }
  })

  const punchInsOption = computed((): EChartsOption => {
    const hasData = args.punchInsSeries.value.some((v: number) => v > 0)
    if (!hasData) {
      return {
        backgroundColor: 'transparent',
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 14,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }
    }
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['打卡次数'], top: 0 },
      grid: { left: 24, right: 24, top: 40, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: args.rangeLabels.value, axisTick: { show: false } },
      yAxis: { type: 'value', name: '次', minInterval: 1 },
      series: [
        {
          name: '打卡次数',
          type: 'line',
          data: args.punchInsSeries.value,
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: '#a78bfa' },
          areaStyle: { color: 'rgba(167,139,250,0.2)' },
        },
      ],
    }
  })

  const minutesOption = computed((): EChartsOption => {
    const hasData = args.minutesSeries.value.some((v: number) => v > 0)
    if (!hasData) {
      return {
        backgroundColor: 'transparent',
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 14,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }
    }
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['累计分钟'], top: 0 },
      grid: { left: 24, right: 24, top: 40, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: args.rangeLabels.value, axisTick: { show: false } },
      yAxis: { type: 'value', name: '分钟', minInterval: 1 },
      series: [
        {
          name: '累计分钟',
          type: 'line',
          data: args.minutesSeries.value,
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: '#fb923c' },
          areaStyle: { color: 'rgba(251,146,60,0.2)' },
        },
      ],
    }
  })

  const categoryOption = computed((): EChartsOption => {
    const data = Object.entries(args.rangeCategoryCreated.value).sort(
      (a, b) => (b[1] || 0) - (a[1] || 0),
    )
    const hasData = data.some((d) => (d[1] || 0) > 0)
    if (!hasData) {
      return {
        backgroundColor: 'transparent',
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: '#999',
            fontSize: 14,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }
    }
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { left: 24, right: 24, top: 40, bottom: 0, containLabel: true },
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

  return {
    punchInsByCategoryOption,
    punchInsOption,
    minutesOption,
    categoryOption,
  }
}
