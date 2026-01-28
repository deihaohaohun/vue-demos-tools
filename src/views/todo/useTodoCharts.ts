import { computed, type ComputedRef, type Ref } from 'vue'
import type { EChartsOption } from 'echarts'
import { useDark } from '@vueuse/core'

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

export const useTodoCharts = (args: {
  todos: Ref<TodoLike[]>
  dayStats?: Ref<Record<string, DayStatLike>>
  rangeDayKeys: ComputedRef<string[]>
  rangeLabels: ComputedRef<string[]>
  punchInsSeries: ComputedRef<number[]>
  minutesSeries: ComputedRef<number[]>
  categoryCounts: ComputedRef<Record<string, number>>
}) => {
  const isDark = useDark()
  const palette = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fb923c', '#facc15', '#22c55e']
  const chartTheme = computed(() => {
    if (isDark.value) {
      return {
        text: '#a1a1aa',
        mutedText: '#71717a',
        axisLine: '#3f3f46',
        splitLine: '#27272a',
        tooltipBg: 'rgba(10,10,10,0.92)',
        tooltipBorder: '#27272a',
        barBorder: '#171717', // neutral-900
      }
    }
    return {
      text: '#374151',
      mutedText: '#6b7280',
      axisLine: '#e5e7eb',
      splitLine: '#f3f4f6',
      tooltipBg: 'rgba(255,255,255,0.95)',
      tooltipBorder: '#e5e7eb',
      barBorder: '#fafafa', // neutral-50
    }
  })

  const axisCommon = computed(() => {
    const t = chartTheme.value
    return {
      axisLabel: { color: t.text },
      nameTextStyle: { color: t.mutedText },
      axisLine: { lineStyle: { color: t.axisLine } },
      splitLine: { lineStyle: { color: t.splitLine } },
    }
  })

  const punchInsByCategory = computed(
    (): {
      categories: string[]
      series: Array<{
        name: string
        type: string
        data: number[]
        stack: string
        itemStyle: {
          color: string
          borderRadius: number | number[]
          borderColor: string
          borderWidth: number
        }
      }>
    } => {
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
      }

      // Always collect categories from current todos ensuring reactivity
      for (const t of args.todos.value) {
        const c = t.category || '未分类'
        categorySet.add(c)

        // If no dayStats, we still need to calculate values from todos (fallback logic)
        if (!args.dayStats) {
          const dk = t.dayKey
          if (!byDay[dk]) continue
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
          type: 'bar',
          data: dayKeys.map((dk) => byDay[dk]?.[c] || 0),
          stack: 'punchIns',
          itemStyle: {
            color,
            borderRadius: 4, // 全圆角
            borderColor: chartTheme.value.barBorder,
            borderWidth: 2,
          },
        }
      })

      return { categories, series }
    },
  )

  const punchInsByCategoryOption = computed((): EChartsOption => {
    const hasData = punchInsByCategory.value.series.some((s) => s.data.some((v: number) => v > 0))
    if (!hasData) {
      const t = chartTheme.value
      return {
        backgroundColor: 'transparent',
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: t.mutedText,
            fontSize: 14,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }
    }
    const t = chartTheme.value
    const a = axisCommon.value

    // Calculate totals for "Total" series
    const dayKeys = args.rangeDayKeys.value
    const seriesData = punchInsByCategory.value.series
    const totalData = dayKeys.map((_, dayIdx) => {
      return seriesData.reduce((sum, s) => sum + (s.data[dayIdx] || 0), 0)
    })

    return {
      backgroundColor: 'transparent',
      textStyle: { color: t.text },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
        formatter: (params: unknown) => {
          const raw = params as Array<{
            axisValue: string
            value: number
            seriesName: string
            color: string
          }>
          const list = Array.isArray(raw) ? raw.filter((p) => p.seriesName !== '总计') : []
          if (!list.length) return ''
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
              <span class="font-medium">${val} 次</span>
            </div>`
          })
          html += `<div class="mt-1 pt-1 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between gap-4 font-bold">
            <span>总计</span>
            <span>${total} 次</span>
          </div>`
          return html
        },
      },
      legend: {
        type: 'scroll',
        data: punchInsByCategory.value.categories,
        top: 0,
        textStyle: { color: t.text },
        pageButtonItemGap: 5,
        pageIconSize: 12,
      },
      grid: { left: 24, right: 24, top: 46, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category',
        data: args.rangeLabels.value,
        axisTick: { show: false },
        axisLabel: a.axisLabel,
        axisLine: a.axisLine,
      },
      yAxis: {
        type: 'value',
        name: '次',
        minInterval: 1,
        axisLabel: a.axisLabel,
        nameTextStyle: a.nameTextStyle,
        axisLine: a.axisLine,
        splitLine: a.splitLine,
      },
      series: [
        ...(punchInsByCategory.value.series as unknown as unknown[]),
        {
          name: '总计',
          type: 'bar',
          data: totalData,
          barGap: '-100%',
          itemStyle: { color: 'transparent' },
          emphasis: { disabled: true },
          tooltip: { show: false },
          label: {
            show: true,
            position: 'top',
            color: t.text,
            formatter: (p: { value?: unknown }) => {
              const v = typeof p.value === 'number' ? p.value : Number(p.value)
              if (!Number.isFinite(v) || v <= 0) return ''
              return `${v}`
            },
          },
          z: 10,
        },
      ] as unknown as EChartsOption['series'],
    }
  })

  const punchInsOption = computed((): EChartsOption => {
    const hasData = args.punchInsSeries.value.some((v: number) => v > 0)
    if (!hasData) {
      const t = chartTheme.value
      return {
        backgroundColor: 'transparent',
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: t.mutedText,
            fontSize: 14,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }
    }
    const t = chartTheme.value
    const a = axisCommon.value
    return {
      backgroundColor: 'transparent',
      textStyle: { color: t.text },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
      },
      legend: {
        type: 'scroll',
        data: ['打卡次数'],
        top: 0,
        textStyle: { color: t.text },
        pageButtonItemGap: 5,
        pageIconSize: 12,
      },
      grid: { left: 24, right: 24, top: 40, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category',
        data: args.rangeLabels.value,
        axisTick: { show: false },
        axisLabel: a.axisLabel,
        axisLine: a.axisLine,
      },
      yAxis: {
        type: 'value',
        name: '次',
        minInterval: 1,
        axisLabel: a.axisLabel,
        nameTextStyle: a.nameTextStyle,
        axisLine: a.axisLine,
        splitLine: a.splitLine,
      },
      series: [
        {
          name: '打卡次数',
          type: 'line',
          data: args.punchInsSeries.value,
          smooth: true,
          symbolSize: 6,
          itemStyle: { color: '#a78bfa' },
          areaStyle: { color: 'rgba(167,139,250,0.2)' },
          lineStyle: {
            width: 4,
          },
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
    }

    // Always collect categories from current todos ensuring reactivity
    for (const t of args.todos.value) {
      if (t.unit !== 'minutes') continue

      const c = t.category || '未分类'
      categorySet.add(c)

      // If no dayStats, we still need to calculate values from todos (fallback logic)
      if (!args.dayStats) {
        const dk = t.dayKey
        if (!byDay[dk]) continue
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
      const t = chartTheme.value
      return {
        backgroundColor: 'transparent',
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: t.mutedText,
            fontSize: 14,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }
    }

    const t = chartTheme.value
    const a = axisCommon.value
    const series = categories.map((c, idx) => {
      const color = palette[idx % palette.length] ?? '#60a5fa'
      return {
        name: c,
        type: 'bar',
        data: dayKeys.map((dk) => byDay[dk]?.[c] || 0),
        stack: 'minutes',
        itemStyle: {
          color,
          borderRadius: 4, // 全圆角
          borderColor: chartTheme.value.barBorder,
          borderWidth: 2,
        },
      }
    })

    return {
      backgroundColor: 'transparent',
      textStyle: { color: t.text },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
        formatter: (params: unknown) => {
          const raw = params as Array<{
            axisValue: string
            value: number
            seriesName: string
            color: string
          }>
          const list = Array.isArray(raw) ? raw.filter((p) => p.seriesName !== '总计') : []
          if (!list.length) return ''
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
      legend: {
        type: 'scroll',
        data: categories,
        top: 0,
        textStyle: { color: t.text },
        pageButtonItemGap: 5,
        pageIconSize: 12,
      },
      grid: { left: 24, right: 24, top: 46, bottom: 0, containLabel: true },
      xAxis: {
        type: 'category',
        data: args.rangeLabels.value,
        axisTick: { show: false },
        axisLabel: a.axisLabel,
        axisLine: a.axisLine,
      },
      yAxis: {
        type: 'value',
        name: '分钟',
        minInterval: 1,
        axisLabel: a.axisLabel,
        nameTextStyle: a.nameTextStyle,
        axisLine: a.axisLine,
        splitLine: a.splitLine,
      },
      series: [
        ...((series as unknown as unknown[]) || []),
        {
          name: '总计',
          type: 'bar',
          data: dayKeys.map((dk) => categories.reduce((acc, c) => acc + (byDay[dk]?.[c] || 0), 0)),
          barGap: '-100%',
          itemStyle: { color: 'transparent' },
          emphasis: { disabled: true },
          tooltip: { show: false },
          label: {
            show: true,
            position: 'top',
            color: t.text,
            formatter: (p: { value?: unknown }) => {
              const v = typeof p.value === 'number' ? p.value : Number(p.value)
              if (!Number.isFinite(v) || v <= 0) return ''
              return `${v}`
            },
          },
          z: 10,
        },
      ] as unknown as EChartsOption['series'],
    }
  })

  const categoryOption = computed((): EChartsOption => {
    const data = Object.entries(args.categoryCounts.value).sort((a, b) => (b[1] || 0) - (a[1] || 0))
    const hasData = data.some((d) => (d[1] || 0) > 0)
    if (!hasData) {
      const t = chartTheme.value
      return {
        backgroundColor: 'transparent',
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: t.mutedText,
            fontSize: 14,
          },
        },
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      }
    }
    const t = chartTheme.value
    const a = axisCommon.value
    return {
      backgroundColor: 'transparent',
      textStyle: { color: t.text },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: t.tooltipBg,
        borderColor: t.tooltipBorder,
        textStyle: { color: t.text },
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
        axisLabel: { ...a.axisLabel, interval: 0, rotate: data.length > 6 ? 30 : 0 },
        axisLine: a.axisLine,
      },
      yAxis: {
        type: 'value',
        name: '个',
        minInterval: 1,
        axisLabel: a.axisLabel,
        nameTextStyle: a.nameTextStyle,
        axisLine: a.axisLine,
        splitLine: a.splitLine,
      },
      series: [
        {
          name: '任务分类',
          type: 'bar',
          data: data.map((d) => d[1] || 0),
          barWidth: 16,
          itemStyle: {
            color: '#60a5fa',
            borderRadius: 4, // 全圆角
          },
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
