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
  ChevronUpIcon,
  AddIcon,
  EditIcon,
  DeleteIcon,
} from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'
import type { GrammarItem, GrammarMeaning } from './types'
import { grammarData as initialData } from './data'

const grammarData = ref<GrammarItem[]>(initialData)

const selectedLevel = ref<string>('All')
const sortType = ref<'common' | 'mastery'>('mastery')
const sortOrder = ref<'asc' | 'desc'>('asc')
const showRemembered = ref(false)
const levels = ['All', 'N1', 'N2', 'N3', 'N4', 'N5']

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
  const item = grammarData.value.find((i) => i.id === id)
  if (item) {
    item.isRemembered = !item.isRemembered
  }
}

const updateMastery = (id: number, delta: number) => {
  const item = grammarData.value.find((i) => i.id === id)
  if (item) {
    const newMastery = item.mastery + delta
    if (newMastery >= 1 && newMastery <= 5) {
      item.mastery = newMastery
    }
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
      meanings: item.meanings.map((m, idx) => ({
        id: Date.now() + idx,
        meaning: m.meaning,
        usage: [...m.usage],
        examples: m.examples.map((ex, exIdx) => ({
          id: Date.now() + idx * 100 + exIdx,
          text: ex,
        })),
      })),
    }
  } else {
    editingId.value = null
    formData.value = {
      title: '',
      level: 'N3',
      meanings: [],
    }
    addMeaning() // Start with one empty meaning
  }
  showDialog.value = true
}

const handleSave = () => {
  if (!formData.value.title) {
    MessagePlugin.warning('请填写语法标题')
    return
  }

  const validMeanings: GrammarMeaning[] = formData.value.meanings
    .filter((m) => m.meaning.trim() !== '')
    .map((m) => ({
      meaning: m.meaning,
      usage: m.usage,
      examples: m.examples.filter((ex) => ex.text.trim() !== '').map((ex) => ex.text),
    }))

  if (validMeanings.length === 0) {
    MessagePlugin.warning('请至少填写一个有效含义')
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
        meanings: validMeanings,
      }
    }
    MessagePlugin.success('更新成功')
  } else {
    // Add new
    const newItem: GrammarItem = {
      id: Date.now(),
      title: formData.value.title,
      level: formData.value.level,
      commonality: 3,
      mastery: 1,
      isRemembered: false,
      meanings: validMeanings,
    }
    grammarData.value.unshift(newItem)
    MessagePlugin.success('添加成功')
  }

  showDialog.value = false
}
</script>

<template>
  <div class="w-full min-h-full bg-[#EEF2FF] dark:bg-[#0F172A] p-6 font-sans">
    <!-- Filter Bar -->
    <div
      class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl p-6 rounded-4xl shadow-lg shadow-indigo-500/10 border border-white/50 dark:border-neutral-700 sticky top-4 z-20"
    >
      <div class="flex items-center gap-6 flex-wrap">
        <div class="flex items-center gap-3">
          <span class="text-xs font-black text-indigo-400 uppercase tracking-widest">等级</span>
          <t-radio-group
            v-model="selectedLevel"
            variant="primary-filled"
            size="medium"
            class="bg-transparent!"
          >
            <t-radio-button
              v-for="level in levels"
              :key="level"
              :value="level"
              class="px-4! rounded-full! border-0! font-bold transition-all"
              >{{ level }}</t-radio-button
            >
          </t-radio-group>
        </div>

        <div
          class="flex items-center gap-3 border-l-2 border-indigo-50 dark:border-neutral-700 pl-6"
        >
          <span class="text-xs font-black text-indigo-400 uppercase tracking-widest"
            >显示已记住</span
          >
          <t-switch v-model="showRemembered" size="large" />
        </div>
      </div>

      <div class="flex items-center gap-4 flex-wrap">
        <div class="flex items-center gap-2 bg-indigo-50 dark:bg-neutral-900/50 p-1 rounded-full">
          <t-radio-group v-model="sortType" variant="default-filled" size="small">
            <t-radio-button value="common">常用</t-radio-button>
            <t-radio-button value="mastery">熟练</t-radio-button>
          </t-radio-group>
        </div>

        <t-button
          shape="circle"
          variant="text"
          @click="sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'"
        >
          <template #icon>
            <arrow-up-icon v-if="sortOrder === 'asc'" />
            <arrow-down-icon v-else />
          </template>
        </t-button>

        <div class="flex items-center pl-2">
          <t-button
            theme="primary"
            shape="round"
            size="large"
            class="font-bold! px-6! shadow-lg shadow-primary/30"
            @click="openDialog()"
          >
            <template #icon><add-icon /></template>
            新增语法
          </t-button>
        </div>
      </div>
    </div>

    <!-- Masonry Wall -->
    <div class="max-w-7xl mx-auto">
      <masonry-wall
        :items="filteredAndSortedData"
        :columns="columnCount"
        :gap="16"
        :ssr-columns="1"
        :key="selectedLevel + sortType + sortOrder + showRemembered"
      >
        <template #default="{ item }">
          <div
            class="bg-white/90 dark:bg-neutral-800/90 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border border-white/50 dark:border-neutral-700 group backdrop-blur-sm ring-1 ring-black/5 border-none"
          >
            <!-- Card Header Pattern -->
            <div class="h-1 w-full" :class="getLevelStyle(item.level).bg"></div>

            <div class="p-5">
              <!-- Row 1: Badges & Actions -->
              <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-2">
                  <span
                    class="px-3 py-1 text-sm font-black text-white rounded-lg shadow-md tracking-tight"
                    :class="[getLevelStyle(item.level).bg]"
                  >
                    {{ item.level }}
                  </span>
                  <div class="flex gap-0.5">
                    <star-filled-icon
                      v-for="n in item.commonality"
                      :key="n"
                      class="text-sm"
                      :class="getLevelStyle(item.level).icon"
                    />
                  </div>
                </div>

                <div
                  class="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <t-button
                    shape="circle"
                    variant="text"
                    size="small"
                    @click.stop="openDialog(item)"
                  >
                    <template #icon
                      ><edit-icon class="text-neutral-400 hover:text-indigo-600"
                    /></template>
                  </t-button>
                  <t-button
                    shape="circle"
                    variant="text"
                    size="small"
                    @click.stop="toggleRemember(item.id)"
                  >
                    <template #icon>
                      <heart-filled-icon
                        v-if="item.isRemembered"
                        class="text-rose-500 drop-shadow-sm"
                      />
                      <heart-icon v-else class="text-neutral-300 hover:text-rose-400" />
                    </template>
                  </t-button>
                </div>
              </div>

              <!-- Title -->
              <h3
                class="text-xl font-black text-slate-800 dark:text-slate-100 mb-3 leading-snug tracking-tight"
              >
                {{ item.title }}
              </h3>

              <!-- Summary Meanings -->
              <div class="space-y-2 mb-4">
                <div v-for="(m, idx) in item.meanings" :key="idx" class="flex items-start gap-2">
                  <span
                    class="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                    :class="getLevelStyle(item.level).bg"
                  ></span>
                  <p
                    class="text-slate-600 dark:text-slate-400 text-[15px] font-medium leading-relaxed"
                  >
                    {{ m.meaning }}
                  </p>
                </div>
              </div>

              <!-- Mastery Bar -->
              <div
                class="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl mb-2"
              >
                <div
                  class="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
                >
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="getLevelStyle(item.level).bg"
                    :style="{ width: `${(item.mastery / 5) * 100}%` }"
                  ></div>
                </div>
                <div class="flex items-center gap-1">
                  <t-button
                    shape="square"
                    variant="text"
                    size="small"
                    :disabled="item.mastery <= 1"
                    @click.stop="updateMastery(item.id, -1)"
                  >
                    <template #icon><arrow-down-icon size="12px" /></template>
                  </t-button>
                  <span class="text-xs font-black text-slate-400 w-3 text-center">{{
                    item.mastery
                  }}</span>
                  <t-button
                    shape="square"
                    variant="text"
                    size="small"
                    :disabled="item.mastery >= 5"
                    @click.stop="updateMastery(item.id, 1)"
                  >
                    <template #icon><arrow-up-icon size="12px" /></template>
                  </t-button>
                </div>
              </div>

              <div
                v-if="expandedCards.has(item.id)"
                class="mt-4 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-slate-100 dark:border-neutral-700 pt-5"
              >
                <div v-for="(m, idx) in item.meanings" :key="idx" class="space-y-4">
                  <!-- Rich Text Content -->
                  <div
                    v-if="m.content"
                    class="prose prose-sm dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 leading-relaxed"
                  >
                    <div class="aie-content" v-html="m.content"></div>
                  </div>

                  <!-- Fallback to Structured Content -->
                  <template v-else>
                    <div
                      class="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2 mb-2"
                    >
                      <span
                        v-if="item.meanings.length > 1"
                        class="bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded text-[10px]"
                        >含义 {{ idx + 1 }}</span
                      >
                    </div>

                    <p class="text-slate-700 dark:text-slate-300 font-medium mb-3">
                      {{ m.meaning }}
                    </p>

                    <div v-if="m.tips && m.tips.length > 0" class="flex flex-wrap gap-2 mb-3">
                      <t-tag
                        v-for="(tip, tIdx) in m.tips"
                        :key="tIdx"
                        theme="warning"
                        variant="light-outline"
                        size="small"
                        class="text-[10px]! bg-amber-50!"
                      >
                        {{ tip }}
                      </t-tag>
                    </div>

                    <div v-if="m.usage && m.usage.length > 0" class="mb-3">
                      <h4
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
                      >
                        接续
                      </h4>
                      <div class="flex flex-wrap gap-2">
                        <code
                          v-for="(u, uIdx) in m.usage"
                          :key="uIdx"
                          class="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-xs text-slate-600 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700"
                        >
                          {{ u }}
                        </code>
                      </div>
                    </div>

                    <div v-if="m.examples && m.examples.length > 0" class="mb-3">
                      <h4
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
                      >
                        例句
                      </h4>
                      <ul class="space-y-3">
                        <li
                          v-for="(example, eIdx) in m.examples"
                          :key="eIdx"
                          class="text-[13px] text-slate-600 dark:text-slate-400 flex gap-3 bg-slate-50 dark:bg-slate-800/30 p-3 rounded-lg border border-slate-100 dark:border-slate-800"
                        >
                          <span class="text-indigo-300 font-serif text-lg leading-none">“</span>
                          <span class="italic">{{ example }}</span>
                        </li>
                      </ul>
                    </div>

                    <div v-if="m.references && m.references.length > 0" class="space-y-2">
                      <h4
                        class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2"
                      >
                        参考资源
                      </h4>
                      <div class="flex flex-wrap gap-3">
                        <t-tooltip
                          v-for="(ref, refIdx) in m.references"
                          :key="refIdx"
                          :content="ref.name"
                        >
                          <a
                            :href="ref.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="transition-transform block"
                            @click.stop
                          >
                            <t-avatar
                              size="32px"
                              :image="ref.logo"
                              :hide-on-load-failed="false"
                              class="shadow-sm ring-2 ring-white dark:ring-slate-700"
                            >
                              {{ ref.name.charAt(0) }}
                            </t-avatar>
                          </a>
                        </t-tooltip>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <div class="mt-4 flex justify-center">
                <t-button
                  block
                  variant="text"
                  theme="default"
                  @click.stop="toggleExpand(item.id)"
                  class="text-slate-400! hover:text-indigo-500! hover:bg-indigo-50/50!"
                >
                  <template #icon>
                    <chevron-up-icon v-if="expandedCards.has(item.id)" />
                    <chevron-down-icon v-else />
                  </template>
                  {{ expandedCards.has(item.id) ? '收起详情' : '查看详情' }}
                </t-button>
              </div>
            </div>
          </div>
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
    <t-dialog
      v-model:visible="showDialog"
      :header="editingId ? '编辑语法' : '新增语法'"
      width="800px"
      :footer="false"
    >
      <div class="space-y-6">
        <div class="grid grid-cols-3 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1"
              >语法标题</label
            >
            <t-input v-model="formData.title" placeholder="例如：〜から〜にかけて" />
          </div>
          <div>
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1"
              >等级</label
            >
            <t-select v-model="formData.level">
              <t-option
                v-for="l in ['N1', 'N2', 'N3', 'N4', 'N5']"
                :key="l"
                :value="l"
                :label="l"
              />
            </t-select>
          </div>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400"
              >语法含义 & 详情</label
            >
            <t-button variant="text" size="small" theme="primary" @click="addMeaning">
              <template #icon><add-icon /></template> 添加含义
            </t-button>
          </div>

          <div
            v-for="(m, idx) in formData.meanings"
            :key="m.id"
            class="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-200 dark:border-neutral-700 relative group"
          >
            <t-button
              shape="circle"
              variant="text"
              theme="danger"
              size="small"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              @click="removeMeaning(idx)"
              :disabled="formData.meanings.length === 1"
            >
              <template #icon><delete-icon /></template>
            </t-button>

            <div class="space-y-4">
              <div>
                <label class="block text-xs text-neutral-500 mb-1">核心含义</label>
                <t-input v-model="m.meaning" placeholder="一句话概括" />
              </div>

              <div>
                <label class="block text-xs text-neutral-500 mb-1">接续形式 (回车添加)</label>
                <t-tag-input v-model="m.usage" placeholder="例如：动词辞书形 + こと" clearable />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="block text-xs text-neutral-500">例句列表</label>
                  <t-button
                    variant="text"
                    size="small"
                    theme="default"
                    @click="addExample(idx)"
                    class="text-xs!"
                  >
                    <template #icon><add-icon /></template> 加例句
                  </t-button>
                </div>
                <div class="space-y-2">
                  <div
                    v-for="(ex, exIdx) in m.examples"
                    :key="ex.id"
                    class="flex items-center gap-2"
                  >
                    <span class="text-neutral-400 text-xs w-4">{{ exIdx + 1 }}.</span>
                    <t-input v-model="ex.text" placeholder="输入日文例句..." />
                    <t-button
                      shape="circle"
                      variant="text"
                      theme="danger"
                      size="small"
                      @click="removeExample(idx, exIdx)"
                      :disabled="m.examples.length === 0"
                    >
                      <template #icon><delete-icon /></template>
                    </t-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800"
        >
          <t-button variant="outline" @click="showDialog = false">取消</t-button>
          <t-button theme="primary" @click="handleSave">确认保存</t-button>
        </div>
      </div>
    </t-dialog>
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
