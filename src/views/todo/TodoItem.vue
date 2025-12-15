<script setup lang="ts">
interface Todo {
  title: string
  id: string
  done: boolean
  punchIns: number
}

interface Props {
  todo: Todo
  isSelected: boolean
}

interface Emits {
  (e: 'toggle-select', id: string): void
  (e: 'toggle-done', id: string, done: boolean): void
  (e: 'punch-in', id: string): void
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
    <div class="pointer-events-none flex items-center gap-2">
      <span>{{ todo.title }}</span>
      <t-tag v-if="!todo.done && todo.punchIns > 0" size="small" variant="light" theme="primary">
        已打卡 {{ todo.punchIns }} 次
      </t-tag>
    </div>

    <div class="flex gap-2">
      <template v-if="!todo.done">
        <t-button theme="primary" size="small" @click.stop="emit('punch-in', todo.id)">
          {{ todo.punchIns > 0 ? '再次打卡' : '打卡' }}
        </t-button>
        <t-button
          :theme="todo.punchIns > 0 ? 'success' : 'default'"
          size="small"
          @click.stop="emit('toggle-done', todo.id, true)"
        >
          {{ todo.punchIns > 0 ? '标记完成' : '完成' }}
        </t-button>
      </template>

      <t-button theme="danger" size="small" @click.stop="emit('delete', todo.id)"> 删除 </t-button>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
