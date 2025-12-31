<script setup lang="ts">
import { HistoryIcon } from 'tdesign-icons-vue-next'

defineProps<{
  hasSource: boolean
}>()

const emit = defineEmits<{
  (e: 'source'): void
  (e: 'edit'): void
  (e: 'history'): void
  (e: 'delete'): void
}>()
</script>

<template>
  <div class="flex gap-2">
    <div class="grid grid-cols-3 gap-2 flex-1">
      <t-button size="small" variant="outline" theme="primary" :disabled="!hasSource" @click.stop="emit('source')">
        再看一次
      </t-button>
      <t-button size="small" variant="outline" theme="default" @click.stop="emit('edit')">
        编辑
      </t-button>
      <t-button size="small" variant="outline" theme="danger" @click.stop="emit('delete')">
        删除
      </t-button>
    </div>
    <t-button size="small" variant="outline" theme="default" shape="square" @click.stop="emit('history')"
      class="shrink-0" title="回顾历史">
      <template #icon><history-icon /></template>
    </t-button>
  </div>
</template>
