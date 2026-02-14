import type { GrammarItem } from '../types'

export const n5Data: GrammarItem[] = [
  {
    id: 1,
    title: '〜てください',
    level: 'N5',
    category: '语法',
    commonality: 5,
    mastery: 5,
    meanings: [
      {
        meaning: '请...',
        usage: ['动词て形 + ください'],
        references: [
          {
            name: 'Muji',
            url: 'https://www.moji-series.com/',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
            type: '视频',
          },
          {
            name: 'NHK',
            url: 'https://www.nhk.or.jp/lesson/zh/',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
            type: '视频',
          },
        ],
      },
    ],
    isRemembered: false,
  },
  {
    id: 6,
    title: '〜たほうがいい',
    level: 'N5',
    category: '语法',
    commonality: 5,
    mastery: 5,
    meanings: [
      {
        meaning: '最好...（建议）',
        usage: ['动词た形 + ほうがいい'],
        references: [
          {
            name: 'Muji',
            url: 'https://www.moji-series.com/',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
            type: '视频',
          },
          {
            name: 'NHK',
            url: 'https://www.nhk.or.jp/lesson/zh/',
            logo: 'https://tdesign.gtimg.com/site/avatar.jpg',
            type: '视频',
          },
        ],
      },
      {
        meaning: '最好不...（建议）',
        usage: ['动词ない形 + ほうがいい'],
      },
    ],
    isRemembered: false,
  },
]
