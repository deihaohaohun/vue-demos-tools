<script setup lang="ts">
import { HistoryIcon } from 'tdesign-icons-vue-next'

defineProps<{
  canOpenSource: boolean
}>()

const emit = defineEmits<{
  (e: 'open-source'): void
  (e: 'detail'): void
  (e: 'edit'): void
  (e: 'history'): void
}>()
</script>

<template>
  <div class="mt-3 flex gap-2">
    <div class="grid grid-cols-2 gap-2 flex-1">
      <t-button size="small" theme="primary" @click.stop="emit('detail')">
        详情
      </t-button>
      <t-button size="small" variant="outline" theme="default" @click.stop="emit('edit')">
        编辑
      </t-button>
    </div>
    <t-button size="small" variant="outline" theme="default" shape="square" @click.stop="emit('history')"
      class="shrink-0" title="回顾历史">
      <template #icon><history-icon /></template>
    </t-button>
  </div>
</template>
