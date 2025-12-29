import type { GrammarItem } from '../types'

export const n2Data: GrammarItem[] = [
  {
    id: 3,
    title: '〜わけにはいかない',
    level: 'N2',
    commonality: 3,
    mastery: 2,
    meanings: [
      {
        meaning: '（心理/道德上）不能...；不可以...',
        usage: ['动词连体形 + わけにはいかない'],
        examples: ['大事な会议だから、遅れるわけにはいかない。'],
        references: [
          { name: 'Bunpro', url: 'https://bunpro.jp/', logo: 'https://tdesign.gtimg.com/site/avatar.jpg' }
        ]
      },
      {
        meaning: '（心理/道德上）必须...；不得不...',
        usage: ['动词ない形 + わけにはいかない'],
        examples: ['明日は試験があるので、勉強しないわけにはいかない。']
      }
    ],
    isRemembered: false
  }
]
