import type { GrammarItem } from '../types'

export const n4Data: GrammarItem[] = [
  {
    id: 2,
    title: '〜ことがある',
    level: 'N4',
    category: '语法',
    commonality: 4,
    mastery: 3,
    meanings: [
      {
        meaning: '有...的时候',
        usage: ['动词连体形 + ことがある'],
        references: [
          { name: 'Maggie Sensei', url: 'https://maggiesensei.com/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' }
        ]
      },
      {
        meaning: '曾有过...（经验）',
        usage: ['动词た形 + ことがある'],
        references: [
          { name: 'JGram', url: 'http://www.jgram.org/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' }
        ]
      }
    ],
    isRemembered: false
  }
]
