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
  viewCount: number
  createdAt: number
  updatedAt: number
}

export interface ViewRecord {
  id: string
  resourceId: string
  timestamp: number
  description: string
}

const RESOURCES_KEY = 'knowledge_resources'
const VIEWS_KEY = 'knowledge_views'
const LEGACY_REVIEWS_KEY = 'knowledge_reviews'

export const useKnowledgeStore = () => {
  const resources = ref<Resource[]>([])
  const views = ref<ViewRecord[]>([])

  // Load from localStorage
  const loadData = () => {
    const storedResources = localStorage.getItem(RESOURCES_KEY)
    if (storedResources) {
      try {
        const parsed = JSON.parse(storedResources) as unknown
        const list: unknown[] = Array.isArray(parsed) ? parsed : []
        resources.value = list
          .filter((r) => {
            const t = (r as { type?: unknown } | null)?.type
            return t === 'video' || t === 'article'
          })
          .map((r) => {
            const rr = r as Partial<Resource>
            return {
              id: String(rr.id || ''),
              title: String(rr.title || ''),
              type: (rr.type === 'video' ? 'video' : 'article') as ResourceType,
              tags: Array.isArray(rr.tags) ? rr.tags.map((t) => String(t)) : [],
              videoPlatform: rr.videoPlatform,
              cover: rr.cover,
              sourceUrl: rr.sourceUrl,
              content: rr.content,
              lastViewedAt: typeof rr.lastViewedAt === 'number' ? rr.lastViewedAt : undefined,
              viewCount: typeof rr.viewCount === 'number' ? rr.viewCount : 0,
              createdAt: typeof rr.createdAt === 'number' ? rr.createdAt : Date.now(),
              updatedAt: typeof rr.updatedAt === 'number' ? rr.updatedAt : Date.now(),
            } as Resource
          })
      } catch (e) {
        console.error('Failed to load resources', e)
      }
    }

    const htmlToText = (html: string) => {
      try {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        return (doc.body.textContent || '').trim()
      } catch {
        return html.replace(/<[^>]*>/g, '').trim()
      }
    }

    const storedViews = localStorage.getItem(VIEWS_KEY)
    const storedLegacyReviews = localStorage.getItem(LEGACY_REVIEWS_KEY)

    if (storedViews) {
      try {
        const parsed = JSON.parse(storedViews) as unknown
        const list: unknown[] = Array.isArray(parsed) ? parsed : []
        views.value = list.map((v) => {
          const vv = v as Partial<ViewRecord> & { content?: unknown }
          const description =
            typeof vv.description === 'string'
              ? vv.description
              : typeof vv.content === 'string'
                ? htmlToText(vv.content)
                : ''
          return {
            id: String(vv.id || ''),
            resourceId: String(vv.resourceId || ''),
            timestamp: typeof vv.timestamp === 'number' ? vv.timestamp : Date.now(),
            description,
          }
        })
      } catch (e) {
        console.error('Failed to load views', e)
      }
    } else if (storedLegacyReviews) {
      try {
        const parsed = JSON.parse(storedLegacyReviews) as unknown
        const list: unknown[] = Array.isArray(parsed) ? parsed : []
        views.value = list.map((r) => {
          const rr = r as {
            id?: unknown
            resourceId?: unknown
            timestamp?: unknown
            content?: unknown
          }
          return {
            id: String(rr.id || ''),
            resourceId: String(rr.resourceId || ''),
            timestamp: typeof rr.timestamp === 'number' ? rr.timestamp : Date.now(),
            description: typeof rr.content === 'string' ? htmlToText(rr.content) : '',
          }
        })
        localStorage.setItem(VIEWS_KEY, JSON.stringify(views.value))
      } catch (e) {
        console.error('Failed to load legacy reviews', e)
      }
    }

    const latestTsByResourceId = new Map<string, number>()
    const viewCountByResourceId = new Map<string, number>()
    views.value.forEach((v) => {
      if (!v.resourceId) return
      viewCountByResourceId.set(v.resourceId, (viewCountByResourceId.get(v.resourceId) || 0) + 1)
      const prev = latestTsByResourceId.get(v.resourceId)
      if (!prev || v.timestamp > prev) latestTsByResourceId.set(v.resourceId, v.timestamp)
    })

    resources.value = resources.value.map((r) => {
      const count = viewCountByResourceId.get(r.id) || 0
      const latest = latestTsByResourceId.get(r.id)
      const existingCount = typeof r.viewCount === 'number' ? r.viewCount : 0
      const mergedCount = Math.max(existingCount, count)
      const viewCount = mergedCount > 0 ? mergedCount : 1

      const baseTs = typeof r.createdAt === 'number' ? r.createdAt : Date.now()
      const mergedLastViewedAt =
        typeof latest === 'number'
          ? Math.max(r.lastViewedAt || 0, latest) || latest
          : r.lastViewedAt
      const lastViewedAt = typeof mergedLastViewedAt === 'number' ? mergedLastViewedAt : baseTs
      return {
        ...r,
        viewCount,
        lastViewedAt,
      }
    })

    const resourceIdsWithViews = new Set(views.value.map((v) => v.resourceId).filter(Boolean))
    const missing = resources.value.filter((r) => r.id && !resourceIdsWithViews.has(r.id))
    if (missing.length) {
      missing.forEach((r) => {
        views.value.push({
          id: nanoid(),
          resourceId: r.id,
          timestamp: r.lastViewedAt || r.createdAt,
          description: '',
        })
      })
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
    views,
    (val) => {
      localStorage.setItem(VIEWS_KEY, JSON.stringify(val))
    },
    { deep: true },
  )

  const addResource = (
    resource: Omit<Resource, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'lastViewedAt'>,
  ) => {
    const now = Date.now()
    const newResource: Resource = {
      ...resource,
      id: nanoid(),
      viewCount: 1,
      lastViewedAt: now,
      createdAt: now,
      updatedAt: now,
    }
    resources.value.unshift(newResource)
    const record: ViewRecord = {
      id: nanoid(),
      resourceId: newResource.id,
      timestamp: now,
      description: '',
    }
    views.value.unshift(record)
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
      views.value = views.value.filter((r) => r.resourceId !== id)
      return true
    }
    return false
  }

  const addViewRecord = (resourceId: string) => {
    const res = getResourceById(resourceId)
    if (!res) return null
    const now = Date.now()
    updateResource(resourceId, {
      lastViewedAt: now,
      viewCount: (res.viewCount || 0) + 1,
    })

    const record: ViewRecord = {
      id: nanoid(),
      resourceId,
      timestamp: now,
      description: '',
    }
    views.value.unshift(record)
    return record
  }

  const markResourceViewed = (id: string) => {
    return !!addViewRecord(id)
  }

  const updateViewRecordDescription = (id: string, description: string) => {
    const index = views.value.findIndex((v) => v.id === id)
    if (index === -1) return false
    const prev = views.value[index]
    if (!prev) return false
    views.value[index] = {
      ...prev,
      description,
    }
    return true
  }

  const getResourceById = (id: string) => {
    return resources.value.find((r) => r.id === id)
  }

  const getViewsByResourceId = (resourceId: string) => {
    return views.value
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
    views,
    addResource,
    updateResource,
    deleteResource,
    markResourceViewed,
    addViewRecord,
    updateViewRecordDescription,
    getResourceById,
    getViewsByResourceId,
    getAllTags,
  }
}
