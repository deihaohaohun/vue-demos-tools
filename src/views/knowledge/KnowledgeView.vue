<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useKnowledgeStore, type ResourceType, type VideoPlatform } from './useKnowledgeStore'
import ResourceCard from './ResourceCard.vue'
import ResourceHistoryDialog from './ResourceHistoryDialog.vue'
import { AiEditor } from 'aieditor'
import {
  AddIcon,
  SearchIcon,
  VideoIcon,
  ArticleIcon,
  ImageIcon,
  BrowseIcon,
  FileIcon,
  FilterIcon
} from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const store = useKnowledgeStore()

const searchQuery = ref('')
const selectedType = ref<ResourceType | 'all'>('all')
const selectedTags = ref<string[]>([])

const typeOptions = [
  { label: '全部', value: 'all', icon: FilterIcon },
  { label: '视频', value: 'video', icon: VideoIcon },
  { label: '文章', value: 'article', icon: ArticleIcon },
  { label: '图片', value: 'image', icon: ImageIcon },
  { label: '网站', value: 'website', icon: BrowseIcon },
  { label: '其他', value: 'other', icon: FileIcon },
]

const filteredResources = computed(() => {
  let res = store.resources.value

  // Type filter
  if (selectedType.value !== 'all') {
    res = res.filter(r => r.type === selectedType.value)
  }

  // Tag filter
  if (selectedTags.value.length > 0) {
    res = res.filter(r => selectedTags.value.every(t => r.tags.includes(t)))
  }

  // Search
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    res = res.filter(r => r.title.toLowerCase().includes(q) || r.tags.some(t => t.toLowerCase().includes(q)))
  }

  return res
})

const allTags = store.getAllTags

const toggleTag = (tag: string) => {
  const idx = selectedTags.value.indexOf(tag)
  if (idx > -1) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

// Add Resource Dialog
const addDialogVisible = ref(false)
const form = ref({
  title: '',
  type: 'video' as ResourceType,
  videoPlatform: 'bilibili' as VideoPlatform,
  tag: '历史',
  cover: '',
  sourceUrl: '',
  content: '',
})

const handleAdd = () => {
  form.value = {
    title: '',
    type: 'video',
    videoPlatform: 'bilibili',
    tag: '历史',
    cover: '',
    sourceUrl: '',
    content: '',
  }
  addDialogVisible.value = true
}

const addEditorEl = ref<HTMLElement | null>(null)
let addEditor: AiEditor | null = null

const disableAiEditorResize = (root: HTMLElement | null) => {
  if (!root) return
  const maybeResizable = root.querySelectorAll<HTMLElement>('*')
  maybeResizable.forEach((el) => {
    el.style.setProperty('resize', 'none', 'important')
  })
}

const syncAddEditorLayout = () => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'))
  })
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
  }, 60)
  setTimeout(() => {
    disableAiEditorResize(addEditorEl.value)
  }, 0)
  setTimeout(() => {
    disableAiEditorResize(addEditorEl.value)
  }, 120)
}

watch(addDialogVisible, async (visible) => {
  if (visible) {
    await nextTick()
    if (!addEditorEl.value) return
    if (addEditor) addEditor.destroy()
    addEditor = new AiEditor({
      element: addEditorEl.value,
      placeholder: '请输入详细内容、心得或笔记...',
    })
    disableAiEditorResize(addEditorEl.value)
    if (form.value.content) {
      addEditor.setContent(form.value.content)
    }
    syncAddEditorLayout()
    return
  }

  if (addEditor) {
    form.value.content = addEditor.getHtml()
    addEditor.destroy()
    addEditor = null
  }
})

onBeforeUnmount(() => {
  if (addEditor) {
    addEditor.destroy()
    addEditor = null
  }
  if (editEditor) {
    editEditor.destroy()
    editEditor = null
  }
})

const confirmAdd = () => {
  if (!form.value.title) {
    MessagePlugin.error('请输入标题')
    return
  }

  if (addEditor) {
    form.value.content = addEditor.getHtml()
  }

  const tagsArray = form.value.tag ? [form.value.tag] : []

  store.addResource({
    title: form.value.title,
    type: form.value.type,
    videoPlatform: form.value.type === 'video' ? form.value.videoPlatform : undefined,
    cover: form.value.cover,
    sourceUrl: form.value.sourceUrl.trim() || undefined,
    tags: tagsArray,
    content: form.value.content
  })

  MessagePlugin.success('添加成功')
  addDialogVisible.value = false
}

const goToDetail = (id: string) => {
  router.push(`/knowledge/${id}`)
}

// History Dialog
const historyDialogVisible = ref(false)
const currentHistoryResourceId = ref('')

const handleHistory = (id: string) => {
  currentHistoryResourceId.value = id
  historyDialogVisible.value = true
}

// Edit Resource Dialog
const editDialogVisible = ref(false)
const editingId = ref<string | null>(null)
const editForm = ref({
  title: '',
  type: 'video' as ResourceType,
  videoPlatform: 'bilibili' as VideoPlatform,
  tag: '历史',
  cover: '',
  sourceUrl: '',
  content: '',
})

const editEditorEl = ref<HTMLElement | null>(null)
let editEditor: AiEditor | null = null

const openEdit = (id: string) => {
  const res = store.getResourceById(id)
  if (!res) return
  editingId.value = id
  editForm.value = {
    title: res.title,
    type: res.type,
    videoPlatform: res.videoPlatform || 'bilibili',
    tag: res.tags?.[0] || '历史',
    cover: res.cover || '',
    sourceUrl: res.sourceUrl || '',
    content: res.content || '',
  }
  editDialogVisible.value = true
}

const confirmEdit = () => {
  if (!editingId.value) return
  if (!editForm.value.title) {
    MessagePlugin.error('请输入标题')
    return
  }

  if (editEditor) {
    editForm.value.content = editEditor.getHtml()
  }

  const tagsArray = editForm.value.tag ? [editForm.value.tag] : []
  store.updateResource(editingId.value, {
    title: editForm.value.title,
    type: editForm.value.type,
    videoPlatform: editForm.value.type === 'video' ? editForm.value.videoPlatform : undefined,
    cover: editForm.value.cover,
    sourceUrl: editForm.value.sourceUrl.trim() || undefined,
    tags: tagsArray,
    content: editForm.value.content,
  })

  MessagePlugin.success('更新成功')
  editDialogVisible.value = false
}

watch(editDialogVisible, async (visible) => {
  if (visible) {
    await nextTick()
    if (!editEditorEl.value) return
    if (editEditor) editEditor.destroy()
    editEditor = new AiEditor({
      element: editEditorEl.value,
      placeholder: '编辑资源内容...',
    })
    disableAiEditorResize(editEditorEl.value)
    if (editForm.value.content) {
      editEditor.setContent(editForm.value.content)
    }
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')))
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60)
    return
  }

  if (editEditor) {
    editForm.value.content = editEditor.getHtml()
    editEditor.destroy()
    editEditor = null
  }
})

watch(
  () => editForm.value.type,
  (t) => {
    if (t === 'video' && !editForm.value.videoPlatform) {
      editForm.value.videoPlatform = 'bilibili'
    }
  },
)
</script>

<template>
  <div class="w-full min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col">
    <!-- Header -->
    <header class="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10">
      <div class="max-w-[1400px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <div
            class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-blue-200 shadow-md">
            知
          </div>
          <h1 class="text-xl font-bold text-neutral-800 dark:text-neutral-100 hidden sm:block">温故而知新</h1>
        </div>

        <div class="flex-1 max-w-md">
          <t-input v-model="searchQuery" placeholder="搜索资源名称或标签..." clearable>
            <template #prefix-icon>
              <search-icon />
            </template>
          </t-input>
        </div>

        <t-button theme="primary" @click="handleAdd">
          <template #icon><add-icon /></template>
          添加资源
        </t-button>
      </div>
    </header>

    <div class="flex-1 max-w-[1400px] w-full mx-auto px-4 py-6 flex flex-col md:flex-row gap-6">
      <!-- Sidebar Filters -->
      <aside class="w-full md:w-64 shrink-0 space-y-6">
        <!-- Type Filter -->
        <div class="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
          <h3 class="text-sm font-bold text-neutral-400 uppercase mb-3 px-2">分类</h3>
          <div class="space-y-1">
            <button v-for="opt in typeOptions" :key="opt.value"
              class="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors"
              :class="selectedType === opt.value ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 font-medium' : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'"
              @click="selectedType = opt.value as any">
              <component :is="opt.icon" size="16" />
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Tag Cloud -->
        <div class="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
          <h3 class="text-sm font-bold text-neutral-400 uppercase mb-3 px-2">标签</h3>
          <div class="flex flex-wrap gap-2">
            <t-tag v-for="tag in allTags" :key="tag" size="small"
              :variant="selectedTags.includes(tag) ? 'dark' : 'outline'"
              :theme="selectedTags.includes(tag) ? 'primary' : 'default'" class="cursor-pointer transition-all"
              @click="toggleTag(tag)">
              {{ tag }}
            </t-tag>
            <div v-if="allTags.length === 0" class="text-xs text-neutral-400 px-2">暂无标签</div>
          </div>
        </div>
      </aside>

      <!-- Main Grid -->
      <main class="flex-1">
        <div v-if="filteredResources.length > 0"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <ResourceCard v-for="item in filteredResources" :key="item.id" :resource="item" @detail="goToDetail"
            @edit="openEdit" @history="handleHistory" />
        </div>
        <div v-else class="h-64 flex flex-col items-center justify-center text-neutral-400">
          <t-empty description="暂无相关资源，快去添加吧" />
        </div>
      </main>
    </div>

    <!-- History Dialog -->
    <ResourceHistoryDialog v-model:visible="historyDialogVisible" :resource-id="currentHistoryResourceId" />

    <!-- Add Resource Dialog -->
    <t-dialog v-model:visible="addDialogVisible" header="添加新资源" width="800px" :footer="false">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">标题</label>
          <t-input v-model="form.title" placeholder="请输入资源标题" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">类型</label>
            <t-select v-model="form.type">
              <t-option v-for="opt in typeOptions.slice(1)" :key="opt.value" :value="opt.value" :label="opt.label">
                <div class="flex items-center gap-2">
                  <component :is="opt.icon" />
                  {{ opt.label }}
                </div>
              </t-option>
            </t-select>
          </div>
          <div>
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">封面链接 (可选)</label>
            <t-input v-model="form.cover" placeholder="https://..." />
          </div>
        </div>

        <div v-if="form.type === 'video'" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">视频平台</label>
            <t-select v-model="form.videoPlatform">
              <t-option value="bilibili" label="B站" />
              <t-option value="youtube" label="油管" />
            </t-select>
          </div>
          <div />
        </div>

        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">原始链接 (可选)</label>
          <t-input v-model="form.sourceUrl" placeholder="https://..." />
        </div>

        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">标签</label>
          <t-radio-group v-model="form.tag" variant="default-filled" size="small" class="flex flex-wrap gap-2">
            <t-radio-button value="历史">历史</t-radio-button>
            <t-radio-button value="空难">空难</t-radio-button>
            <t-radio-button value="案件">案件</t-radio-button>
            <t-radio-button value="奇葩">奇葩</t-radio-button>
            <t-radio-button value="重口">重口</t-radio-button>
            <t-radio-button value="涨知识">涨知识</t-radio-button>
            <t-radio-button value="老司机">老司机</t-radio-button>
          </t-radio-group>
        </div>

        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">备注</label>
          <div ref="addEditorEl"
            class="aieditor-host w-full dark:border-neutral-700 rounded-md overflow-hidden bg-white dark:bg-neutral-900">
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <t-button variant="outline" @click="addDialogVisible = false">取消</t-button>
          <t-button theme="primary" @click="confirmAdd">确认添加</t-button>
        </div>
      </div>
    </t-dialog>

    <!-- Edit Resource Dialog -->
    <t-dialog v-model:visible="editDialogVisible" header="编辑资源" width="800px" :footer="false">
      <div class="space-y-4">
        <t-input v-model="editForm.title" label="标题" placeholder="资源标题" />

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">类型</label>
            <t-select v-model="editForm.type">
              <t-option v-for="opt in typeOptions.slice(1)" :key="opt.value" :value="opt.value" :label="opt.label">
                <div class="flex items-center gap-2">
                  <component :is="opt.icon" />
                  {{ opt.label }}
                </div>
              </t-option>
            </t-select>
          </div>
          <div>
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">封面链接 (可选)</label>
            <t-input v-model="editForm.cover" placeholder="https://..." />
          </div>
        </div>

        <div v-if="editForm.type === 'video'" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">视频平台</label>
            <t-select v-model="editForm.videoPlatform">
              <t-option value="bilibili" label="B站" />
              <t-option value="youtube" label="油管" />
            </t-select>
          </div>
          <div />
        </div>

        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">原始链接 (可选)</label>
          <t-input v-model="editForm.sourceUrl" placeholder="https://..." />
        </div>

        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">标签</label>
          <t-radio-group v-model="editForm.tag" variant="default-filled" size="small" class="flex flex-wrap gap-2">
            <t-radio-button value="历史">历史</t-radio-button>
            <t-radio-button value="空难">空难</t-radio-button>
            <t-radio-button value="案件">案件</t-radio-button>
            <t-radio-button value="奇葩">奇葩</t-radio-button>
            <t-radio-button value="重口">重口</t-radio-button>
            <t-radio-button value="涨知识">涨知识</t-radio-button>
            <t-radio-button value="老司机">老司机</t-radio-button>
          </t-radio-group>
        </div>

        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">备注</label>
          <div ref="editEditorEl"
            class="aieditor-host w-full dark:border-neutral-700 rounded-md overflow-hidden bg-white dark:bg-neutral-900">
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <t-button variant="outline" @click="editDialogVisible = false">取消</t-button>
          <t-button theme="primary" @click="confirmEdit">保存修改</t-button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<style scoped>
.aieditor-host {
  height: 320px;
  resize: none;
}

.aieditor-host :deep(.aie-container),
.aieditor-host :deep(.aie-main),
.aieditor-host :deep(.aie-editor),
.aieditor-host :deep(.aie-content) {
  height: 100% !important;
}

.aieditor-host :deep(.aie-container) {
  resize: none !important;
}

:global(.aie-container) {
  resize: none !important;
}
</style>
