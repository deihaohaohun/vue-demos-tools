import type { GrammarItem } from '../types'

export const n3Data: GrammarItem[] = [
  {
    id: 5,
    title: '〜从〜にかけて',
    level: 'N3',
    commonality: 4,
    mastery: 4,
    meanings: [
      {
        meaning: '从...到...（范围模糊）',
        usage: ['名词 + から + 名词 + にかけて'],
        examples: [
          '昨夜から今朝にかけて雨が降りました。',
          '関東地方から東北地方にかけて地震があった。',
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 10,
    title: '〜とたん',
    level: 'N3',
    commonality: 4,
    mastery: 4,
    meanings: [
      {
        meaning: 'A 发生之后 B 立刻发生了',
        tips: ['A 和 B 多为原因和结果的关系', 'B 为意料之外的结果', '非意志/非将来的预定'],
        usage: ['动词た + とたん'],
        examples: [
          '家を出たとたん、雨が降ってきた。',
          '部屋の窓を開けたとたん、小鳥が飛んでしまった。',
        ],
        references: [
          {
            name: '出口仁 N3',
            url: 'https://www.bilibili.com/video/BV1x64y1u7ZD/?p=29&vd_source=746624b9a1ec9fffe506951b4f299202',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
          },
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 11,
    title: '〜うちに',
    level: 'N3',
    commonality: 4,
    mastery: 3,
    meanings: [
      {
        meaning: '趁着...（在状态改变前）',
        usage: ['动词连体形 + うちに', '形容词 + うちに', '名词 + のうちに'],
        examples: ['若いうちに勉強しておきなさい。', '忘れないうちにメモしておきます。'],
      },
      {
        meaning: '在...期间（不知不觉间发生了变化）',
        usage: ['动词进行时 + うちに'],
        examples: ['本を读んでいるうちに、寝てしまいました。'],
      },
    ],
    isRemembered: false,
  },
]
