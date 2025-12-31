import { ref, watch, computed } from 'vue'
import { nanoid } from 'nanoid'

export type ResourceType = 'video' | 'article'
export type VideoPlatform = 'bilibili' | 'youtube'

export interface Resource {
  id: string
  title: string
  type: ResourceType
  tags: string[]
  videoPlatform?: VideoPlatform
  cover?: string
  sourceUrl?: string
  content?: string // Rich text content (HTML)
  lastViewedAt?: number
  createdAt: number
  updatedAt: number
}

export interface ReviewRecord {
  id: string
  resourceId: string
  timestamp: number
  content?: string // Rich text notes (HTML)
}

const RESOURCES_KEY = 'knowledge_resources'
const REVIEWS_KEY = 'knowledge_reviews'

export const useKnowledgeStore = () => {
  const resources = ref<Resource[]>([])
  const reviews = ref<ReviewRecord[]>([])

  // Load from localStorage
  const loadData = () => {
    const storedResources = localStorage.getItem(RESOURCES_KEY)
    if (storedResources) {
      try {
        const parsed = JSON.parse(storedResources) as unknown
        const list: unknown[] = Array.isArray(parsed) ? parsed : []
        resources.value = list.filter((r) => {
          const t = (r as { type?: unknown } | null)?.type
          return t === 'video' || t === 'article'
        }) as Resource[]
      } catch (e) {
        console.error('Failed to load resources', e)
      }
    }

    const storedReviews = localStorage.getItem(REVIEWS_KEY)
    if (storedReviews) {
      try {
        reviews.value = JSON.parse(storedReviews)
      } catch (e) {
        console.error('Failed to load reviews', e)
      }
    }
  }

  // Save to localStorage
  watch(
    resources,
    (val) => {
      localStorage.setItem(RESOURCES_KEY, JSON.stringify(val))
    },
    { deep: true },
  )

  watch(
    reviews,
    (val) => {
      localStorage.setItem(REVIEWS_KEY, JSON.stringify(val))
    },
    { deep: true },
  )

  const addResource = (resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now()
    const newResource: Resource = {
      ...resource,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }
    resources.value.unshift(newResource)
    return newResource
  }

  const updateResource = (id: string, updates: Partial<Omit<Resource, 'id' | 'createdAt'>>) => {
    const index = resources.value.findIndex((r) => r.id === id)
    if (index !== -1) {
      resources.value[index] = {
        ...resources.value[index],
        ...updates,
        updatedAt: Date.now(),
      } as Resource
      return true
    }
    return false
  }

  const deleteResource = (id: string) => {
    const index = resources.value.findIndex((r) => r.id === id)
    if (index !== -1) {
      resources.value.splice(index, 1)
      // Also delete related reviews
      reviews.value = reviews.value.filter((r) => r.resourceId !== id)
      return true
    }
    return false
  }

  const markResourceViewed = (id: string) => {
    return updateResource(id, { lastViewedAt: Date.now() })
  }

  const addReview = (resourceId: string, content: string) => {
    const newReview: ReviewRecord = {
      id: nanoid(),
      resourceId,
      timestamp: Date.now(),
      content,
    }
    reviews.value.unshift(newReview)
    return newReview
  }

  const getResourceById = (id: string) => {
    return resources.value.find((r) => r.id === id)
  }

  const getReviewsByResourceId = (resourceId: string) => {
    return reviews.value
      .filter((r) => r.resourceId === resourceId)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  const getAllTags = computed(() => {
    const tags = new Set<string>()
    resources.value.forEach((r) => {
      r.tags.forEach((t) => tags.add(t))
    })
    return Array.from(tags)
  })

  // Initialize data
  loadData()

  return {
    resources,
    reviews,
    addResource,
    updateResource,
    deleteResource,
    markResourceViewed,
    addReview,
    getResourceById,
    getReviewsByResourceId,
    getAllTags,
  }
}
