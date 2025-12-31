<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useKnowledgeStore } from './useKnowledgeStore'
import { AiEditor } from 'aieditor'
import { MessagePlugin } from 'tdesign-vue-next'
import { AddIcon, RollbackIcon, HistoryIcon } from 'tdesign-icons-vue-next'
import dayjs from 'dayjs'

const props = defineProps<{
  visible: boolean
  resourceId: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', visible: boolean): void
}>()

const store = useKnowledgeStore()
const resource = computed(() => store.getResourceById(props.resourceId))
const reviews = computed(() => {
  const list = store.getReviewsByResourceId(props.resourceId)
  return [...list].sort((a, b) => b.timestamp - a.timestamp)
})

const mode = ref<'list' | 'add'>('list')
const editorEl = ref<HTMLElement | null>(null)
let editor: AiEditor | null = null

const formatDate = (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm')

const handleClose = () => {
  emit('update:visible', false)
  mode.value = 'list'
}

const disableAiEditorResize = (root: HTMLElement | null) => {
  if (!root) return
  const nodes = root.querySelectorAll<HTMLElement>('*')
  nodes.forEach((el) => {
    el.style.setProperty('resize', 'none', 'important')
  })
}

const syncEditorLayout = () => {
  requestAnimationFrame(() => {
    window.dispatchEvent(new Event('resize'))
  })
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'))
  }, 60)
}

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      mode.value = 'list'
      if (editor) {
        editor.destroy()
        editor = null
      }
    }
  }
)

watch(
  () => mode.value,
  async (val) => {
    if (val === 'add') {
      await nextTick()
      if (!editorEl.value) return
      if (editor) editor.destroy()
      editor = new AiEditor({
        element: editorEl.value,
        placeholder: '写下你的感悟、笔记或复习心得...',
        content: ''
      })
      disableAiEditorResize(editorEl.value)
      syncEditorLayout()
    } else {
      if (editor) {
        editor.destroy()
        editor = null
      }
    }
  }
)

const handleSave = () => {
  if (!editor) return
  const content = editor.getHtml()
  if (!content.trim() || content === '<p><br></p>') {
    MessagePlugin.warning('请输入内容')
    return
  }
  store.addReview(props.resourceId, content)
  MessagePlugin.success('记录添加成功')
  mode.value = 'list'
}

onBeforeUnmount(() => {
  if (editor) {
    editor.destroy()
    editor = null
  }
})
</script>

<template>
  <t-dialog :visible="visible" :header="resource ? `回顾历史 - ${resource.title}` : '回顾历史'" width="800px" :footer="false"
    @close="handleClose">
    <div class="min-h-[400px] max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <!-- List Mode -->
      <div v-if="mode === 'list'" class="space-y-6">
        <div
          class="flex justify-between items-center sticky top-0 bg-white dark:bg-neutral-800 z-10 py-2 border-b border-neutral-100 dark:border-neutral-700">
          <div class="text-neutral-500 text-sm">
            共 {{ reviews.length }} 条记录
          </div>
          <t-button theme="primary" @click="mode = 'add'">
            <template #icon><add-icon /></template>
            记录新心得
          </t-button>
        </div>

        <t-timeline v-if="reviews.length > 0" mode="left">
          <t-timeline-item v-for="review in reviews" :key="review.id" :label="formatDate(review.timestamp)">
            <div
              class="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-100 dark:border-neutral-700">
              <div v-if="review.content" class="text-sm text-neutral-700 dark:text-neutral-300 rich-text-content"
                v-html="review.content"></div>
              <div v-else class="text-sm text-neutral-400">无内容</div>
            </div>
          </t-timeline-item>
        </t-timeline>

        <div v-else class="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
          <history-icon size="32" />
          <span>暂无回顾历史，开始第一次复习吧</span>
        </div>
      </div>

      <!-- Add Mode -->
      <div v-else class="space-y-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-lg">记录心得</h3>
          <t-button variant="text" theme="default" @click="mode = 'list'">
            <template #icon><rollback-icon /></template>
            返回列表
          </t-button>
        </div>

        <div ref="editorEl"
          class="aieditor-host w-full dark:border-neutral-700 rounded-md overflow-hidden bg-white dark:bg-neutral-900">
        </div>

        <div class="flex justify-end gap-2 pt-4">
          <t-button variant="outline" @click="mode = 'list'">取消</t-button>
          <t-button theme="primary" @click="handleSave">保存记录</t-button>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<style scoped>
.aieditor-host {
  height: 400px;
}

/* Reusing the styles for aieditor */
.aieditor-host :deep(.aie-container),
.aieditor-host :deep(.aie-main),
.aieditor-host :deep(.aie-editor),
.aieditor-host :deep(.aie-content) {
  height: 100% !important;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e5e5e5;
  border-radius: 3px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #404040;
}
</style>
