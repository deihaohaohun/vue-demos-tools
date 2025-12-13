<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { nanoid } from 'nanoid'
import { MessagePlugin } from 'tdesign-vue-next'
import TodoItem from './TodoItem.vue'

const STORAGE_KEY = 'todos'
const HISTORY_KEY = 'todo_history'

const title = ref('')
const todos = ref<{ title: string; id: string; done: boolean; completedAt?: number }[]>([])
const history = ref<string[]>([])
const selectedIds = ref<Set<string>>(new Set())
const filterDate = ref('')

// 从 localStorage 加载数据
const loadData = () => {
  const storedTodos = localStorage.getItem(STORAGE_KEY)
  if (storedTodos) {
    try {
      todos.value = JSON.parse(storedTodos)
    } catch (e) {
      console.error('加载任务数据失败:', e)
    }
  }

  const storedHistory = localStorage.getItem(HISTORY_KEY)
  if (storedHistory) {
    try {
      history.value = JSON.parse(storedHistory)
    } catch (e) {
      console.error('加载历史记录失败:', e)
    }
  }
}

// 保存数据到 localStorage
const saveTodos = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value))
}

const saveHistory = () => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

// 页面加载时读取数据
onMounted(() => {
  loadData()
})

// 监听变化并保存
watch(todos, saveTodos, { deep: true })
watch(history, saveHistory, { deep: true })

const pendingTodos = computed(() => todos.value.filter((todo) => !todo.done))
const completedTodos = computed(() =>
  todos.value.filter((todo) => {
    if (!todo.done) return false
    if (!filterDate.value) return true
    if (!todo.completedAt) return false
    const date = new Date(todo.completedAt)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}` === filterDate.value
  }),
)

const updateHistory = (text: string) => {
  const index = history.value.indexOf(text)
  if (index > -1) {
    history.value.splice(index, 1)
  }
  history.value.unshift(text)
  if (history.value.length > 10) {
    history.value.pop()
  }
}

const checkDuplicate = (text: string) => {
  if (todos.value.some((todo) => todo.title === text)) {
    MessagePlugin.warning('任务已存在')
    return true
  }
  return false
}

const addTodo = () => {
  if (title.value.trim()) {
    const text = title.value.trim()
    if (checkDuplicate(text)) return

    todos.value.push({ title: text, id: nanoid(), done: false })
    updateHistory(text)
    title.value = ''
  } else {
    MessagePlugin.error('任务标题不能为空')
  }
}

const addFromHistory = (text: string) => {
  if (checkDuplicate(text)) return
  todos.value.push({ title: text, id: nanoid(), done: false })
  updateHistory(text)
  MessagePlugin.success('已从历史记录添加')
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
    if (done) {
      todo.completedAt = Date.now()
    } else {
      todo.completedAt = undefined
    }
  }
}
</script>

<template>
  <div class="w-screen h-screen dark:bg-neutral-900 overflow-hidden bg-neutral-50">
    <div class="flex gap-2 items-center justify-center pt-12 w-[800px] mx-auto">
      <t-input autofocus v-model="title" :onEnter="addTodo" placeholder="添加一个任务"></t-input>
      <t-button @click="addTodo">添加</t-button>
    </div>

    <div class="w-[800px] mx-auto mt-4 flex flex-wrap gap-2">
      <div class="text-sm text-neutral-500 flex items-center">历史记录:</div>
      <template v-if="history.length">
        <t-tag
          v-for="item in history"
          :key="item"
          variant="outline"
          class="cursor-pointer hover:bg-neutral-100 transition-colors"
          @click="addFromHistory(item)"
        >
          {{ item }}
        </t-tag>
      </template>
      <div v-else class="text-sm text-neutral-400 flex items-center">暂无历史数据</div>
    </div>

    <div class="w-[800px] mx-auto mt-4 rounded-md overflow-hidden">
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
            <div class="mb-2">
              <t-date-picker v-model="filterDate" placeholder="按日期筛选" clearable />
            </div>
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
