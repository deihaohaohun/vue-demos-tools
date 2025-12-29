<script setup lang="ts">
import { ref, computed } from 'vue'
import MasonryWall from '@yeger/vue-masonry-wall'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import {
  StarFilledIcon,
  HeartIcon,
  HeartFilledIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from 'tdesign-icons-vue-next'
import type { GrammarItem } from './types'
import { grammarData as initialData } from './data'

const grammarData = ref<GrammarItem[]>(initialData)


const selectedLevel = ref<string>('All')
const sortType = ref<'common' | 'mastery'>('mastery')
const sortOrder = ref<'asc' | 'desc'>('asc')
const showRemembered = ref(false)
const levels = ['All', 'N1', 'N2', 'N3', 'N4', 'N5']

const levelColors: Record<string, { bg: string, text: string, border: string }> = {
  'N1': { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' },
  'N2': { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' },
  'N3': { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200' },
  'N4': { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
  'N5': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
}

const getLevelStyle = (level: string) => {
  return levelColors[level] || { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
}

const breakpoints = useBreakpoints(breakpointsTailwind)
const columnCount = computed(() => {
  if (breakpoints.xl.value || breakpoints.lg.value) return 4
  if (breakpoints.md.value) return 2
  return 1
})

const filteredAndSortedData = computed(() => {
  let result = [...grammarData.value]

  // Filter by level
  if (selectedLevel.value !== 'All') {
    result = result.filter((item) => item.level === selectedLevel.value)
  }

  // Filter by remembered status
  if (!showRemembered.value) {
    result = result.filter((item) => !item.isRemembered)
  }

  // Sort
  result.sort((a, b) => {
    const factor = sortOrder.value === 'asc' ? 1 : -1
    if (sortType.value === 'common') {
      return (a.commonality - b.commonality) * factor
    } else {
      return (a.mastery - b.mastery) * factor
    }
  })

  return result
})

// Expanded cards state
const expandedCards = ref<Set<number>>(new Set())

const toggleExpand = (id: number) => {
  if (expandedCards.value.has(id)) {
    expandedCards.value.delete(id)
  } else {
    expandedCards.value.add(id)
  }
}

const toggleRemember = (id: number) => {
  const item = grammarData.value.find(i => i.id === id)
  if (item) {
    item.isRemembered = !item.isRemembered
  }
}

const updateMastery = (id: number, delta: number) => {
  const item = grammarData.value.find(i => i.id === id)
  if (item) {
    const newMastery = item.mastery + delta
    if (newMastery >= 1 && newMastery <= 5) {
      item.mastery = newMastery
    }
  }
}
</script>

<template>
  <div class="w-full min-h-full bg-neutral-50 dark:bg-neutral-900 p-4">
    <!-- Filter Bar -->
    <div
      class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white dark:bg-neutral-800 p-4 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-700">
      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-neutral-400">等级</span>
          <t-radio-group v-model="selectedLevel" variant="default-filled" size="small">
            <t-radio-button v-for="level in levels" :key="level" :value="level">{{ level }}</t-radio-button>
          </t-radio-group>
        </div>

        <div class="flex items-center gap-2 border-l border-neutral-200 dark:border-neutral-700 pl-4">
          <span class="text-sm font-bold text-neutral-400">显示已记住</span>
          <t-switch v-model="showRemembered" size="small" />
        </div>
      </div>

      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2">
          <span class="text-sm font-bold text-neutral-400">排序方式</span>
          <t-radio-group v-model="sortType" variant="default-filled" size="small">
            <t-radio-button value="common">常用度</t-radio-button>
            <t-radio-button value="mastery">熟练度</t-radio-button>
          </t-radio-group>
        </div>

        <div class="flex items-center gap-2">
          <t-radio-group v-model="sortOrder" variant="default-filled" size="small">
            <t-radio-button value="desc">降序 ↓</t-radio-button>
            <t-radio-button value="asc">升序 ↑</t-radio-button>
          </t-radio-group>
        </div>
      </div>
    </div>

    <!-- Masonry Wall -->
    <div class="max-w-7xl mx-auto">
      <masonry-wall :items="filteredAndSortedData" :columns="columnCount" :gap="16" :ssr-columns="1"
        :key="selectedLevel + sortType + sortOrder + showRemembered">
        <template #default="{ item }">
          <div
            class="bg-white dark:bg-neutral-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-neutral-200 dark:border-neutral-700 group"
            :class="[getLevelStyle(item.level).border]">
            <div class="p-4">
              <!-- Row 1: Commonality Stars (Centered) -->
              <div class="flex justify-center items-center gap-1 mb-3">
                <star-filled-icon v-for="n in 5" :key="n"
                  :class="['text-lg transition-colors', n <= item.commonality ? 'text-orange-400' : 'text-neutral-200 dark:text-neutral-700']" />
              </div>

              <!-- Row 2: Level, Remember, Mastery (Same Level) -->
              <div
                class="flex justify-between items-center mb-4 bg-neutral-50 dark:bg-neutral-900/50 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 text-base font-black rounded uppercase tracking-tighter"
                    :class="[getLevelStyle(item.level).bg, getLevelStyle(item.level).text]">
                    {{ item.level }}
                  </span>

                  <t-tooltip :content="item.isRemembered ? '取消标记' : '标记已记住'">
                    <t-button shape="circle" variant="text" @click.stop="toggleRemember(item.id)">
                      <template #icon>
                        <heart-filled-icon v-if="item.isRemembered" class="text-red-500" />
                        <heart-icon v-else class="text-neutral-400" />
                      </template>
                    </t-button>
                  </t-tooltip>
                </div>

                <div
                  class="flex items-center gap-1 bg-white dark:bg-neutral-800 rounded-md border border-neutral-200 dark:border-neutral-700 p-0.5">
                  <t-button shape="square" variant="text" size="extra-small" :disabled="item.mastery <= 1"
                    @click.stop="updateMastery(item.id, -1)">
                    <template #icon><arrow-down-icon /></template>
                  </t-button>
                  <div class="flex flex-col items-center px-1 min-w-[28px]">
                    <span class="text-[9px] text-neutral-400 font-bold leading-none scale-90">熟练度</span>
                    <span class="text-xs font-black text-blue-600 dark:text-blue-400 leading-none mt-0.5">{{
                      item.mastery }}</span>
                  </div>
                  <t-button shape="square" variant="text" size="extra-small" :disabled="item.mastery >= 5"
                    @click.stop="updateMastery(item.id, 1)">
                    <template #icon><arrow-up-icon /></template>
                  </t-button>
                </div>
              </div>

              <h3
                class="text-lg font-bold text-neutral-800 dark:text-neutral-100 group-hover:text-blue-600 transition-colors px-1 mb-2">
                {{ item.title }}
              </h3>

              <div class="space-y-2">
                <p v-for="(m, idx) in item.meanings" :key="idx" class="text-neutral-600 dark:text-neutral-400 text-sm">
                  <span v-if="item.meanings.length > 1" class="font-bold mr-1">{{ idx + 1 }}.</span>
                  {{ m.meaning }}
                </p>
              </div>

              <div v-if="expandedCards.has(item.id)"
                class="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-neutral-100 dark:border-neutral-700 pt-4">
                <div v-for="(m, idx) in item.meanings" :key="idx" class="space-y-4">
                  <div
                    class="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider flex items-center gap-2">
                    <span v-if="item.meanings.length > 1"
                      class="bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded text-[10px]">含义
                      {{ idx + 1 }}</span>
                    <span>{{ m.meaning }}</span>
                  </div>

                  <div v-if="m.tips && m.tips.length > 0" class="flex flex-wrap gap-2">
                    <t-tag v-for="(tip, tIdx) in m.tips" :key="tIdx" theme="warning" variant="light-outline"
                      size="small" class="text-[10px]">
                      {{ tip }}
                    </t-tag>
                  </div>

                  <div>
                    <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">接续</h4>
                    <div class="flex flex-wrap gap-2">
                      <code v-for="(u, uIdx) in m.usage" :key="uIdx"
                        class="px-2 py-1 bg-neutral-50 dark:bg-neutral-900 rounded text-xs text-neutral-700 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-800">
          {{ u }}
        </code>
                    </div>
                  </div>

                  <div>
                    <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">例句</h4>
                    <ul class="space-y-2">
                      <li v-for="(example, eIdx) in m.examples" :key="eIdx"
                        class="text-sm text-neutral-600 dark:text-neutral-400 italic flex gap-2">
                        <span class="text-neutral-300">•</span>
                        <span>「{{ example }}」</span>
                      </li>
                    </ul>
                  </div>

                  <div v-if="m.references && m.references.length > 0" class="space-y-2">
                    <h4 class="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">参考资源</h4>
                    <div class="flex flex-wrap gap-3">
                      <t-tooltip v-for="(ref, refIdx) in m.references" :key="refIdx" :content="ref.name">
                        <a :href="ref.url" target="_blank" rel="noopener noreferrer"
                          class="hover:scale-110 transition-transform" @click.stop>
                          <t-avatar size="40px" :image="ref.logo" :hide-on-load-failed="false" class="shadow-sm">
                            {{ ref.name.charAt(0) }}
                          </t-avatar>
                        </a>
                      </t-tooltip>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex justify-center">
                <t-button variant="text" theme="default" @click.stop="toggleExpand(item.id)">
                  <template #icon>
                    <chevron-up-icon v-if="expandedCards.has(item.id)" />
                    <chevron-down-icon v-else />
                  </template>
                  {{ expandedCards.has(item.id) ? '收起详情' : '展开详情' }}
                </t-button>
              </div>
            </div>
          </div>
        </template>
      </masonry-wall>

      <!-- Empty State -->
      <div v-if="filteredAndSortedData.length === 0" class="flex flex-col items-center justify-center py-20">
        <span class="text-neutral-400 text-lg">没有找到相关的语法内容</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.animate-in {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.fade-in {
  animation-name: fadeIn;
}
</style>
