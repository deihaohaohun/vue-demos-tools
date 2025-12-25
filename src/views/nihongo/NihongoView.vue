<script setup lang="ts">
import { ref, computed } from 'vue'
import MasonryWall from '@yeger/vue-masonry-wall'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import {
  StarFilledIcon,
  CheckIcon,
  CloseIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from 'tdesign-icons-vue-next'

interface GrammarMeaning {
  meaning: string
  usage: string[]
  examples: string[]
  references?: { name: string; url: string; logo?: string }[]
}

interface GrammarItem {
  id: number
  title: string
  level: string
  commonality: number // 1-5, higher is more common
  mastery: number // 1-5, higher is more mastered
  meanings: GrammarMeaning[]
  isRemembered?: boolean
}

const grammarData = ref<GrammarItem[]>([
  {
    id: 1,
    title: '〜てください',
    level: 'N5',
    commonality: 5,
    mastery: 5,
    meanings: [
      {
        meaning: '请...',
        usage: ['动词て形 + ください'],
        examples: ['ここに名前を書いてください。', 'ちょっと待ってください。'],
        references: [
          { name: 'Muji', url: 'https://www.moji-series.com/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' },
          { name: 'NHK', url: 'https://www.nhk.or.jp/lesson/zh/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' }
        ]
      }
    ],
    isRemembered: false
  },
  {
    id: 2,
    title: '〜ことがある',
    level: 'N4',
    commonality: 4,
    mastery: 3,
    meanings: [
      {
        meaning: '有...的时候',
        usage: ['动词连体形 + ことがある'],
        examples: ['たまに朝ごはんを食べないことがあります。'],
        references: [
          { name: 'Maggie Sensei', url: 'https://maggiesensei.com/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' }
        ]
      },
      {
        meaning: '曾有过...（经验）',
        usage: ['动词た形 + ことがある'],
        examples: ['日本へ行ったことがあります。'],
        references: [
          { name: 'JGram', url: 'http://www.jgram.org/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' }
        ]
      }
    ],
    isRemembered: false
  },
  {
    id: 3,
    title: '〜わけにはいかない',
    level: 'N2',
    commonality: 3,
    mastery: 2,
    meanings: [
      {
        meaning: '（心理/道德上）不能...；不可以...',
        usage: ['动词连体形 + わけにはいかない'],
        examples: ['大事な会议だから、遅れるわけにはいかない。'],
        references: [
          { name: 'Bunpro', url: 'https://bunpro.jp/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' }
        ]
      },
      {
        meaning: '（心理/道德上）必须...；不得不...',
        usage: ['动词ない形 + わけにはいかない'],
        examples: ['明日は試験があるので、勉強しないわけにはいかない。']
      }
    ],
    isRemembered: false
  },
  {
    id: 4,
    title: '〜に際して',
    level: 'N1',
    commonality: 2,
    mastery: 1,
    meanings: [
      {
        meaning: '在...之际；当...的时候',
        usage: ['名词 + に際して', '动词连体形 + に際して'],
        examples: ['日本を访问するに際して、多くの准备をした。'],
        references: [
          { name: 'Tae Kim', url: 'http://www.guidetojapanese.org/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' }
        ]
      }
    ],
    isRemembered: false
  },
  {
    id: 5,
    title: '〜从〜にかけて',
    level: 'N3',
    commonality: 4,
    mastery: 4,
    meanings: [
      {
        meaning: '从...到...（范围模糊）',
        usage: ['名词 + から + 名词 + にかけて'],
        examples: ['昨夜から今朝にかけて雨が降りました。', '関東地方から東北地方にかけて地震があった。']
      }
    ],
    isRemembered: false
  },
  {
    id: 6,
    title: '〜たほうがいい',
    level: 'N5',
    commonality: 5,
    mastery: 5,
    meanings: [
      {
        meaning: '最好...（建议）',
        usage: ['动词た形 + ほうがいい'],
        examples: ['早く寝たほうがいいですよ。']
      },
      {
        meaning: '最好不...（建议）',
        usage: ['动词ない形 + ほうがいい'],
        examples: ['あまりお酒を饮まないほうがいいですよ。']
      }
    ],
    isRemembered: false
  },
  {
    id: 11,
    title: '〜うちに',
    level: 'N3',
    commonality: 4,
    mastery: 3,
    meanings: [
      {
        meaning: '趁着...（在状态改变前）',
        usage: ['动词连体形 + うちに', '形容词 + うちに', '名词 + のうちに'],
        examples: ['若いうちに勉強しておきなさい。', '忘れないうちにメモしておきます。']
      },
      {
        meaning: '在...期间（不知不觉间发生了变化）',
        usage: ['动词进行时 + うちに'],
        examples: ['本を读んでいるうちに、寝てしまいました。']
      }
    ],
    isRemembered: false
  }
])

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
            class="bg-white dark:bg-neutral-800 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden border border-neutral-200 dark:border-neutral-700 cursor-pointer group"
            :class="[getLevelStyle(item.level).border]" @click="toggleExpand(item.id)">
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
                  <span class="px-2 py-0.5 font-black rounded uppercase tracking-tighter"
                    :class="[getLevelStyle(item.level).bg, getLevelStyle(item.level).text]">
                    {{ item.level }}
                  </span>

                  <t-tooltip :content="item.isRemembered ? '移除已记住' : '加入已记住'">
                    <t-button shape="circle" variant="text" :theme="item.isRemembered ? 'danger' : 'default'"
                      @click.stop="toggleRemember(item.id)">
                      <template #icon>
                        <check-icon v-if="!item.isRemembered" class="text-red-500" />
                        <close-icon v-else class="text-neutral-400" />
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
                  <div class="flex flex-col items-center px-1">
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
                class="text-lg font-bold text-neutral-800 dark:text-neutral-100 mb-2 group-hover:text-blue-600 transition-colors px-1">
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
                  <div v-if="item.meanings.length > 1"
                    class="text-xs font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">
                    含义 {{ idx + 1 }} 详情
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
                <span
                  class="text-xs text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
                  {{ expandedCards.has(item.id) ? '点击收起' : '点击展开更多' }}
                </span>
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
