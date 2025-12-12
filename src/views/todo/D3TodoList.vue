<script setup lang="ts">
import { ref, computed } from 'vue'
import { nanoid } from 'nanoid'
import { MessagePlugin } from 'tdesign-vue-next'
import TodoItem from './TodoItem.vue'

const title = ref('')
const todos = ref<{ title: string; id: string; done: boolean }[]>([])
const selectedIds = ref<Set<string>>(new Set())

const pendingTodos = computed(() => todos.value.filter((todo) => !todo.done))
const completedTodos = computed(() => todos.value.filter((todo) => todo.done))

const addTodo = () => {
  if (title.value.trim()) {
    todos.value.push({ title: title.value.trim(), id: nanoid(), done: false })
    title.value = ''
  } else {
    MessagePlugin.error('任务标题不能为空')
  }
}

const deleteTodo = (id: string) => {
  todos.value = todos.value.filter((todo) => todo.id !== id)
  selectedIds.value.delete(id)
  MessagePlugin.success('任务已删除')
}

const toggleSelect = (id: string) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id)
  } else {
    selectedIds.value.add(id)
  }
}

const toggleDone = (id: string, done: boolean) => {
  const todo = todos.value.find((t) => t.id === id)
  if (todo) {
    todo.done = done
  }
}
</script>

<template>
  <div class="w-screen h-screen dark:bg-neutral-900 overflow-hidden bg-neutral-50">
    <div class="flex gap-2 items-center justify-center pt-12 w-[800px] mx-auto">
      <t-input autofocus v-model="title" :onEnter="addTodo" placeholder="添加一个任务"></t-input>
      <t-button @click="addTodo">添加</t-button>
    </div>

    <div class="w-[800px] mx-auto mt-12 rounded-md overflow-hidden">
      <t-tabs :default-value="1">
        <t-tab-panel :value="1" label="待完成">
          <div class="p-2">
            <template v-if="pendingTodos.length">
              <TodoItem
                v-for="todo in pendingTodos"
                :key="todo.id"
                :todo="todo"
                :is-selected="selectedIds.has(todo.id)"
                @toggle-select="toggleSelect"
                @toggle-done="toggleDone"
                @delete="deleteTodo"
              />
            </template>
            <template v-else>
              <div class="w-full h-[300px] flex flex-col items-center justify-center">
                <t-empty />
              </div>
            </template>
          </div>
        </t-tab-panel>
        <t-tab-panel :value="2" label="已完成">
          <div class="p-2">
            <template v-if="completedTodos.length">
              <TodoItem
                v-for="todo in completedTodos"
                :key="todo.id"
                :todo="todo"
                :is-selected="selectedIds.has(todo.id)"
                @toggle-select="toggleSelect"
                @toggle-done="toggleDone"
                @delete="deleteTodo"
              />
            </template>
            <template v-else>
              <div class="w-full h-[300px] flex flex-col items-center justify-center">
                <t-empty />
              </div>
            </template>
          </div>
        </t-tab-panel>
      </t-tabs>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
