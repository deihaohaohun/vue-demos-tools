<script setup lang="ts">
import { ref } from 'vue';
import { nanoid } from 'nanoid';

const title = ref('')
const todos = ref<{ title: string, id: string, done: boolean }[]>([])
const selectedIds = ref<Set<string>>(new Set())

const addTodo = () => {
  if (title.value.trim()) {
    todos.value.push({ title: title.value.trim(), id: nanoid(), done: false })
    title.value = ''
  }
}
</script>

<template>
  <div class="w-screen h-screen dark:bg-neutral-900 overflow-hidden">
    <div class="flex gap-2 items-center justify-center pt-12 w-[800px] mx-auto">
      <t-input autofocus v-model="title" :onEnter="addTodo" placeholder="添加一个任务"></t-input>
      <t-button @click="addTodo">添加</t-button>
    </div>

    <div class="w-[800px] mx-auto mt-12 rounded-md overflow-hidden">
      <t-tabs :default-value="1">
        <t-tab-panel :value="1" label="待完成">
          <div class="p-2">
            <template v-if="todos.length">
              <label v-for="todo in todos" :key="todo.id"
                class="p-2 dark:hover:bg-neutral-950 transition-all ease-in-out duration-200 rounded-md flex items-center cursor-pointer mb-2 last-of-type:mb-0"
                :class="{ 'bg-neutral-950': selectedIds.has(todo.id) }"
                @click.stop="selectedIds.has(todo.id) ? selectedIds.delete(todo.id) : selectedIds.add(todo.id)">
                <t-checkbox v-model="todo.done">{{ todo.title }}</t-checkbox>
              </label>
            </template>
            <template v-else>
              <p class="text-center">暂无数据</p>
            </template>
          </div>
        </t-tab-panel>
        <t-tab-panel :value="2" label="已完成">
          <p style="margin: 20px">选项卡2内容区</p>
        </t-tab-panel>
      </t-tabs>
    </div>
  </div>
</template>

<style lang="scss" scoped></style>
