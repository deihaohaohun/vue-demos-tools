export interface GrammarMeaning {
  meaning: string
  tips?: string[]
  usage: string[]
  examples?: string[]
  content?: string
  references?: { name: string; url: string; logo?: string; type?: ReferenceType }[]
}

// 内容分类类型
export type ContentCategory = '语法' | '单词' | '听力' | '阅读'
// 1. 定义一个只读的常量数组
export const REFERENCE_TYPES = ['视频', '音频', '图片', '文字'] as const

// 2. 通过 typeof 和索引访问推导出联合类型
export type ReferenceType = (typeof REFERENCE_TYPES)[number]

export interface GrammarItem {
  id: number
  title: string
  level: string
  category: ContentCategory // 内容分类
  commonality: number // 1-5, higher is more common
  mastery: number // 1-5, higher is more mastered
  meanings: GrammarMeaning[]
  isRemembered?: boolean
}
