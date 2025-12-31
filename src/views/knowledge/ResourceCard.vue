<script setup lang="ts">
import { computed } from 'vue'
import { useKnowledgeStore, type Resource } from './useKnowledgeStore'
import ResourceCardActionsVideo from './ResourceCardActionsVideo.vue'
import ResourceCardActionsArticle from './ResourceCardActionsArticle.vue'
import {
  VideoIcon,
  ArticleIcon,
  TimeIcon
} from 'tdesign-icons-vue-next'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const props = defineProps<{
  resource: Resource
}>()

const emit = defineEmits<{
  (e: 'detail', id: string): void
  (e: 'edit', id: string): void
  (e: 'history', id: string): void
}>()

const store = useKnowledgeStore()

const typeLabel = computed(() => (props.resource.type === 'video' ? '视频' : '文章'))

const typeIcon = computed(() => (props.resource.type === 'video' ? VideoIcon : ArticleIcon))

const typeColor = computed(() =>
  props.resource.type === 'video'
    ? 'text-purple-500 bg-purple-50 dark:bg-purple-900/20'
    : 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
)

const formatDate = (ts: number) => {
  return dayjs(ts).format('YYYY-MM-DD')
}

const formatViewedAt = (ts: number) => {
  return dayjs(ts).fromNow()
}

const openSource = () => {
  const url = props.resource.sourceUrl?.trim()
  if (!url) return
  store.markResourceViewed(props.resource.id)
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div
    class="group bg-white dark:bg-neutral-800 rounded-xl border border-neutral-100 dark:border-neutral-700 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col h-full">
    <!-- Cover Image (Optional) -->
    <div v-if="resource.cover"
      class="aspect-video w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900 relative cursor-pointer"
      @click="openSource">
      <img :src="resource.cover"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="cover" />
      <div
        class="absolute top-2 right-2 w-7 h-7 rounded bg-white/80 dark:bg-black/50 backdrop-blur-md flex items-center justify-center"
        :class="typeColor">
        <component :is="typeIcon" size="14" />
      </div>
    </div>

    <!-- No Cover Fallback -->
    <div v-else class="p-4 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
      <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="typeColor">
        <component :is="typeIcon" size="20" />
      </div>
      <div class="px-2 py-1 rounded-md text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
        <span class="capitalize">{{ typeLabel }}</span>
      </div>
    </div>

    <div class="p-4 flex flex-col flex-1">
      <h3
        class="text-base font-bold text-neutral-800 dark:text-neutral-100 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
        {{ resource.title }}
      </h3>

      <div class="mt-auto pt-3 flex items-center justify-between gap-2">
        <div class="flex flex-wrap gap-1">
          <t-tag v-for="tag in resource.tags.slice(0, 3)" :key="tag" size="small" variant="light" theme="default"
            class="text-xs">
            #{{ tag }}
          </t-tag>
          <span v-if="resource.tags.length > 3" class="text-xs text-neutral-400">+{{ resource.tags.length - 3 }}</span>
        </div>

        <div class="text-xs text-neutral-400 flex items-center gap-1">
          <time-icon />
          <span v-if="resource.lastViewedAt">上次查看 {{ formatViewedAt(resource.lastViewedAt) }}</span>
          <span v-else>{{ formatDate(resource.createdAt) }}</span>
        </div>
      </div>

      <ResourceCardActionsVideo v-if="resource.type === 'video'" class="mt-3" :has-source="!!resource.sourceUrl"
        @source="openSource" @edit="emit('edit', resource.id)" @history="emit('history', resource.id)" />
      <ResourceCardActionsArticle v-else class="mt-3" @detail="emit('detail', resource.id)"
        @edit="emit('edit', resource.id)" @history="emit('history', resource.id)" />
    </div>
  </div>
</template>
