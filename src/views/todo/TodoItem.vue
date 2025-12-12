<script setup lang="ts">
interface Todo {
  title: string
  id: string
  done: boolean
}

interface Props {
  todo: Todo
  isSelected: boolean
}

interface Emits {
  (e: 'toggle-select', id: string): void
  (e: 'toggle-done', id: string, done: boolean): void
  (e: 'delete', id: string): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <div
    class="p-2 dark:hover:bg-neutral-950 hover:bg-neutral-100 transition-all ease-in-out duration-200 rounded-md flex items-center justify-between cursor-pointer mb-2 last-of-type:mb-0"
    :class="{
      'dark:bg-neutral-950': isSelected,
      'bg-neutral-100': isSelected,
    }"
    @click.stop="emit('toggle-select', todo.id)"
  >
    <div class="pointer-events-none">
      {{ todo.title }}
    </div>

    <div class="flex gap-2">
      <t-button
        v-if="!todo.done"
        theme="primary"
        size="small"
        @click.stop="emit('toggle-done', todo.id, true)"
      >
        完成
      </t-button>
      <t-button
        v-else
        theme="default"
        size="small"
        @click.stop="emit('toggle-done', todo.id, false)"
      >
        撤销
      </t-button>
      <t-button theme="danger" size="small" @click.stop="emit('delete', todo.id)"> 删除 </t-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
