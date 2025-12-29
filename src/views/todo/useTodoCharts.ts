import { computed, type ComputedRef, type Ref } from 'vue'
import type { EChartsOption } from 'echarts'

type TodoLike = {
  dayKey: string
  category: string
  punchIns: number
  unit: string
  minutesPerTime?: number
}

type DayStatLike = {
  categoryPunchIns?: Record<string, number>
  categoryMinutes?: Record<string, number>
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
  categoryCounts: ComputedRef<Record<string, number>>
}) => {
  const palette = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fb923c', '#facc15', '#22c55e']

  const punchInsByCategory = computed((): { categories: string[]; series: LineSeriesLike[] } => {
    const dayKeys = args.rangeDayKeys.value
    const byDay: Record<string, Record<string, number>> = {}
    const categorySet = new Set<string>()

    for (const dk of dayKeys) byDay[dk] = {}

    if (args.dayStats) {
      for (const dk of dayKeys) {
        const stat = args.dayStats.value?.[dk]
        const entries = stat?.categoryPunchIns ? Object.entries(stat.categoryPunchIns) : []
        for (const [c, v] of entries) {
          if (!v) continue
          categorySet.add(c)
          const bucket = byDay[dk] || (byDay[dk] = {})
          bucket[c] = (bucket[c] || 0) + (v || 0)
        }
      }
    } else {
      for (const t of args.todos.value) {
        const dk = t.dayKey
        if (!byDay[dk]) continue
        const c = t.category || '未分类'
        categorySet.add(c)
        const bucket = byDay[dk] || (byDay[dk] = {})
        bucket[c] = (bucket[c] || 0) + (t.punchIns || 0)
      }
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
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
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
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
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
    const dayKeys = args.rangeDayKeys.value
    const byDay: Record<string, Record<string, number>> = {}
    const categorySet = new Set<string>()

    for (const dk of dayKeys) byDay[dk] = {}

    if (args.dayStats) {
      for (const dk of dayKeys) {
        const stat = args.dayStats.value?.[dk]
        const entries = stat?.categoryMinutes ? Object.entries(stat.categoryMinutes) : []
        for (const [c, v] of entries) {
          if (!v) continue
          categorySet.add(c)
          const bucket = byDay[dk] || (byDay[dk] = {})
          bucket[c] = (bucket[c] || 0) + (v || 0)
        }
      }
    } else {
      for (const t of args.todos.value) {
        const dk = t.dayKey
        if (!byDay[dk]) continue
        if (t.unit !== 'minutes') continue

        const c = t.category || '未分类'
        categorySet.add(c)
        const bucket = byDay[dk] || (byDay[dk] = {})
        const mins =
          (t.punchIns || 0) * (typeof t.minutesPerTime === 'number' ? t.minutesPerTime : 15)
        bucket[c] = (bucket[c] || 0) + mins
      }
    }

    const categories = Array.from(categorySet)
    categories.sort((a, b) => a.localeCompare(b, 'zh'))

    const hasData =
      categories.length > 0 &&
      dayKeys.some((dk) => categories.some((c) => (byDay[dk]?.[c] || 0) > 0))

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

    const series = categories.map((c, idx) => {
      const color = palette[idx % palette.length] ?? '#60a5fa'
      return {
        name: c,
        type: 'bar',
        data: dayKeys.map((dk) => byDay[dk]?.[c] || 0),
        stack: 'minutes',
        itemStyle: { color },
      }
    })

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const list = params as Array<{
            axisValue: string
            value: number
            seriesName: string
            color: string
          }>
          if (!list || list.length === 0) return ''
          let total = 0
          const firstItem = list[0]
          let html = `<div class="font-bold mb-1">${firstItem?.axisValue || ''}</div>`
          list.forEach((p) => {
            const val = p.value || 0
            total += val
            html += `<div class="flex items-center justify-between gap-4">
              <span class="flex items-center gap-1">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${p.color};"></span>
                ${p.seriesName}
              </span>
              <span class="font-medium">${val} 分钟</span>
            </div>`
          })
          const hours = (total / 60).toFixed(1)
          html += `<div class="mt-1 pt-1 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-4 font-bold">
            <span>总计</span>
            <span>${total} 分钟 ${total >= 60 ? `(${hours} 小时)` : ''}</span>
          </div>`
          return html
        },
      },
      legend: { data: categories, top: 0 },
      grid: { left: 24, right: 24, top: 40, bottom: 0, containLabel: true },
      xAxis: { type: 'category', data: args.rangeLabels.value, axisTick: { show: false } },
      yAxis: { type: 'value', name: '分钟', minInterval: 1 },
      series: series as unknown as EChartsOption['series'],
    }
  })

  const categoryOption = computed((): EChartsOption => {
    const data = Object.entries(args.categoryCounts.value).sort((a, b) => (b[1] || 0) - (a[1] || 0))
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
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const first = Array.isArray(params) ? params[0] : params
          if (!first || typeof first !== 'object') return ''

          const p = first as { name?: unknown; axisValue?: unknown; value?: unknown }
          const name =
            typeof p.name === 'string' ? p.name : typeof p.axisValue === 'string' ? p.axisValue : ''
          const value =
            typeof p.value === 'number' ? p.value : typeof p.value === 'string' ? p.value : ''

          return `${name}: ${value}`
        },
      },
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
