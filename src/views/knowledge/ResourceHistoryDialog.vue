<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useKnowledgeStore } from './useKnowledgeStore'
import { MessagePlugin } from 'tdesign-vue-next'
import { HistoryIcon } from 'tdesign-icons-vue-next'
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
const views = computed(() => {
  const list = store.getViewsByResourceId(props.resourceId)
  return [...list].sort((a, b) => b.timestamp - a.timestamp)
})

const editingId = ref<string | null>(null)
const draftDescription = ref('')

const formatDate = (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss')

const handleClose = () => {
  emit('update:visible', false)
  editingId.value = null
  draftDescription.value = ''
}

watch(
  () => props.visible,
  (val) => {
    if (!val) {
      editingId.value = null
      draftDescription.value = ''
    }
  },
)

const startEdit = (id: string) => {
  const target = views.value.find((v) => v.id === id)
  if (!target) return
  editingId.value = id
  draftDescription.value = target.description || ''
}

const cancelEdit = () => {
  editingId.value = null
  draftDescription.value = ''
}

const saveEdit = () => {
  if (!editingId.value) return
  const ok = store.updateViewRecordDescription(editingId.value, draftDescription.value)
  if (ok) {
    MessagePlugin.success('保存成功')
    editingId.value = null
    draftDescription.value = ''
  } else {
    MessagePlugin.error('保存失败')
  }
}
</script>

<template>
  <t-dialog :visible="visible" :header="resource ? `回顾历史 - ${resource.title}` : '回顾历史'" width="800px" :footer="false"
    @close="handleClose">
    <div class="min-h-[400px] max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <div
        class="flex justify-between items-center sticky mb-2 top-0 bg-white dark:bg-neutral-800 z-10 py-2 border-b border-neutral-100 dark:border-neutral-700">
        <div class="text-neutral-500 text-sm">
          共 {{ views.length }} 条记录
        </div>
      </div>

      <t-timeline v-if="views.length > 0" mode="left" class="mt-4">
        <t-timeline-item v-for="item in views" :key="item.id" :label="formatDate(item.timestamp)">
          <div
            class="bg-neutral-50 dark:bg-neutral-900 p-4 rounded-lg border border-neutral-100 dark:border-neutral-700">
            <div class="flex items-start justify-between gap-3 mb-2">
              <div class="text-xs text-neutral-400">
                查看时间：{{ formatDate(item.timestamp) }}
              </div>
              <t-button v-if="editingId !== item.id" size="small" variant="text" theme="default"
                @click="startEdit(item.id)">
                修改描述
              </t-button>
            </div>

            <div v-if="editingId === item.id" class="space-y-3">
              <t-textarea v-model="draftDescription" placeholder="可选：为这次查看写一句描述..." />
              <div class="flex justify-end gap-2">
                <t-button size="small" variant="outline" @click="cancelEdit">取消</t-button>
                <t-button size="small" theme="primary" @click="saveEdit">保存</t-button>
              </div>
            </div>
            <div v-else class="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              <span v-if="item.description">{{ item.description }}</span>
              <span v-else class="text-neutral-400">无描述</span>
            </div>
          </div>
        </t-timeline-item>
      </t-timeline>

      <div v-else class="py-12 flex flex-col items-center justify-center text-neutral-400 gap-2">
        <history-icon size="32" />
        <span>暂无查看记录</span>
      </div>
    </div>
  </t-dialog>
</template>

<style scoped>
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
