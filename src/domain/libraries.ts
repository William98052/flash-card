import type { LibraryId } from './types'

export const LIBRARIES: ReadonlyArray<{ id: LibraryId; name: string; description: string }> = [
  { id: 'all', name: '全部字库', description: '所有内容完整的字卡' },
  { id: 'unreviewed', name: '未复习字库', description: '当前大轮次中还未出现' },
  { id: 'wrong', name: '错字库', description: '最近最终判错的汉字' },
  { id: 'new-1', name: '生词库 1', description: '自定义重点字库' },
  { id: 'new-2', name: '生词库 2', description: '自定义重点字库' },
  { id: 'new-3', name: '生词库 3', description: '自定义重点字库' },
  { id: 'familiar', name: '熟词库', description: '已经熟悉的汉字' },
]

export const USER_TAG_LIBRARIES: LibraryId[] = ['wrong', 'new-1', 'new-2', 'new-3', 'familiar']
