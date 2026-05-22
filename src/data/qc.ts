import apis from '@/api'

export const ALL_VALUE = '__all__'

export interface QualityImageItem {
  id: string
  categoryId?: string
  varietyId?: string
  enabled: boolean
  imageUrl: string
  varietyName: string
  varietyCode: string
  categoryPath: string[]
  categoryPathIds?: string[]
  topCategory: string
  groupKey?: string
  description?: string
  placeholderTone?: 'green' | 'orange' | 'blue'
}

export interface FilterOption {
  value: string
  label: string
}

export interface CatalogFilterOption extends FilterOption {
  id?: string
  code?: string
  path?: string
  pathIds?: string[]
  pathNames?: string[]
  categoryId?: string
  varietyId?: string
  varietyCode?: string
  varietyName?: string
}

export interface QualityPageResponse<T> {
  items: T[]
  total?: number
  pageNum?: number
  pageSize?: number
  pages?: number
  hasMore?: boolean
}

export interface QualityImageApiResponse extends QualityPageResponse<QualityImageItem> {}

export interface CategoryNode {
  id?: string
  parentId?: string
  code: string
  name: string
  path: string
  pathIds: string[]
  pathNames: string[]
  level?: number
  enabled?: boolean
  leaf?: boolean
  hasChildren?: boolean
  hasVarieties?: boolean
  children: CategoryNode[]
}

export interface VarietyOption {
  id?: string
  code: string
  name: string
  categoryId?: string
  factoryId?: string
  factoryName?: string
  topCategory: string
  categoryPath: string[]
  categoryPathIds: string[]
  groupKey?: string
  enabled?: boolean
  imageCount?: number
  hasEnabledImage?: boolean
}

export interface CategoryVarietyResponse {
  categories: CategoryNode[]
  varieties: VarietyOption[]
}

export interface CategoryListResponse {
  items: CategoryNode[]
}

export interface QualityImageQuery {
  varietyCode?: string
  keyword?: string
  categoryId?: string | number
  varietyId?: string | number
  pageNum?: number
  pageSize?: number
}

export interface CategoryQuery {
  parentId?: string | number
}

export interface VarietyQuery {
  categoryId?: string | number
  keyword?: string
  pageNum?: number
  pageSize?: number
}

const baseUrl = import.meta.env.VITE_APP_BASE_URL || ''

const MOCK_CATEGORY_IDS = {
  bag: 'mock-cat-bag',
  bagLevel: 'mock-cat-bag-a',
  bagLeaf: 'mock-cat-bag-a-crossbody',
  shoe: 'mock-cat-shoe',
  shoeMaterial: 'mock-cat-shoe-eco',
  shoeLeaf: 'mock-cat-shoe-eco-boot',
  clothing: 'mock-cat-clothing',
  clothingSeason: 'mock-cat-clothing-ss',
  clothingLeaf: 'mock-cat-clothing-ss-coat',
}

const MOCK_ITEMS: QualityImageItem[] = [
  {
    id: 'img_001',
    categoryId: MOCK_CATEGORY_IDS.bagLeaf,
    varietyId: 'mock-var-bag-001',
    enabled: true,
    imageUrl: '/static/images/figma/home/shoe-01.png',
    varietyName: '挎包',
    varietyCode: 'BAG-001',
    categoryPath: ['包包', 'A级', '挎包'],
    categoryPathIds: [MOCK_CATEGORY_IDS.bag, MOCK_CATEGORY_IDS.bagLevel, MOCK_CATEGORY_IDS.bagLeaf],
    topCategory: '包包',
    groupKey: 'BAG-001',
    description: '官方品质参考图：面料纹理，走线与五金细节示例。',
    placeholderTone: 'green',
  },
  {
    id: 'img_002',
    categoryId: MOCK_CATEGORY_IDS.bagLeaf,
    varietyId: 'mock-var-bag-001',
    enabled: true,
    imageUrl: '/static/images/figma/home/shoe-01.png',
    varietyName: '挎包',
    varietyCode: 'BAG-001',
    categoryPath: ['包包', 'A级', '挎包'],
    categoryPathIds: [MOCK_CATEGORY_IDS.bag, MOCK_CATEGORY_IDS.bagLevel, MOCK_CATEGORY_IDS.bagLeaf],
    topCategory: '包包',
    groupKey: 'BAG-001',
    description: '官方品质参考图：面料纹理，走线与五金细节示例。',
    placeholderTone: 'green',
  },
  {
    id: 'img_003',
    categoryId: MOCK_CATEGORY_IDS.shoeLeaf,
    varietyId: 'mock-var-shoe-101',
    enabled: true,
    imageUrl: '/static/images/figma/home/shoe-01.png',
    varietyName: '短靴',
    varietyCode: 'SHOE-101',
    categoryPath: ['鞋靴', '环保材料', '短靴'],
    categoryPathIds: [MOCK_CATEGORY_IDS.shoe, MOCK_CATEGORY_IDS.shoeMaterial, MOCK_CATEGORY_IDS.shoeLeaf],
    topCategory: '鞋靴',
    groupKey: 'SHOE-101',
    description: '官方品质参考图：鞋面材质、扣带与鞋底细节示例。',
    placeholderTone: 'blue',
  },
  {
    id: 'img_004',
    categoryId: MOCK_CATEGORY_IDS.clothingLeaf,
    varietyId: 'mock-var-clo-210',
    enabled: true,
    imageUrl: '/static/images/figma/home/shoe-01.png',
    varietyName: '外套',
    varietyCode: 'CLO-210',
    categoryPath: ['服饰', '春夏', '外套'],
    categoryPathIds: [MOCK_CATEGORY_IDS.clothing, MOCK_CATEGORY_IDS.clothingSeason, MOCK_CATEGORY_IDS.clothingLeaf],
    topCategory: '服饰',
    groupKey: 'CLO-210',
    description: '官方品质参考图：面料纹理，走线与版型细节示例。',
    placeholderTone: 'orange',
  },
  {
    id: 'img_005',
    categoryId: 'mock-cat-shoe-disabled-sneaker',
    varietyId: 'mock-var-shoe-999',
    enabled: false,
    imageUrl: '/static/images/figma/home/shoe-01.png',
    varietyName: '运动鞋',
    varietyCode: 'SHOE-999',
    categoryPath: ['鞋靴', '停用示例', '运动鞋'],
    categoryPathIds: [MOCK_CATEGORY_IDS.shoe, 'mock-cat-shoe-disabled', 'mock-cat-shoe-disabled-sneaker'],
    topCategory: '鞋靴',
    groupKey: 'SHOE-999',
  },
]

export async function fetchQualityImages(query?: QualityImageQuery): Promise<QualityImageApiResponse> {
  try {
    const response = await apis.zjQc.qualityImages(cleanQualityImageQuery(query))
    const payload = unwrapData<QualityImageApiResponse>(response)
    if (payload && Array.isArray(payload.items)) {
      return {
        ...payload,
        items: payload.items.map(normalizeImageItem),
      }
    }
  }
  catch {
    // 本地预览或后端未部署时继续使用 quality-images 的本地兜底数据。
  }

  const items = filterMockItems(query).map(normalizeImageItem)
  return {
    items,
    total: items.length,
    pageNum: 1,
    pageSize: items.length,
    pages: 1,
    hasMore: false,
  }
}

export async function fetchQualityImageDetail(imageId: string | number): Promise<QualityImageItem | undefined> {
  try {
    const response = await apis.zjQc.qualityImageDetail(imageId as `${number}`)
    const payload = unwrapData<QualityImageItem>(response)
    if (payload)
      return normalizeImageItem(payload)
  }
  catch {
    // 本地预览或后端未部署时继续使用本地兜底数据。
  }

  return MOCK_ITEMS.map(normalizeImageItem).find(item => item.id === String(imageId))
}

export async function fetchCategories(query?: CategoryQuery): Promise<CategoryListResponse> {
  try {
    const response = await apis.zjQc.categories(cleanCategoryQuery(query))
    const payload = unwrapData<CategoryListResponse>(response)
    if (payload && Array.isArray(payload.items)) {
      return {
        items: payload.items.map(item => normalizeCategoryNode(item)),
      }
    }
  }
  catch {
    // 本地预览或后端未部署时继续使用本地兜底数据。
  }

  const catalog = buildMockCatalog()
  const parentId = toStringValue(query?.parentId)
  if (!parentId)
    return { items: catalog.categories }

  const parent = findCategoryByValue(catalog.categories, parentId)
  return { items: parent?.children ?? [] }
}

export async function fetchVarieties(query?: VarietyQuery): Promise<QualityPageResponse<VarietyOption>> {
  try {
    const response = await apis.zjQc.varieties(cleanVarietyQuery(query))
    const payload = unwrapData<QualityPageResponse<VarietyOption>>(response)
    if (payload && Array.isArray(payload.items)) {
      return {
        ...payload,
        items: payload.items.map(item => normalizeVarietyOption(item)),
      }
    }
  }
  catch {
    // 本地预览或后端未部署时继续使用本地兜底数据。
  }

  const categoryId = toStringValue(query?.categoryId)
  const keyword = query?.keyword?.trim()
  const items = buildMockCatalog().varieties.filter((item) => {
    if (categoryId && item.categoryId !== categoryId && !item.categoryPathIds.includes(categoryId))
      return false
    if (keyword && !fuzzyMatch(`${item.name} ${item.code} ${item.categoryPath.join('/')}`, keyword))
      return false
    return true
  })

  return {
    items,
    total: items.length,
    pageNum: 1,
    pageSize: items.length,
    pages: 1,
    hasMore: false,
  }
}

export async function fetchCategoryVarieties(): Promise<CategoryVarietyResponse> {
  const categories = await fetchCategoryTree()
  const varietiesResponse = await fetchVarieties({ pageNum: 1, pageSize: 500 })
  return {
    categories,
    varieties: varietiesResponse.items,
  }
}

export async function fetchCategoryTree(parentId?: string | number): Promise<CategoryNode[]> {
  const response = await fetchCategories(parentId ? { parentId } : undefined)
  for (const node of response.items) {
    if (node.id && node.hasChildren)
      node.children = await fetchCategoryTree(node.id)
  }
  return response.items
}

function unwrapData<T>(response: unknown): T | undefined {
  if (!response || typeof response !== 'object')
    return undefined
  const body = response as Record<string, unknown>
  if ('data' in body)
    return body.data as T
  return response as T
}

type QualityImageSource = Partial<Omit<QualityImageItem, 'categoryPath' | 'categoryPathIds'>> & {
  imageId?: unknown
  categoryId?: unknown
  varietyId?: unknown
  categoryPath?: unknown
  categoryPathIds?: unknown
}

function normalizeImageItem(item: QualityImageSource): QualityImageItem {
  const rawCategoryPath = toStringArray(item.categoryPath)
  const categoryPathIds = toStringArray(item.categoryPathIds)
  const topCategory = toStringValue(item.topCategory) || rawCategoryPath[0] || '未分类'
  const categoryPath = topCategory && rawCategoryPath[0] !== topCategory
    ? [topCategory, ...rawCategoryPath]
    : rawCategoryPath
  const enabled = typeof item.enabled === 'boolean'
    ? item.enabled
    : Number(item.enabled ?? 1) !== 0

  return {
    id: toStringValue(item.id || item.imageId),
    categoryId: toStringValue(item.categoryId) || undefined,
    varietyId: toStringValue(item.varietyId) || undefined,
    enabled,
    imageUrl: resolveImageUrl(toStringValue(item.imageUrl)),
    varietyName: toStringValue(item.varietyName),
    varietyCode: toStringValue(item.varietyCode),
    categoryPath,
    categoryPathIds: categoryPathIds.length ? categoryPathIds : undefined,
    topCategory,
    groupKey: toStringValue(item.groupKey) || undefined,
    description: toStringValue(item.description) || undefined,
    placeholderTone: item.placeholderTone,
  }
}

type CategoryNodeSource = Partial<Omit<CategoryNode, 'children' | 'pathIds' | 'pathNames' | 'id' | 'parentId' | 'level'>> & {
  id?: unknown
  parentId?: unknown
  pathIds?: unknown
  pathNames?: unknown
  level?: unknown
  enabled?: unknown
  leaf?: unknown
  hasChildren?: unknown
  hasVarieties?: unknown
  children?: unknown
}

function normalizeCategoryNode(item: CategoryNodeSource): CategoryNode {
  const id = toStringValue(item.id) || undefined
  const parentId = toStringValue(item.parentId) || undefined
  const pathNames = toStringArray(item.pathNames)
  const pathFromString = toStringArray(item.path)
  const name = toStringValue(item.name) || pathNames[pathNames.length - 1] || pathFromString[pathFromString.length - 1] || toStringValue(item.code)
  const normalizedPathNames = pathNames.length ? pathNames : (pathFromString.length ? pathFromString : [name])
  const pathIds = toStringArray(item.pathIds)
  const children = Array.isArray(item.children)
    ? item.children.map(child => normalizeCategoryNode(child as CategoryNodeSource))
    : []

  return {
    id,
    parentId,
    code: toStringValue(item.code) || id || name,
    name,
    path: toStringValue(item.path) || normalizedPathNames.join('/'),
    pathIds: pathIds.length ? pathIds : (id ? [id] : []),
    pathNames: normalizedPathNames,
    level: Number.isFinite(Number(item.level)) ? Number(item.level) : undefined,
    enabled: toOptionalBoolean(item.enabled),
    leaf: toOptionalBoolean(item.leaf),
    hasChildren: toOptionalBoolean(item.hasChildren) ?? children.length > 0,
    hasVarieties: toOptionalBoolean(item.hasVarieties),
    children,
  }
}

type VarietyOptionSource = Partial<Omit<VarietyOption, 'id' | 'categoryId' | 'categoryPath' | 'categoryPathIds' | 'factoryId'>> & {
  id?: unknown
  categoryId?: unknown
  factoryId?: unknown
  categoryPath?: unknown
  categoryPathIds?: unknown
  enabled?: unknown
  imageCount?: unknown
  hasEnabledImage?: unknown
}

function normalizeVarietyOption(item: VarietyOptionSource): VarietyOption {
  const categoryPath = toStringArray(item.categoryPath)
  const categoryPathIds = toStringArray(item.categoryPathIds)
  const topCategory = toStringValue(item.topCategory) || categoryPath[0] || ''

  return {
    id: toStringValue(item.id) || undefined,
    code: toStringValue(item.code),
    name: toStringValue(item.name),
    categoryId: toStringValue(item.categoryId) || undefined,
    factoryId: toStringValue(item.factoryId) || undefined,
    factoryName: toStringValue(item.factoryName) || undefined,
    topCategory,
    categoryPath,
    categoryPathIds,
    groupKey: toStringValue(item.groupKey) || undefined,
    enabled: toOptionalBoolean(item.enabled),
    imageCount: Number.isFinite(Number(item.imageCount)) ? Number(item.imageCount) : undefined,
    hasEnabledImage: toOptionalBoolean(item.hasEnabledImage),
  }
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null)
    return undefined
  if (typeof value === 'boolean')
    return value
  return Number(value) !== 0
}

function toStringValue(value: unknown) {
  if (value === undefined || value === null)
    return ''
  return String(value)
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map(toStringValue).filter(Boolean)
  if (typeof value === 'string')
    return value.split(/[,/]/).map(part => part.trim()).filter(Boolean)
  return []
}

function resolveImageUrl(url: string) {
  if (!url || /^https?:\/\//.test(url) || url.startsWith('/static/'))
    return url
  if (url.startsWith('/'))
    return `${baseUrl}${url}`
  return url
}

function cleanQualityImageQuery(query?: QualityImageQuery): QualityImageQuery | undefined {
  if (!query)
    return undefined

  const clean: QualityImageQuery = {}
  for (const [key, value] of Object.entries(query) as Array<[keyof QualityImageQuery, QualityImageQuery[keyof QualityImageQuery]]>) {
    if (isEmptyQueryValue(String(key), value))
      continue
    clean[key] = value as never
  }
  return Object.keys(clean).length ? clean : undefined
}

function cleanCategoryQuery(query?: CategoryQuery): CategoryQuery | undefined {
  if (!query || isEmptyQueryValue('parentId', query.parentId))
    return undefined
  return { parentId: query.parentId }
}

function cleanVarietyQuery(query?: VarietyQuery): VarietyQuery | undefined {
  if (!query)
    return undefined

  const clean: VarietyQuery = {}
  for (const [key, value] of Object.entries(query) as Array<[keyof VarietyQuery, VarietyQuery[keyof VarietyQuery]]>) {
    if (isEmptyQueryValue(String(key), value))
      continue
    clean[key] = value as never
  }
  return Object.keys(clean).length ? clean : undefined
}

function isEmptyQueryValue(key: string, value: unknown) {
  if (value === undefined || value === null || value === ALL_VALUE)
    return true
  if (typeof value === 'string' && value.trim() === '')
    return true
  if (['categoryId', 'parentId', 'varietyId'].includes(key) && String(value).trim() === '0')
    return true
  return false
}

function filterMockItems(query?: QualityImageQuery) {
  const params = query ?? {}
  const categoryId = toStringValue(params.categoryId)
  const varietyId = toStringValue(params.varietyId)

  return MOCK_ITEMS.filter((item) => {
    if (!item.enabled)
      return false
    if (categoryId && item.categoryId !== categoryId && !item.categoryPathIds?.includes(categoryId))
      return false
    if (varietyId && item.varietyId !== varietyId)
      return false
    if (params.varietyCode && item.varietyCode !== params.varietyCode)
      return false
    if (params.keyword && !fuzzyMatch(buildSearchHaystack(item), params.keyword))
      return false
    return true
  })
}

function buildMockCatalog(query?: QualityImageQuery): CategoryVarietyResponse {
  const items = filterMockItems(query)
  return {
    categories: buildMockCategories(items),
    varieties: buildMockVarieties(items),
  }
}

function buildMockCategories(items: QualityImageItem[]): CategoryNode[] {
  const roots: CategoryNode[] = []
  const nodeMap = new Map<string, CategoryNode>()

  for (const item of items) {
    item.categoryPath.forEach((name, index) => {
      const pathNames = item.categoryPath.slice(0, index + 1)
      const pathIds = item.categoryPathIds?.slice(0, index + 1) ?? []
      const id = pathIds[index] || `mock-cat-${pathNames.join('-')}`
      let node = nodeMap.get(id)

      if (!node) {
        node = {
          id,
          code: id,
          name,
          path: pathNames.join('/'),
          pathIds,
          pathNames,
          level: index + 1,
          children: [],
        }
        nodeMap.set(id, node)

        const parentId = pathIds[index - 1]
        const parent = parentId ? nodeMap.get(parentId) : undefined
        if (parent) {
          parent.children.push(node)
        }
        else {
          roots.push(node)
        }
      }
    })
  }

  return roots
}

function buildMockVarieties(items: QualityImageItem[]): VarietyOption[] {
  const map = new Map<string, VarietyOption>()
  for (const item of items) {
    const id = item.varietyId || item.varietyCode
    if (map.has(id))
      continue
    map.set(id, {
      id,
      code: item.varietyCode,
      name: item.varietyName,
      categoryId: item.categoryId,
      topCategory: item.topCategory,
      categoryPath: item.categoryPath,
      categoryPathIds: item.categoryPathIds ?? [],
      groupKey: item.groupKey,
    })
  }
  return Array.from(map.values())
}


export function getTopCategoryOptionsFromCatalog(categories: CategoryNode[]): CatalogFilterOption[] {
  return [
    { value: ALL_VALUE, label: '全部' },
    ...categories.map(toCategoryFilterOption),
  ]
}

export function getCategoryLevelOptionsFromCatalog(
  categories: CategoryNode[],
  selectedTop: string,
  selectedCategoryPath: string[],
): CatalogFilterOption[][] {
  const topNode = findCategoryByValue(categories, selectedTop)
  if (selectedTop !== ALL_VALUE && !topNode)
    return []

  const levels: CatalogFilterOption[][] = []
  let nodes = topNode
    ? topNode.children ?? []
    : categories.flatMap(category => category.children ?? [])

  for (let level = 0; nodes.length > 0 && level < 12; level++) {
    levels.push([{ value: ALL_VALUE, label: '全部' }, ...nodes.map(toCategoryFilterOption)])

    const selected = selectedCategoryPath[level]
    if (!selected || selected === ALL_VALUE)
      break

    const selectedNode = nodes.find(node => categoryValueMatches(node, selected))
    if (!selectedNode)
      break

    nodes = selectedNode.children ?? []
  }

  return levels
}

export function getVarietyOptionsFromCatalog(
  varieties: VarietyOption[],
  selectedTop: string,
  selectedCategoryPath: string[],
  categories: CategoryNode[],
): CatalogFilterOption[] {
  const selectedCategory = getSelectedCategoryNode(categories, selectedTop, selectedCategoryPath)
  const candidates = varieties.filter((variety) => {
    if (!selectedCategory)
      return true

    if (selectedCategory.id && (variety.categoryId === selectedCategory.id || variety.categoryPathIds.includes(selectedCategory.id)))
      return true

    const selectedPath = selectedCategory.pathNames.join('/')
    return selectedPath ? variety.categoryPath.join('/').startsWith(selectedPath) : true
  })

  const map = new Map<string, CatalogFilterOption>()
  for (const variety of candidates) {
    const option = toVarietyFilterOption(variety)
    map.set(option.value, option)
  }

  return [{ value: ALL_VALUE, label: '全部品种' }, ...Array.from(map.values())]
}

export function findCategoryByValue(categories: CategoryNode[], value: string): CategoryNode | undefined {
  if (!value || value === ALL_VALUE)
    return undefined

  for (const category of categories) {
    if (categoryValueMatches(category, value))
      return category
    const child = findCategoryByValue(category.children ?? [], value)
    if (child)
      return child
  }

  return undefined
}

export function findVarietyByValue(varieties: VarietyOption[], value: string): VarietyOption | undefined {
  if (!value || value === ALL_VALUE)
    return undefined
  return varieties.find((variety) => {
    return variety.id === value || variety.code === value || toVarietyValue(variety) === value
  })
}

export function getSelectedCategoryNode(
  categories: CategoryNode[],
  selectedTop: string,
  selectedCategoryPath: string[],
): CategoryNode | undefined {
  const selectedCategories = selectedCategoryPath.filter(value => value && value !== ALL_VALUE)
  const selectedCategory = selectedCategories[selectedCategories.length - 1]

  return findCategoryByValue(categories, selectedCategory || selectedTop)
}

export function getSelectedCategoryId(
  categories: CategoryNode[],
  selectedTop: string,
  selectedCategoryPath: string[],
): string | undefined {
  return getSelectedCategoryNode(categories, selectedTop, selectedCategoryPath)?.id
}

export function getSelectedCategoryPathNames(
  categories: CategoryNode[],
  selectedTop: string,
  selectedCategoryPath: string[],
): string[] {
  const node = getSelectedCategoryNode(categories, selectedTop, selectedCategoryPath)
  if (!node)
    return []
  if (node.pathNames.length)
    return node.pathNames
  return toStringArray(node.path)
}

function toCategoryFilterOption(node: CategoryNode): CatalogFilterOption {
  return {
    value: toCategoryValue(node),
    label: node.name,
    id: node.id,
    code: node.code,
    path: node.path,
    pathIds: node.pathIds,
    pathNames: node.pathNames,
    categoryId: node.id,
  }
}

function toVarietyFilterOption(variety: VarietyOption): CatalogFilterOption {
  return {
    value: toVarietyValue(variety),
    label: variety.code ? `${variety.name} (${variety.code})` : variety.name,
    id: variety.id,
    code: variety.code,
    path: variety.categoryPath.join('/'),
    pathIds: variety.categoryPathIds,
    pathNames: variety.categoryPath,
    categoryId: variety.categoryId,
    varietyId: variety.id,
    varietyCode: variety.code,
    varietyName: variety.name,
  }
}

function toCategoryValue(node: CategoryNode) {
  return node.id || node.path || node.code || node.name
}

function toVarietyValue(variety: VarietyOption) {
  return variety.id || variety.code
}

function categoryValueMatches(node: CategoryNode, value: string) {
  return toCategoryValue(node) === value
    || node.id === value
    || node.path === value
    || node.code === value
    || node.name === value
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
