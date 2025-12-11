<script setup lang="ts">
import { ref } from 'vue';
import { nanoid } from 'nanoid';
import { MessagePlugin } from 'tdesign-vue-next';

const title = ref('')
const todos = ref<{ title: string, id: string, done: boolean }[]>([])
const selectedIds = ref<Set<string>>(new Set())

const addTodo = () => {
  if (title.value.trim()) {
    todos.value.push({ title: title.value.trim(), id: nanoid(), done: false })
    title.value = ''
  } else {
    MessagePlugin.error('任务标题不能为空')
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
            <template v-if="todos.length">
              <label v-for="todo in todos" :key="todo.id"
                class="p-2 dark:hover:bg-neutral-950 hover:bg-neutral-100 transition-all ease-in-out duration-200 rounded-md flex items-center justify-between cursor-pointer mb-2 last-of-type:mb-0"
                :class="{ 'dark:bg-neutral-950': selectedIds.has(todo.id), 'bg-neutral-100': selectedIds.has(todo.id) }"
                @click.stop="selectedIds.has(todo.id) ? selectedIds.delete(todo.id) : selectedIds.add(todo.id)">
                <t-checkbox v-model="todo.done">{{ todo.title }}</t-checkbox>

                <t-button theme="danger" size="small" @click.stop>删除</t-button>
              </label>
            </template>
            <template v-else>
              <div class="w-full h-[300px] flex flex-col items-center justify-center">
                <t-empty />
              </div>
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
