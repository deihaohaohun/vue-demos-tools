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
        tips: ['A 和 B 多为原因和结果的关系居多', 'B 为意料之外的结果', '非意志/非将来的预定'],
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
    id: 12,
    title: '〜たびに',
    level: 'N3',
    commonality: 4,
    mastery: 4,
    meanings: [
      {
        meaning: '每次~, 每当~',
        tips: [],
        usage: ['动词る + たびに', '名词の + たびに'],
        examples: [
          'おばあちゃんは会うたびに、お菓子をくれます。',
          '彼はiPhoneの新機種が出るたびに、買い替えている。',
        ],
        references: [
          {
            name: '出口仁 N3',
            url: 'https://www.bilibili.com/video/BV1x64y1u7ZD?p=30',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
          },
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 13,
    title: '〜だらけ',
    level: 'N3',
    commonality: 4,
    mastery: 4,
    meanings: [
      {
        meaning: '满是~, 全是~',
        tips: ['负面居多'],
        usage: ['名词 + だらけ'],
        examples: [
          'うちの職場は男だらけで、出会い機会いがない。',
          '彼の部屋は掃除や片付けをしていないようで、ゴミだらけでした。',
        ],
        references: [
          {
            name: '出口仁 N3',
            url: 'https://www.bilibili.com/video/BV1x64y1u7ZD?p=31',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
          },
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 14,
    title: '〜ついでに',
    level: 'N3',
    commonality: 4,
    mastery: 4,
    meanings: [
      {
        meaning: '顺便~',
        tips: ['一些小事, 不麻烦, 不费精力的事'],
        usage: ['动词る/た + ついでに', '名词の + ついでに'],
        examples: [
          '友達を駅まで送ったついでに、スーパーで夜食を買ってきた。',
          '毎晩、夕食を作るついでに、明日のお弁当のおかずも作っておきます。',
        ],
        references: [
          {
            name: '出口仁 N3',
            url: 'https://www.bilibili.com/video/BV1x64y1u7ZD?p=32',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
          },
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 15,
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
  {
    id: 16,
    title: '〜っけ',
    level: 'N3',
    commonality: 4,
    mastery: 3,
    meanings: [
      {
        meaning: '~来着(表示回忆或确认)',
        usage: ['普通形(だ・だ) + っけ', '敬体(でした・ました) + っけ'],
        examples: [
          'この店、以前来たことがあったっけ？',
          '彼の名前、何だったっけ？',
          '学生のころ、よく彼女とこの喫茶店に来たっけ。',
        ],
        references: [
          {
            name: '出口仁 N3',
            url: 'https://www.bilibili.com/video/BV1x64y1u7ZD?p=33',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
          },
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 17,
    title: '〜っぽい',
    level: 'N3',
    commonality: 4,
    mastery: 3,
    meanings: [
      {
        meaning: '经常~, 有点~(接近A的状态), 像~(不是A但是像A的样子)',
        usage: ['动词ます形 + っぽい', '名词 + っぽい'],
        examples: [
          'この店、以前来たことがあったっけ？',
          '彼の名前、何だったっけ？',
          '学生のころ、よく彼女とこの喫茶店に来たっけ。',
        ],
        references: [
          {
            name: '出口仁 N3',
            url: 'https://www.bilibili.com/video/BV1x64y1u7ZD?p=34',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
          },
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 18,
    title: '〜てからでないと・〜てからでなければ',
    level: 'N3',
    commonality: 4,
    mastery: 3,
    meanings: [
      {
        meaning: '如果不先做 A 的话, B 就~(负面)',
        usage: ['动词て型 + てからでないと', '动词て型 + てからでなければ'],
        examples: [
          '直接部屋を見てからでないと、、借りるかどうか決められない。',
          'パソコンはOSをインストールしてからでなけsれば、、使えません。',
        ],
        references: [
          {
            name: '出口仁 N3',
            url: 'https://www.bilibili.com/video/BV1x64y1u7ZD?p=35',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
          },
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 19,
    title: '～てしょうがない',
    level: 'N3',
    commonality: 4,
    mastery: 4,
    meanings: [
      {
        meaning: '~~的不得了(感情/感觉/现象)',
        usage: [
          '动词て型 + てしょうがない',
          '形容词く + てしょうがない',
          '形容动词で + てしょうがない',
        ],
        examples: [
          '好きな人と付き合えることになって、嬉しくてしょうがない。（感情）',
          'エアコンが壊れて、暑くてしょうがない。（感觉）',
        ],
        references: [
          {
            name: '出口仁 N3',
            url: 'https://www.bilibili.com/video/BV1x64y1u7ZD?p=36',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
          },
        ],
      },
    ],
    isRemembered: false,
  },
]
