import apis from '@/api'

export const ALL_VALUE = '__all__'

export interface QualityImageItem {
  id: string
  enabled: boolean
  imageUrl: string
  varietyName: string
  varietyCode: string
  categoryPath: string[]
  topCategory: string
  groupKey?: string
  description?: string
  placeholderTone?: 'green' | 'orange' | 'blue'
}

export interface FilterOption {
  value: string
  label: string
}

export interface QualityImageApiResponse {
  items: QualityImageItem[]
}

export interface QualityImageQuery {
  topCategory?: string
  categoryPath?: string
  varietyCode?: string
  keyword?: string
}

const baseUrl = import.meta.env.VITE_APP_BASE_URL || ''

const MOCK_ITEMS: QualityImageItem[] = [
  {
    id: 'img_001',
    enabled: true,
    imageUrl: '/static/images/figma/home/bag-01.png',
    varietyName: '挎包',
    varietyCode: 'BAG-001',
    categoryPath: ['包包', 'A级', '挎包'],
    topCategory: '包包',
    groupKey: 'BAG-001',
    description: '官方品质参考图：面料纹理，走线与五金细节示例。',
    placeholderTone: 'green',
  },
  {
    id: 'img_002',
    enabled: true,
    imageUrl: '/static/images/figma/home/bag-02.png',
    varietyName: '挎包',
    varietyCode: 'BAG-001',
    categoryPath: ['包包', 'A级', '挎包'],
    topCategory: '包包',
    groupKey: 'BAG-001',
    description: '官方品质参考图：面料纹理，走线与五金细节示例。',
    placeholderTone: 'green',
  },
  {
    id: 'img_003',
    enabled: true,
    imageUrl: '/static/images/figma/home/shoe-01.png',
    varietyName: '短靴',
    varietyCode: 'SHOE-101',
    categoryPath: ['鞋靴', '环保材料', '短靴'],
    topCategory: '鞋靴',
    groupKey: 'SHOE-101',
    description: '官方品质参考图：鞋面材质、扣带与鞋底细节示例。',
    placeholderTone: 'blue',
  },
  {
    id: 'img_004',
    enabled: true,
    imageUrl: '/static/images/figma/home/coat-01.png',
    varietyName: '外套',
    varietyCode: 'CLO-210',
    categoryPath: ['服饰', '春夏', '外套'],
    topCategory: '服饰',
    groupKey: 'CLO-210',
    description: '官方品质参考图：面料纹理，走线与版型细节示例。',
    placeholderTone: 'orange',
  },
  {
    id: 'img_005',
    enabled: false,
    imageUrl: '/static/images/figma/home/shoe-01.png',
    varietyName: '运动鞋',
    varietyCode: 'SHOE-999',
    categoryPath: ['鞋靴', '停用示例', '运动鞋'],
    topCategory: '鞋靴',
    groupKey: 'SHOE-999',
  },
]

export async function fetchQualityImages(query?: QualityImageQuery): Promise<QualityImageApiResponse> {
  try {
    const response = await apis.pcQc.qualityImages(query)
    const payload = unwrapData<QualityImageApiResponse>(response)
    if (payload && Array.isArray(payload.items)) {
      return {
        items: payload.items.map(normalizeImageItem),
      }
    }
  }
  catch {
    // 本地预览或后端未部署时使用内置示例数据。
  }

  return {
    items: filterMockItems(query).map(normalizeImageItem),
  }
}

function unwrapData<T>(response: unknown): T | undefined {
  if (!response || typeof response !== 'object')
    return undefined
  const body = response as Record<string, unknown>
  if ('data' in body)
    return body.data as T
  return response as T
}

function normalizeImageItem(item: QualityImageItem): QualityImageItem {
  return {
    ...item,
    enabled: item.enabled !== false,
    imageUrl: resolveImageUrl(item.imageUrl),
    categoryPath: Array.isArray(item.categoryPath) ? item.categoryPath : [],
    topCategory: item.topCategory || item.categoryPath?.[0] || '未分类',
  }
}

function resolveImageUrl(url: string) {
  if (!url || /^https?:\/\//.test(url) || url.startsWith('/static/'))
    return url
  if (url.startsWith('/'))
    return `${baseUrl}${url}`
  return url
}

function filterMockItems(query?: QualityImageQuery) {
  const params = query ?? {}
  const categoryPath = params.categoryPath?.replace(/ \/ /g, '/').trim()

  return MOCK_ITEMS.filter((item) => {
    if (!item.enabled)
      return false
    if (params.topCategory && item.topCategory !== params.topCategory)
      return false
    if (categoryPath && !item.categoryPath.join('/').includes(categoryPath))
      return false
    if (params.varietyCode && item.varietyCode !== params.varietyCode)
      return false
    if (params.keyword && !fuzzyMatch(buildSearchHaystack(item), params.keyword))
      return false
    return true
  })
}

export function getTopCategoryOptions(items: QualityImageItem[]): FilterOption[] {
  const tops = Array.from(new Set(items.map(item => item.topCategory || item.categoryPath[0] || '未分类')))
  return [{ value: ALL_VALUE, label: '全部' }, ...tops.map(top => ({ value: top, label: top }))]
}

export function getItemsAfterTop(items: QualityImageItem[], selectedTop: string) {
  if (selectedTop === ALL_VALUE)
    return items
  return items.filter(item => (item.topCategory || item.categoryPath[0]) === selectedTop)
}

export function getCategoryLevelOptions(
  itemsAfterTop: QualityImageItem[],
  selectedCategoryPath: string[],
): FilterOption[][] {
  const maxSubCategoryDepth = itemsAfterTop.reduce((max, item) => {
    return Math.max(max, Math.max(0, item.categoryPath.length - 1))
  }, 0)
  const levels: FilterOption[][] = []

  for (let level = 0; level < maxSubCategoryDepth; level++) {
    const prefix = selectedCategoryPath.slice(0, level)
    const candidates = itemsAfterTop.filter((item) => {
      for (let i = 0; i < prefix.length; i++) {
        if (prefix[i] === ALL_VALUE)
          continue
        if (item.categoryPath[i + 1] !== prefix[i])
          return false
      }
      return true
    })

    const values = new Set<string>()
    for (const item of candidates) {
      const value = item.categoryPath[level + 1]
      if (value)
        values.add(value)
    }

    if (values.size === 0)
      break

    levels.push([{ value: ALL_VALUE, label: '全部' }, ...Array.from(values).map(value => ({ value, label: value }))])
  }

  return levels
}

export function getVarietyOptions(itemsAfterTop: QualityImageItem[], selectedCategoryPath: string[]): FilterOption[] {
  const prefix = selectedCategoryPath.filter(value => value !== ALL_VALUE)
  const candidates = itemsAfterTop.filter((item) => {
    for (let i = 0; i < prefix.length; i++) {
      if (item.categoryPath[i + 1] !== prefix[i])
        return false
    }
    return true
  })

  const map = new Map<string, FilterOption>()
  for (const item of candidates) {
    map.set(item.varietyCode, {
      value: item.varietyCode,
      label: `${item.varietyName} (${item.varietyCode})`,
    })
  }
  return [{ value: ALL_VALUE, label: '全部品种' }, ...Array.from(map.values())]
}

export function buildReportCategoryPath(selectedTop: string, selectedCategoryPath: string[]): string {
  const parts: string[] = []
  if (selectedTop && selectedTop !== ALL_VALUE)
    parts.push(selectedTop)
  for (const value of selectedCategoryPath) {
    if (value && value !== ALL_VALUE)
      parts.push(value)
  }
  return parts.join(' / ')
}

export function getFullCategoryPath(item: QualityImageItem) {
  return item.categoryPath.join(' / ')
}

export function fuzzyMatch(haystack: string, needle: string) {
  const normalizedNeedle = needle.trim().toLowerCase()
  if (!normalizedNeedle)
    return true
  return haystack.toLowerCase().includes(normalizedNeedle)
}

export function buildSearchHaystack(item: QualityImageItem) {
  return [
    item.varietyName,
    item.varietyCode,
    `${item.varietyName} (${item.varietyCode})`,
    ...item.categoryPath,
    getFullCategoryPath(item),
  ].join(' ')
}
