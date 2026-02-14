<script setup lang="ts">
import { ref, computed } from 'vue'
import MasonryWall from '@yeger/vue-masonry-wall'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import {
  IconStarFill,
  IconHeart,
  IconHeartFill,
  IconArrowUp,
  IconArrowDown,
  IconPlus,
  IconDelete,
} from '@arco-design/web-vue/es/icon'
import { Message } from '@arco-design/web-vue'
import type { GrammarItem, GrammarMeaning, ContentCategory } from './types'
import { grammarData as initialData } from './data'

const grammarData = ref<GrammarItem[]>(initialData)

// 过滤状态
const selectedLevel = ref<string>('All')
const selectedCategory = ref<ContentCategory | 'All'>('All')
const sortType = ref<'common' | 'mastery'>('mastery')
const sortOrder = ref<'asc' | 'desc'>('asc')
const showRemembered = ref(false)

// 过滤选项
const levels = ['All', 'N1', 'N2', 'N3', 'N4', 'N5']
const categories: Array<ContentCategory | 'All'> = ['All', '语法', '单词', '听力', '阅读']

const levelColors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  N1: {
    bg: 'bg-gradient-to-br from-rose-500 to-pink-600',
    text: 'text-white',
    border: 'border-pink-200',
    icon: 'text-pink-500',
  },
  N2: {
    bg: 'bg-gradient-to-br from-orange-400 to-amber-500',
    text: 'text-white',
    border: 'border-orange-200',
    icon: 'text-orange-500',
  },
  N3: {
    bg: 'bg-gradient-to-br from-amber-300 to-yellow-500',
    text: 'text-white',
    border: 'border-yellow-200',
    icon: 'text-yellow-500',
  },
  N4: {
    bg: 'bg-gradient-to-br from-emerald-400 to-green-600',
    text: 'text-white',
    border: 'border-green-200',
    icon: 'text-emerald-500',
  },
  N5: {
    bg: 'bg-gradient-to-br from-cyan-400 to-blue-500',
    text: 'text-white',
    border: 'border-blue-200',
    icon: 'text-blue-500',
  },
}

const getLevelStyle = (level: string) => {
  return (
    levelColors[level] || {
      bg: 'bg-gray-400',
      text: 'text-white',
      border: 'border-gray-200',
      icon: 'text-gray-400',
    }
  )
}

const breakpoints = useBreakpoints(breakpointsTailwind)
const columnCount = computed(() => {
  if (breakpoints.xl.value || breakpoints.lg.value) return 4
  if (breakpoints.md.value) return 2
  return 1
})

const filteredAndSortedData = computed(() => {
  let result = [...grammarData.value]

  // 按等级过滤
  if (selectedLevel.value !== 'All') {
    result = result.filter((item) => item.level === selectedLevel.value)
  }

  // 按分类过滤
  if (selectedCategory.value !== 'All') {
    result = result.filter((item) => item.category === selectedCategory.value)
  }

  // 按记忆状态过滤
  if (!showRemembered.value) {
    result = result.filter((item) => !item.isRemembered)
  }

  // 排序
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
  const item = grammarData.value.find((i) => i.id === id)
  if (item) {
    item.isRemembered = !item.isRemembered
  }
}

// 学习反馈函数
const handleRemember = (id: number) => {
  const item = grammarData.value.find((i) => i.id === id)
  if (item && item.mastery < 5) {
    item.mastery += 1
    Message.success('记忆强化！')
  }
}

const handleVague = (id: number) => {
  const item = grammarData.value.find((i) => i.id === id)
  if (item && item.mastery > 1) {
    item.mastery -= 1
    Message.info('需要复习')
  }
}

const handleForget = (id: number) => {
  const item = grammarData.value.find((i) => i.id === id)
  if (item) {
    item.mastery = 1
    Message.warning('已重置熟练度')
  }
}

// Dialog State
const showDialog = ref(false)
const editingId = ref<number | null>(null)

interface EditingExample {
  id: number
  text: string
}

interface EditingMeaning {
  id: number
  meaning: string
  usage: string[]
  examples: EditingExample[]
}

const formData = ref({
  title: '',
  level: 'N3',
  category: '语法' as ContentCategory,
  meanings: [] as EditingMeaning[],
})

const addMeaning = () => {
  formData.value.meanings.push({
    id: Date.now(),
    meaning: '',
    usage: [],
    examples: [{ id: Date.now() + 1, text: '' }],
  })
}

const removeMeaning = (index: number) => {
  formData.value.meanings.splice(index, 1)
}

const addExample = (meaningIndex: number) => {
  const meaning = formData.value.meanings[meaningIndex]
  if (meaning) {
    meaning.examples.push({
      id: Date.now(),
      text: '',
    })
  }
}

const removeExample = (meaningIndex: number, exampleIndex: number) => {
  const meaning = formData.value.meanings[meaningIndex]
  if (meaning) {
    meaning.examples.splice(exampleIndex, 1)
  }
}

const openDialog = (item?: GrammarItem) => {
  if (item) {
    editingId.value = item.id
    formData.value = {
      title: item.title,
      level: item.level,
      category: item.category,
      meanings: item.meanings.map((m, idx) => ({
        id: Date.now() + idx,
        meaning: m.meaning,
        usage: [...m.usage],
        examples:
          m.examples?.map((ex, exIdx) => ({
            id: Date.now() + idx * 100 + exIdx,
            text: ex,
          })) || [],
      })),
    }
  } else {
    editingId.value = null
    formData.value = {
      title: '',
      level: 'N3',
      category: '语法',
      meanings: [],
    }
    addMeaning() // Start with one empty meaning
  }
  showDialog.value = true
}

const handleSave = () => {
  if (!formData.value.title) {
    Message.warning('请填写语法标题')
    return
  }

  const validMeanings: GrammarMeaning[] = formData.value.meanings
    .filter((m) => m.meaning.trim() !== '')
    .map((m) => ({
      meaning: m.meaning,
      usage: m.usage,
      examples: m.examples?.filter((ex) => ex.text.trim() !== '').map((ex) => ex.text),
    }))

  if (validMeanings.length === 0) {
    Message.warning('请至少填写一个有效含义')
    return
  }

  if (editingId.value) {
    // Update existing
    const index = grammarData.value.findIndex((i) => i.id === editingId.value)
    if (index !== -1) {
      const oldItem = grammarData.value[index]
      if (!oldItem) return

      grammarData.value[index] = {
        ...oldItem,
        id: oldItem.id!,
        title: formData.value.title,
        level: formData.value.level,
        category: formData.value.category,
        meanings: validMeanings,
      }
    }
    Message.success('更新成功')
  } else {
    // Add new
    const newItem: GrammarItem = {
      id: Date.now(),
      title: formData.value.title,
      level: formData.value.level,
      category: formData.value.category,
      commonality: 3,
      mastery: 1,
      isRemembered: false,
      meanings: validMeanings,
    }
    grammarData.value.unshift(newItem)
    Message.success('添加成功')
  }

  showDialog.value = false
}
</script>

<template>
  <div class="w-full min-h-full bg-[#EEF2FF] dark:bg-[#0F172A] p-2 font-sans">
    <!-- 过滤栏 -->
    <div
      class="max-w-7xl mx-auto flex flex-col gap-3 mb-6 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xs p-2 rounded-md shadow-lg shadow-indigo-500/10 border border-white/50 dark:border-neutral-700 sticky top-2 z-20"
    >
      <!-- 第一行：等级和显示已记住 -->
      <div class="flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="text-xs font-black uppercase tracking-wider">等级</span>
            <a-radio-group v-model="selectedLevel" type="button" size="small">
              <a-radio v-for="level in levels" :key="level" :value="level">
                {{ level }}
              </a-radio>
            </a-radio-group>
          </div>

          <div
            class="flex items-center gap-3 border-l-2 border-indigo-100 dark:border-neutral-700 pl-4"
          >
            <span class="text-xs font-black uppercase tracking-wider">显示已记住</span>
            <a-switch v-model="showRemembered" />
          </div>
        </div>

        <div class="flex items-center gap-3">
          <a-radio-group v-model="sortType" type="button" size="small">
            <a-radio value="common">常用</a-radio>
            <a-radio value="mastery">熟练</a-radio>
          </a-radio-group>

          <a-button
            shape="circle"
            type="text"
            size="small"
            @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
          >
            <template #icon>
              <icon-arrow-up v-if="sortOrder === 'asc'" />
              <icon-arrow-down v-else />
            </template>
          </a-button>

          <a-button
            type="primary"
            size="medium"
            class="font-bold! px-5! shadow-lg shadow-primary/30"
            @click="openDialog()"
          >
            <template #icon><icon-plus /></template>
            新增
          </a-button>
        </div>
      </div>

      <!-- 第二行：内容分类 -->
      <div
        class="flex items-center gap-2 pt-3 border-t border-indigo-100/50 dark:border-neutral-700/50"
      >
        <span class="text-xs font-black uppercase tracking-wider">分类</span>
        <a-radio-group v-model="selectedCategory" type="button" size="small">
          <a-radio v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </a-radio>
        </a-radio-group>
      </div>
    </div>

    <!-- Masonry Wall -->
    <div class="max-w-7xl mx-auto">
      <masonry-wall
        :items="filteredAndSortedData"
        :columns="columnCount"
        :gap="12"
        :ssr-columns="1"
        :key="selectedLevel + selectedCategory + sortType + sortOrder + showRemembered"
      >
        <template #default="{ item }">
          <a-tooltip :content="expandedCards.has(item.id) ? '点击收起' : '点击展开'">
            <div
              class="bg-white/90 dark:bg-neutral-800/90 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group backdrop-blur-sm flex cursor-pointer"
              @click="toggleExpand(item.id)"
            >
              <!-- Card Side Color Bar -->
              <div class="w-1 shrink-0" :class="getLevelStyle(item.level).bg"></div>

              <div class="flex-1 p-2">
                <!-- Row 1: Badges & Actions -->
                <div class="flex justify-between items-start mb-3">
                  <div class="flex items-center gap-2">
                    <span
                      class="px-2.5 py-0.5 text-xs font-black text-white rounded-md shadow-md tracking-tight"
                      :class="[getLevelStyle(item.level).bg]"
                    >
                      {{ item.level }}
                    </span>
                    <div class="flex gap-0.5">
                      <icon-star-fill
                        v-for="n in item.commonality"
                        :key="n"
                        class="text-xs"
                        :class="getLevelStyle(item.level).icon"
                      />
                    </div>
                  </div>

                  <div class="flex items-center">
                    <a-button shape="circle" type="text" @click.stop="toggleRemember(item.id)">
                      <template #icon>
                        <icon-heart-fill
                          v-if="item.isRemembered"
                          class="text-rose-500 drop-shadow-sm"
                        />
                        <icon-heart v-else class="text-neutral-300 hover:text-rose-400" />
                      </template>
                    </a-button>
                  </div>
                </div>

                <!-- Title -->
                <h3
                  class="text-lg font-black text-slate-800 dark:text-slate-100 mb-2 leading-snug tracking-tight"
                >
                  {{ item.title }}
                </h3>

                <!-- Summary Meanings -->
                <div class="space-y-1.5 mb-3">
                  <div v-for="(m, idx) in item.meanings" :key="idx" class="flex items-start gap-2">
                    <span
                      class="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                      :class="getLevelStyle(item.level).bg"
                    ></span>
                    <p
                      class="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed"
                    >
                      {{ m.meaning }}
                    </p>
                  </div>
                </div>

                <!-- 学习反馈按钮 -->
                <div class="flex items-center gap-2">
                  <a-button
                    type="outline"
                    size="small"
                    status="success"
                    class="flex-1 text-xs!"
                    @click.stop="handleRemember(item.id)"
                  >
                    记得
                  </a-button>
                  <a-button
                    type="outline"
                    size="small"
                    status="warning"
                    class="flex-1 text-xs!"
                    @click.stop="handleVague(item.id)"
                  >
                    模糊
                  </a-button>
                  <a-button
                    type="outline"
                    size="small"
                    status="danger"
                    class="flex-1 text-xs!"
                    @click.stop="handleForget(item.id)"
                  >
                    忘记
                  </a-button>
                </div>

                <div
                  v-if="expandedCards.has(item.id)"
                  class="mt-3 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-slate-100 dark:border-neutral-700 pt-3"
                >
                  <div v-for="(m, idx) in item.meanings" :key="idx" class="space-y-3">
                    <!-- Rich Text Content -->
                    <div
                      v-if="m.content"
                      class="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed"
                    >
                      <div class="aie-content" v-html="m.content"></div>
                    </div>

                    <!-- Fallback to Structured Content -->
                    <template v-else>
                      <h3 class="dark:text-slate-300 text-lg font-bold mb-2">
                        {{ m.meaning }}
                      </h3>

                      <div v-if="m.tips && m.tips.length > 0" class="flex flex-wrap gap-1.5 mb-2">
                        <a-tag
                          v-for="(tip, tIdx) in m.tips"
                          :key="tIdx"
                          status="warning"
                          variant="light-outline"
                          size="small"
                          class="text-[10px]! bg-amber-50!"
                        >
                          {{ tip }}
                        </a-tag>
                      </div>

                      <div v-if="m.usage && m.usage.length > 0" class="mb-2">
                        <div class="flex flex-wrap gap-1.5">
                          <code
                            v-for="(u, uIdx) in m.usage"
                            :key="uIdx"
                            class="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700"
                          >
                            {{ u }}
                          </code>
                        </div>
                      </div>

                      <div v-if="m.references && m.references.length > 0" class="space-y-1.5">
                        <h4
                          class="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5"
                        >
                          参考资源
                        </h4>
                        <div class="flex flex-wrap gap-2">
                          <a-tooltip v-for="(ref, refIdx) in m.references" :key="refIdx">
                            <template #content>
                              <div class="text-center">
                                <div class="font-bold">{{ ref.name }}</div>
                                <div v-if="ref.type" class="text-xs text-gray-400">
                                  {{ ref.type }}
                                </div>
                              </div>
                            </template>
                            <a
                              :href="ref.url"
                              target="_blank"
                              rel="noopener noreferrer"
                              class="relative inline-block transition-transform hover:scale-110"
                              @click.stop
                            >
                              <a-avatar
                                size="32px"
                                :image="ref.logo"
                                class="shadow-sm ring-2 ring-white dark:ring-slate-700"
                              >
                                {{ ref.name.charAt(0) }}
                              </a-avatar>
                              <!-- 类型标识 -->
                              <span
                                v-if="ref.type"
                                class="absolute -bottom-0.5 -right-0.5 px-1 py-0.5 text-[8px] font-black rounded-full bg-gradient-to-br shadow-sm"
                                :class="{
                                  'from-rose-500 to-pink-600 text-white': ref.type === '视频',
                                  'from-orange-400 to-amber-500 text-white': ref.type === '音频',
                                  'from-emerald-400 to-green-600 text-white': ref.type === '图片',
                                  'from-cyan-400 to-blue-500 text-white': ref.type === '文字',
                                }"
                              >
                                {{
                                  ref.type === '视频'
                                    ? '▶'
                                    : ref.type === '音频'
                                      ? '♪'
                                      : ref.type === '图片'
                                        ? '◆'
                                        : '◉'
                                }}
                              </span>
                            </a>
                          </a-tooltip>
                        </div>
                      </div>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </a-tooltip>
        </template>
      </masonry-wall>

      <!-- Empty State -->
      <div
        v-if="filteredAndSortedData.length === 0"
        class="flex flex-col items-center justify-center py-20"
      >
        <span class="text-neutral-400 text-lg">没有找到相关的语法内容</span>
      </div>
    </div>

    <!-- Add Grammar Dialog -->
    <a-modal
      v-model:visible="showDialog"
      :title="editingId ? '编辑语法' : '新增语法'"
      width="800px"
      :footer="false"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-4 gap-3">
          <div class="col-span-2">
            <label class="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1"
              >语法标题</label
            >
            <a-input v-model="formData.title" placeholder="例如：〜から〜にかけて" />
          </div>
          <div>
            <label class="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1"
              >等级</label
            >
            <a-select v-model="formData.level">
              <a-option
                v-for="l in ['N1', 'N2', 'N3', 'N4', 'N5']"
                :key="l"
                :value="l"
                :label="l"
              />
            </a-select>
          </div>
          <div>
            <label class="block text-xs font-bold text-neutral-600 dark:text-neutral-400 mb-1"
              >分类</label
            >
            <a-select v-model="formData.category">
              <a-option
                v-for="cat in categories.filter((c) => c !== 'All')"
                :key="cat"
                :value="cat"
                :label="cat"
              />
            </a-select>
          </div>
        </div>

        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-bold text-neutral-600 dark:text-neutral-400"
              >语法含义 & 详情</label
            >
            <a-button type="primary" size="small" @click="addMeaning">
              <template #icon><icon-plus /></template> 添加含义
            </a-button>
          </div>

          <div
            v-for="(m, idx) in formData.meanings"
            :key="m.id"
            class="bg-neutral-50 dark:bg-neutral-900/50 p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 relative group"
          >
            <a-button
              shape="circle"
              type="text"
              status="danger"
              size="small"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeMeaning(idx)"
              :disabled="formData.meanings.length === 1"
            >
              <template #icon><icon-delete /></template>
            </a-button>

            <div class="space-y-3">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">核心含义</label>
                <a-input v-model="m.meaning" placeholder="一句话概括" />
              </div>

              <div>
                <label class="block text-xs text-neutral-500 mb-1">接续形式 (回车添加)</label>
                <a-input-tag v-model="m.usage" placeholder="例如：动词辞书形 + こと" clearable />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs text-neutral-500">例句列表</label>
                  <a-button
                    type="text"
                    size="small"
                    theme="default"
                    @click="addExample(idx)"
                    class="text-xs!"
                  >
                    <template #icon><icon-plus /></template> 加例句
                  </a-button>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(ex, exIdx) in m.examples"
                    :key="ex.id"
                    class="flex items-center gap-2"
                  >
                    <span class="text-neutral-400 text-xs w-4">{{ exIdx + 1 }}.</span>
                    <a-input v-model="ex.text" placeholder="输入日文例句..." />
                    <a-button
                      shape="circle"
                      type="text"
                      status="danger"
                      size="small"
                      @click="removeExample(idx, exIdx)"
                      :disabled="m.examples.length === 0"
                    >
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800"
        >
          <a-button type="outline" @click="showDialog = false">取消</a-button>
          <a-button type="primary" @click="handleSave">确认保存</a-button>
        </div>
      </div>
    </a-modal>
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
