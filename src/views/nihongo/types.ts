export interface GrammarMeaning {
  meaning: string
  tips?: string[]
  usage: string[]
  examples: string[]
  content?: string
  references?: { name: string; url: string; logo?: string }[]
}

export interface GrammarItem {
  id: number
  title: string
  level: string
  commonality: number // 1-5, higher is more common
  mastery: number // 1-5, higher is more mastered
  meanings: GrammarMeaning[]
  isRemembered?: boolean
}
