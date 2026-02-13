<script setup lang="ts">
import { ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { UploadIcon, LinkIcon, DeleteIcon, CopyIcon } from 'tdesign-icons-vue-next'

const props = defineProps<{
  visible: boolean
  currentWallpaper: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'update:wallpaper', value: string): void
}>()

const activeTab = ref('local')
const inputUrl = ref('')
const previewUrl = ref('')
const wallpaperHistory = ref<string[]>([])

const loadHistory = () => {
  try {
    const history = localStorage.getItem('todo_wallpaper_history')
    if (history) {
      wallpaperHistory.value = JSON.parse(history)
    }
  } catch (e) {
    console.error('Failed to load wallpaper history', e)
  }
}

const saveHistory = () => {
  try {
    localStorage.setItem('todo_wallpaper_history', JSON.stringify(wallpaperHistory.value))
  } catch (e) {
    console.error('Failed to save wallpaper history', e)
    // If quota exceeded, try to remove oldest
    if (wallpaperHistory.value.length > 5) {
      wallpaperHistory.value = wallpaperHistory.value.slice(0, 5)
      try {
        localStorage.setItem('todo_wallpaper_history', JSON.stringify(wallpaperHistory.value))
      } catch (err) {
        console.error('Still failed to save history after trimming', err)
      }
    }
  }
}

const addToHistory = (url: string) => {
  if (!url) return
  // Remove if exists to move to top
  const idx = wallpaperHistory.value.indexOf(url)
  if (idx > -1) {
    wallpaperHistory.value.splice(idx, 1)
  }
  wallpaperHistory.value.unshift(url)
  // Limit to 10 items
  if (wallpaperHistory.value.length > 10) {
    wallpaperHistory.value.pop()
  }
  saveHistory()
}

const selectFromHistory = (url: string) => {
  previewUrl.value = url
}

const deleteFromHistory = (url: string, e: Event) => {
  e.stopPropagation()
  const idx = wallpaperHistory.value.indexOf(url)
  if (idx > -1) {
    wallpaperHistory.value.splice(idx, 1)
    saveHistory()
    MessagePlugin.success('已从历史记录移除')
  }
}

// Reset state when opened
watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadHistory()
      previewUrl.value = props.currentWallpaper
      inputUrl.value = ''
      if (props.currentWallpaper && props.currentWallpaper.startsWith('http')) {
        // create a temporary check, though robust detection is harder, simple check is ok
        if (!props.currentWallpaper.startsWith('data:')) {
          activeTab.value = 'url'
          // Do not pre-fill inputUrl so user can easily paste a new one
          // inputUrl.value = props.currentWallpaper
        }
      }
    }
  },
)

const compressImage = (dataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = dataUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }

      // Calculate new dimensions (max 1920x1080)
      let width = img.width
      let height = img.height
      const MAX_WIDTH = 1920
      const MAX_HEIGHT = 1080

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width
          width = MAX_WIDTH
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height
          height = MAX_HEIGHT
        }
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      // Compress as JPEG with 0.7 quality
      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7)
      resolve(compressedDataUrl)
    }
    img.onerror = () => resolve(dataUrl)
  })
}

const handleFileChange = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    MessagePlugin.warning('请选择图片文件')
    return
  }

  // Limit size to 10MB (we will compress it anyway)
  if (file.size > 10 * 1024 * 1024) {
    MessagePlugin.warning('图片原始大小不能超过 10MB')
    return
  }

  const reader = new FileReader()
  reader.onload = async (e) => {
    const rawResult = e.target?.result as string
    try {
      previewUrl.value = await compressImage(rawResult)
    } catch (err) {
      console.error('Compression failed', err)
      previewUrl.value = rawResult
    }
  }
  reader.readAsDataURL(file)
}

const handlePaste = async () => {
  try {
    const items = await navigator.clipboard.read()
    for (const item of items) {
      if (
        item.types.includes('image/png') ||
        item.types.includes('image/jpeg') ||
        item.types.includes('image/webp')
      ) {
        const type = item.types.find((t) => t.startsWith('image/'))
        if (!type) continue
        const blob = await item.getType(type)
        const reader = new FileReader()
        reader.onload = async (e) => {
          const rawResult = e.target?.result as string
          try {
            previewUrl.value = await compressImage(rawResult)
            MessagePlugin.success('已从剪贴板读取并压缩图片')
          } catch (err) {
            console.error(err)
            previewUrl.value = rawResult
            MessagePlugin.success('已从剪贴板读取图片')
          }
        }
        reader.readAsDataURL(blob)
        return
      }
    }
    MessagePlugin.warning('剪贴板中没有图片')
  } catch (err) {
    console.error(err)
    MessagePlugin.error('无法读取剪贴板，请检查权限')
  }
}

const handleUrlInput = () => {
  if (inputUrl.value) {
    previewUrl.value = inputUrl.value
  }
}

const confirm = () => {
  if (previewUrl.value) {
    addToHistory(previewUrl.value)
  }
  emit('update:wallpaper', previewUrl.value)
  emit('update:visible', false)
  MessagePlugin.success('壁纸设置成功')
}

const clearWallpaper = () => {
  previewUrl.value = ''
  emit('update:wallpaper', '')
  emit('update:visible', false)
  MessagePlugin.success('已清除壁纸')
}

const close = () => {
  emit('update:visible', false)
}
</script>

<template>
  <t-dialog
    :visible="visible"
    header="设置壁纸"
    width="500px"
    @close="close"
    @confirm="confirm"
    :confirm-btn="{ content: '应用壁纸', theme: 'primary' }"
    :cancel-btn="{ content: '取消', variant: 'outline' }"
  >
    <div class="flex flex-col gap-4">
      <t-tabs v-model="activeTab">
        <t-tab-panel value="local" label="本地文件">
          <div class="pt-4 flex flex-col items-center justify-center gap-4">
            <div
              class="w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-neutral-800 transition-colors relative group"
            >
              <input
                type="file"
                accept="image/*"
                class="absolute inset-0 opacity-0 cursor-pointer z-10"
                @change="handleFileChange"
              />
              <upload-icon size="32" class="text-neutral-400 group-hover:text-teal-500 mb-2" />
              <div class="text-sm text-neutral-500 group-hover:text-teal-600">
                点击选择或拖拽图片到此处
              </div>
              <div class="text-xs text-neutral-400 mt-1">支持 JPG, PNG, WebP (最大 5MB)</div>
            </div>
          </div>
        </t-tab-panel>

        <t-tab-panel value="clipboard" label="剪贴板">
          <div class="pt-4 flex flex-col items-center justify-center gap-4">
            <div class="text-center text-neutral-500 text-sm mb-2">
              如果您的剪贴板中有图片，可以直接点击下方按钮粘贴
            </div>
            <t-button @click="handlePaste" block variant="outline">
              <template #icon><copy-icon /></template>
              从剪贴板粘贴
            </t-button>
          </div>
        </t-tab-panel>

        <t-tab-panel value="url" label="在线地址">
          <div class="pt-4 flex flex-col gap-4">
            <t-input
              v-model="inputUrl"
              placeholder="请输入图片 URL (https://...)"
              @change="handleUrlInput"
              clearable
            >
              <template #prefix-icon><link-icon /></template>
            </t-input>
            <div class="text-xs text-neutral-400">请输入有效的图片链接，建议使用 HTTPS 链接</div>
          </div>
        </t-tab-panel>

        <t-tab-panel value="history" label="历史记录">
          <div class="pt-4">
            <div v-if="wallpaperHistory.length === 0" class="text-center text-neutral-400 py-8">
              暂无历史记录
            </div>
            <div v-else class="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-1">
              <div
                v-for="(url, index) in wallpaperHistory"
                :key="index"
                class="relative group cursor-pointer aspect-video rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden"
                :class="{ 'ring-2 ring-teal-500': previewUrl === url }"
                @click="selectFromHistory(url)"
              >
                <div
                  class="w-full h-full bg-cover bg-center"
                  :style="{ backgroundImage: `url(${url})` }"
                ></div>
                <div
                  class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1 hover:bg-red-500 text-white"
                  @click="(e) => deleteFromHistory(url, e)"
                >
                  <delete-icon size="12" />
                </div>
              </div>
            </div>
          </div>
        </t-tab-panel>
      </t-tabs>

      <!-- Preview Area -->
      <div v-if="previewUrl" class="mt-2">
        <div class="text-sm font-bold mb-2 text-neutral-700 dark:text-neutral-300">预览</div>
        <div
          class="w-full h-48 rounded-lg bg-cover bg-center shadow-inner border border-neutral-200 dark:border-neutral-700 relative overflow-hidden group"
          :style="{ backgroundImage: `url(${previewUrl})` }"
        >
          <div
            class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            <div class="bg-white/90 dark:bg-black/80 px-3 py-1 rounded-full text-xs font-medium">
              预览效果
            </div>
          </div>
        </div>
        <div class="mt-2 flex justify-end">
          <t-button theme="danger" variant="text" size="small" @click="previewUrl = ''">
            <template #icon><delete-icon /></template>
            移除当前选择
          </t-button>
        </div>
      </div>

      <div
        v-else-if="currentWallpaper && !previewUrl"
        class="mt-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded text-center text-neutral-500 text-sm"
      >
        当前未选择新壁纸，将保持现有设置
      </div>

      <div
        class="border-t border-neutral-100 dark:border-neutral-700 pt-4 flex justify-between items-center"
        v-if="currentWallpaper"
      >
        <span class="text-sm text-neutral-500">已有壁纸正在使用中</span>
        <t-button theme="danger" variant="outline" size="small" @click="clearWallpaper">
          清除壁纸
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>
