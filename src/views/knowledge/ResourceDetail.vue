<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useKnowledgeStore, type ResourceType, type VideoPlatform } from './useKnowledgeStore'
import { AiEditor } from 'aieditor'
import {
  ArrowLeftIcon,
  TimeIcon,
  DeleteIcon,
  EditIcon
} from 'tdesign-icons-vue-next'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const store = useKnowledgeStore()

const resourceId = computed(() => route.params.id as string)
const resource = computed(() => store.getResourceById(resourceId.value))
const views = computed(() => store.getViewsByResourceId(resourceId.value))

const formatDate = (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss')

const goBack = () => router.back()

const openSourceUrl = (url: string) => {
  const target = url?.trim()
  if (!target) return
  store.addViewRecord(resourceId.value)
  window.open(target, '_blank', 'noopener,noreferrer')
}

const disableAiEditorResize = (root: HTMLElement | null) => {
  if (!root) return
  const nodes = root.querySelectorAll<HTMLElement>('*')
  nodes.forEach((el) => {
    el.style.setProperty('resize', 'none', 'important')
  })
}

const syncDialogEditorLayout = () => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'))
  })
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
  }, 60)
}

const handleDelete = () => {
  const confirmDialog = DialogPlugin.confirm({
    header: '确认删除',
    body: '确定要删除这个资源吗？所有的相关记录也会被删除。',
    confirmBtn: { content: '删除', theme: 'danger' },
    onConfirm: () => {
      if (store.deleteResource(resourceId.value)) {
        MessagePlugin.success('删除成功')
        confirmDialog.hide()
        router.replace('/knowledge')
      }
    }
  })
}

// Edit Resource
const editDialogVisible = ref(false)
const editForm = ref({
  title: '',
  content: '',
  type: 'video' as ResourceType,
  videoPlatform: 'bilibili' as VideoPlatform,
  tags: ['历史'],
  cover: '',
  sourceUrl: '',
})

const tagOptions = ['历史', '空难', '案件', '奇葩', '重口', '涨知识', '老司机']

const editEditorEl = ref<HTMLElement | null>(null)
let editEditor: AiEditor | null = null

const handleEdit = () => {
  if (!resource.value) return
  editForm.value = {
    title: resource.value.title,
    content: resource.value.content || '',
    type: resource.value.type,
    videoPlatform: resource.value.videoPlatform || 'bilibili',
    tags: resource.value.tags?.length ? resource.value.tags : ['历史'],
    cover: resource.value.cover || '',
    sourceUrl: resource.value.sourceUrl || '',
  }
  editDialogVisible.value = true
}

const confirmEdit = () => {
  if (!resource.value) return
  if (editEditor) {
    editForm.value.content = editEditor.getHtml()
  }

  store.updateResource(resourceId.value, {
    title: editForm.value.title,
    type: editForm.value.type,
    videoPlatform: editForm.value.type === 'video' ? editForm.value.videoPlatform : undefined,
    content: editForm.value.content,
    tags: editForm.value.tags,
    cover: editForm.value.cover,
    sourceUrl: editForm.value.sourceUrl.trim() || undefined,
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
    syncDialogEditorLayout()
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

watch(
  () => resourceId.value,
  (id) => {
    store.markResourceViewed(id)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (editEditor) {
    editEditor.destroy()
    editEditor = null
  }
})
</script>

<template>
  <div class="w-full min-h-screen bg-neutral-50 dark:bg-neutral-900 pb-10">
    <!-- Header -->
    <header class="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 z-10">
      <div class="max-w-[1000px] mx-auto px-4 h-16 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <t-button variant="text" shape="circle" @click="goBack">
            <template #icon><arrow-left-icon /></template>
          </t-button>
          <h1 class="text-lg font-bold text-neutral-800 dark:text-neutral-100 truncate max-w-md">
            {{ resource?.title || '加载中...' }}
          </h1>
        </div>

        <div class="flex items-center gap-2" v-if="resource">
          <t-button variant="outline" theme="default" @click="handleEdit">
            <template #icon><edit-icon /></template>
            编辑
          </t-button>
          <t-button variant="text" theme="danger" @click="handleDelete">
            <template #icon><delete-icon /></template>
          </t-button>
        </div>
      </div>
    </header>

    <div v-if="resource" class="max-w-[1000px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Main Content -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Info Card -->
        <div
          class="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700">
          <div class="flex flex-wrap gap-2 mb-4">
            <t-tag size="medium" variant="light" theme="primary" class="capitalize">
              {{ resource.type }}
            </t-tag>
            <t-tag v-for="tag in resource.tags" :key="tag" size="medium" variant="outline" theme="default">
              #{{ tag }}
            </t-tag>
          </div>

          <div v-if="resource.cover"
            class="mb-6 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700">
            <img :src="resource.cover" class="w-full max-h-[400px] object-cover" alt="cover" />
          </div>

          <div class="prose dark:prose-invert max-w-none">
            <h2 class="text-xl font-bold mb-4">内容详情</h2>
            <div v-if="resource.content" class="text-neutral-700 dark:text-neutral-300 leading-relaxed"
              v-html="resource.content"></div>
            <div v-else class="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300 leading-relaxed">暂无详细内容</div>
          </div>

          <div v-if="resource.sourceUrl" class="mt-4 flex items-center justify-between gap-2">
            <div class="text-sm text-neutral-500 truncate">
              原始链接：<span class="text-neutral-700 dark:text-neutral-300">{{ resource.sourceUrl }}</span>
            </div>
            <t-button size="small" theme="primary" variant="outline" @click="openSourceUrl(resource.sourceUrl)">
              打开
            </t-button>
          </div>

          <div
            class="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700 text-sm text-neutral-400 flex items-center gap-2">
            <time-icon />
            <span>添加于 {{ formatDate(resource.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- Timeline Sidebar -->
      <div class="lg:col-span-1 space-y-4">
        <div
          class="bg-white dark:bg-neutral-800 rounded-xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 sticky top-24">
          <div class="flex items-center justify-between mb-6">
            <h3 class="font-bold text-lg flex items-center gap-2">
              查看记录
              <span
                class="text-xs font-normal text-neutral-400 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded-full">{{
                  views.length }}</span>
            </h3>
          </div>

          <t-timeline mode="left">
            <t-timeline-item v-for="item in views" :key="item.id" :label="formatDate(item.timestamp)">
              <div
                class="bg-neutral-50 dark:bg-neutral-900 p-3 rounded-lg border border-neutral-100 dark:border-neutral-700">
                <div class="text-xs text-neutral-400 mb-2">查看时间：{{ formatDate(item.timestamp) }}</div>
                <div class="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                  <span v-if="item.description">{{ item.description }}</span>
                  <span v-else class="text-neutral-400">无描述</span>
                </div>
              </div>
            </t-timeline-item>
          </t-timeline>

          <div v-if="views.length === 0" class="py-8 text-center text-neutral-400 text-sm">
            暂无查看记录
          </div>
        </div>
      </div>
    </div>

    <div v-else class="flex items-center justify-center min-h-[50vh] text-neutral-400">
      资源不存在或已被删除
    </div>

    <!-- Edit Dialog -->
    <t-dialog v-model:visible="editDialogVisible" header="编辑资源" width="860px" :footer="false">
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">标题</label>
          <t-input v-model="editForm.title" placeholder="请输入资源标题" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-neutral-500 mb-1">类型</label>
            <t-select v-model="editForm.type">
              <t-option value="video" label="视频" />
              <t-option value="article" label="文章" />
            </t-select>
          </div>
          <div>
            <label class="block text-sm text-neutral-500 mb-1">封面</label>
            <t-input v-model="editForm.cover" placeholder="封面链接" />
          </div>
        </div>

        <div v-if="editForm.type === 'video'" class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-neutral-500 mb-1">视频平台</label>
            <t-radio-group v-model="editForm.videoPlatform" variant="default-filled" size="small"
              class="flex flex-wrap gap-2">
              <t-radio-button value="bilibili">B站</t-radio-button>
              <t-radio-button value="youtube">油管</t-radio-button>
            </t-radio-group>
          </div>
          <div />
        </div>

        <div>
          <label class="block text-sm font-bold text-neutral-600 dark:text-neutral-400 mb-1">原始链接 (可选)</label>
          <t-input v-model="editForm.sourceUrl" placeholder="https://..." />
        </div>
        <div>
          <label class="block text-sm text-neutral-500 mb-1">标签</label>
          <t-checkbox-group v-model="editForm.tags" class="flex flex-wrap gap-2">
            <t-checkbox v-for="tag in tagOptions" :key="tag" :value="tag">{{ tag }}</t-checkbox>
          </t-checkbox-group>
        </div>
        <div>
          <label class="block text-sm text-neutral-500 mb-1">内容</label>
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
