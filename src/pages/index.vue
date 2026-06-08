<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onLoad, onResize, onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import {
  ALL_VALUE,
  fetchCategoryDetail,
  fetchCategories,
  fetchQualityImages,
  fetchVarieties,
  findCategoryByValue,
  getCategoryLevelOptionsFromCatalog,
  getFullCategoryPath,
  getQualityImageUrls,
  getSelectedCategoryId,
  getTopCategoryOptionsFromCatalog,
  getVarietyOptionsFromCatalog,
  type CatalogFilterOption,
  type CategoryNode,
  type CategoryVarietyResponse,
  type QualityImageApiResponse,
  type QualityImageItem,
  type QualityImageQuery,
} from '@/data/qc'
import { useUserStore } from '@/store/user'

interface ContentChipOption extends CatalogFilterOption {
  kind: 'variety'
}

type UniPopupType =
  | 'top'
  | 'center'
  | 'bottom'
  | 'left'
  | 'right'
  | 'message'
  | 'dialog'
  | 'share'
type UniPopupExpose = {
  open: (type?: UniPopupType) => void
  close: () => void
}
type PopupChangeEvent = {
  show: boolean
}

const userStore = useUserStore()
const statusBarHeight = ref(44)
const loading = ref(true)
const loadingMore = ref(false)
const loadError = ref('')
const loadMoreError = ref('')
const items = ref<QualityImageItem[]>([])
const catalog = ref<CategoryVarietyResponse>({ categories: [], varieties: [] })
const searchDraft = ref('')
const appliedSearchQuery = ref('')
const selectedTop = ref(ALL_VALUE)
const selectedCategoryPath = ref<string[]>([])
const selectedVariety = ref(ALL_VALUE)
const categoryStep = ref(0)
const detailItem = ref<QualityImageItem>()
const imagePreviewVisible = ref(false)
const imagePreviewUrls = ref<string[]>([])
const imagePreviewIndex = ref(0)
const imagePreviewCloseTop = ref(52)
const categoryGuidePopup = ref<UniPopupExpose | null>(null)
const categoryGuideLoading = ref(false)
const categoryGuideDetail = ref<CategoryNode>()
const categoryGuideImageIndex = ref(0)
let queryRequestId = 0
let categoryGuideRequestId = 0
let hasInitialLoadFinished = false
const PAGE_SIZE = 20
const DISABLE_MOCK_FALLBACK = { mockFallback: false } as const
const currentPage = ref(1)
const hasMore = ref(false)
const reportFabReady = ref(false)
const reportFabPosition = ref({ left: 0, top: 0 })
const reportFabBounds = ref({ minLeft: 0, minTop: 0, maxLeft: 0, maxTop: 0 })
const reportFabDragState = {
  active: false,
  startX: 0,
  startY: 0,
  startLeft: 0,
  startTop: 0,
  moved: false,
}
let suppressReportFabClick = false
let suppressReportFabClickTimer: ReturnType<typeof setTimeout> | undefined
const REPORT_FAB_DRAG_THRESHOLD = 6
const REPORT_FAB_POSITION_STORAGE_KEY = 'home_report_fab_position'
const HOME_SHARE_TITLE = '品检图例'
const HOME_SHARE_PATH = '/pages/index'
const HOME_SHARE_IMAGE_URL = '/static/images/qc/home_hero.png'

const topCategoryOptions = computed(() => getTopCategoryOptionsFromCatalog(catalog.value.categories))
const topTabs = computed(() => topCategoryOptions.value.map(option => formatTopOption(option)))
const categoryLevelOptions = computed(() => {
  const levels = selectedTop.value === ALL_VALUE
    ? []
    : getCategoryLevelOptionsFromCatalog(catalog.value.categories, selectedTop.value, selectedCategoryPath.value)
  return levels.length > 0 ? levels : [[{ value: ALL_VALUE, label: '全部' }]]
})
const safeCategoryStep = computed(() => Math.min(categoryStep.value, Math.max(0, categoryLevelOptions.value.length - 1)))
const currentLevelOptions = computed(() => categoryLevelOptions.value[safeCategoryStep.value] ?? [])
const categoryNavOptions = computed(() => currentLevelOptions.value.map(option => formatCategoryOption(option)))
const showLeftNav = computed(() => categoryNavOptions.value.length > 0)
const varietyOptions = computed(() => {
  return getVarietyOptionsFromCatalog(
    catalog.value.varieties,
    selectedTop.value,
    selectedCategoryPath.value,
    catalog.value.categories,
  )
})
const contentChips = computed<ContentChipOption[]>(() => {
  return varietyOptions.value.map(option => ({
    ...formatVarietyOption(option),
    kind: 'variety',
  }))
})
const filteredItems = computed(() => items.value)
const canShowReportFab = computed(() => userStore.userType === '07')
const reportFabStyle = computed(() => reportFabReady.value
  ? {
      left: `${reportFabPosition.value.left}px`,
      top: `${reportFabPosition.value.top}px`,
      right: 'auto',
      bottom: 'auto',
    }
  : {})
const imagePreviewCloseStyle = computed(() => ({
  top: `${imagePreviewCloseTop.value}px`,
}))
const categoryGuideTitle = computed(() => categoryGuideDetail.value?.name || '')
const categoryGuideDescription = computed(() => {
  const description = categoryGuideDetail.value?.description?.trim()
  if (description)
    return description
  return categoryGuideLoading.value ? '加载中...' : '暂无品类详情'
})
const categoryGuideImageUrls = computed(() => {
  return (categoryGuideDetail.value?.imageUrls ?? []).filter(Boolean)
})
const categoryGuideShowNav = computed(() => categoryGuideImageUrls.value.length > 1)
const categoryGuideEmptyText = computed(() => categoryGuideLoading.value ? '加载中...' : '暂无图片')

onLoad(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 44
  }
  catch {
    statusBarHeight.value = 44
  }
  syncImagePreviewClosePosition()
  initReportFabPosition()
  refreshUserProfile()
  load()
})

onShow(() => {
  if (!hasInitialLoadFinished)
    return
  void refreshCurrentCatalogState()
})

onResize(() => {
  syncImagePreviewClosePosition()
  initReportFabPosition(true)
})

onShareAppMessage(() => ({
  title: HOME_SHARE_TITLE,
  path: HOME_SHARE_PATH,
  imageUrl: HOME_SHARE_IMAGE_URL,
}))

onShareTimeline(() => ({
  title: HOME_SHARE_TITLE,
  query: '',
  imageUrl: HOME_SHARE_IMAGE_URL,
}))

async function load() {
  const requestId = ++queryRequestId
  loading.value = true
  loadError.value = ''
  loadMoreError.value = ''
  try {
    const [categoryResponse, varietyResponse, imageResponse] = await Promise.all([
      fetchCategories(undefined, DISABLE_MOCK_FALLBACK),
      fetchVarieties({ pageNum: 1, pageSize: 100 }, DISABLE_MOCK_FALLBACK),
      fetchQualityImages({ pageNum: 1, pageSize: PAGE_SIZE }, DISABLE_MOCK_FALLBACK),
    ])
    if (requestId !== queryRequestId)
      return
    catalog.value = { categories: categoryResponse.items, varieties: varietyResponse.items }
    items.value = imageResponse.items
    currentPage.value = getResponsePageNum(imageResponse, 1)
    hasMore.value = getResponseHasMore(imageResponse, currentPage.value)
  }
  catch (error) {
    if (requestId !== queryRequestId)
      return
    loadError.value = error instanceof Error ? error.message : '加载失败，请稍后重试'
    hasMore.value = false
  }
  finally {
    if (requestId === queryRequestId)
      loading.value = false
    hasInitialLoadFinished = true
  }
}

async function loadResults(pageNum = 1, append = false) {
  if (append) {
    if (loading.value || loadingMore.value || !hasMore.value)
      return
    loadingMore.value = true
    loadMoreError.value = ''
  }
  else {
    loading.value = true
    loadError.value = ''
    loadMoreError.value = ''
    hasMore.value = false
  }

  const requestId = ++queryRequestId
  try {
    const response = await fetchQualityImages(buildQueryParams(pageNum), DISABLE_MOCK_FALLBACK)
    if (requestId === queryRequestId) {
      items.value = append ? [...items.value, ...response.items] : response.items
      currentPage.value = getResponsePageNum(response, pageNum)
      hasMore.value = getResponseHasMore(response, currentPage.value)
    }
  }
  catch (error) {
    if (requestId === queryRequestId && append) {
      loadMoreError.value = error instanceof Error ? error.message : '加载更多失败，请稍后重试'
      return
    }
    if (requestId === queryRequestId)
      loadError.value = error instanceof Error ? error.message : '查询失败，请稍后重试'
  }
  finally {
    if (requestId === queryRequestId) {
      if (append)
        loadingMore.value = false
      else
        loading.value = false
    }
  }
}

function buildQueryParams(pageNum = 1): QualityImageQuery {
  const query: QualityImageQuery = {
    pageNum,
    pageSize: PAGE_SIZE,
  }
  const categoryId = getSelectedCategoryId(catalog.value.categories, selectedTop.value, selectedCategoryPath.value)
  const selectedVarietyOption = varietyOptions.value.find(option => option.value === selectedVariety.value)

  if (categoryId)
    query.categoryId = categoryId
  if (selectedVariety.value !== ALL_VALUE && selectedVarietyOption) {
    if (selectedVarietyOption?.varietyId)
      query.varietyId = selectedVarietyOption.varietyId
    else if (selectedVarietyOption?.varietyCode)
      query.varietyCode = selectedVarietyOption.varietyCode
  }
  if (appliedSearchQuery.value)
    query.keyword = appliedSearchQuery.value

  return query
}

function getResponsePageNum(response: QualityImageApiResponse, fallback: number) {
  const pageNum = Number(response.pageNum)
  return Number.isFinite(pageNum) && pageNum > 0 ? pageNum : fallback
}

function getResponseHasMore(response: QualityImageApiResponse, pageNum: number) {
  if (typeof response.hasMore === 'boolean')
    return response.hasMore

  const pages = Number(response.pages)
  if (Number.isFinite(pages) && pages > 0)
    return pageNum < pages

  const total = Number(response.total)
  const pageSize = Number(response.pageSize || PAGE_SIZE)
  if (Number.isFinite(total) && total >= 0 && Number.isFinite(pageSize) && pageSize > 0)
    return pageNum * pageSize < total

  return response.items.length >= PAGE_SIZE
}

async function loadMoreResults() {
  await loadResults(currentPage.value + 1, true)
}

async function ensureCategoryChildren(value: string, force = false) {
  const node = findCategoryByValue(catalog.value.categories, value)
  if (!node?.id)
    return
  if (!force && (node.leaf || node.children.length > 0))
    return

  const response = await fetchCategories({ parentId: node.id }, DISABLE_MOCK_FALLBACK)
  node.children = response.items
  node.hasChildren = response.items.length > 0
  node.leaf = response.items.length === 0
  catalog.value = {
    ...catalog.value,
    categories: [...catalog.value.categories],
  }
}

async function refreshCategoryTree(topValue = selectedTop.value, categoryPath = selectedCategoryPath.value) {
  const response = await fetchCategories(undefined, DISABLE_MOCK_FALLBACK)
  catalog.value = {
    ...catalog.value,
    categories: response.items,
  }

  if (!topValue || topValue === ALL_VALUE)
    return

  if (!findCategoryByValue(catalog.value.categories, topValue))
    return

  await ensureCategoryChildren(topValue, true)

  for (const value of categoryPath) {
    if (!value || value === ALL_VALUE)
      break
    if (!findCategoryByValue(catalog.value.categories, value))
      break
    await ensureCategoryChildren(value, true)
  }
}

function matchesCategoryValue(node: CategoryNode, value: string) {
  return node.id === value
    || node.path === value
    || node.code === value
    || node.name === value
}

function normalizeCategorySelection() {
  if (selectedTop.value === ALL_VALUE) {
    selectedCategoryPath.value = []
    categoryStep.value = 0
    return
  }

  const topNode = findCategoryByValue(catalog.value.categories, selectedTop.value)
  if (!topNode) {
    selectedTop.value = ALL_VALUE
    selectedCategoryPath.value = []
    selectedVariety.value = ALL_VALUE
    categoryStep.value = 0
    return
  }

  const nextPath: string[] = []
  let nodes = topNode.children ?? []
  for (const value of selectedCategoryPath.value) {
    const matched = nodes.find(node => matchesCategoryValue(node, value))
    if (!matched)
      break
    nextPath.push(value)
    nodes = matched.children ?? []
  }

  if (nextPath.length !== selectedCategoryPath.value.length)
    selectedVariety.value = ALL_VALUE

  selectedCategoryPath.value = nextPath
  categoryStep.value = Math.min(categoryStep.value, nextPath.length)
}

async function refreshCurrentCatalogState() {
  await refreshCategoryTree()
  normalizeCategorySelection()
  await refreshVarietiesForSelection()
  await loadResults()
}

async function refreshVarietiesForSelection() {
  const categoryId = getSelectedCategoryId(catalog.value.categories, selectedTop.value, selectedCategoryPath.value)
  const response = await fetchVarieties({
    categoryId: categoryId || undefined,
    keyword: appliedSearchQuery.value || undefined,
    pageNum: 1,
    pageSize: 100,
  }, DISABLE_MOCK_FALLBACK)
  catalog.value = { ...catalog.value, varieties: response.items }
  if (selectedVariety.value !== ALL_VALUE) {
    const stillAvailable = getVarietyOptionsFromCatalog(
      response.items,
      selectedTop.value,
      selectedCategoryPath.value,
      catalog.value.categories,
    ).some(option => option.value === selectedVariety.value)
    if (!stillAvailable)
      selectedVariety.value = ALL_VALUE
  }
}

async function applySearch() {
  appliedSearchQuery.value = searchDraft.value.trim()
  await refreshVarietiesForSelection()
  await loadResults()
}

async function selectTop(value: string) {
  await refreshCategoryTree(value, [])
  if (value !== ALL_VALUE && !findCategoryByValue(catalog.value.categories, value)) {
    normalizeCategorySelection()
    uni.showToast({ title: '该品类已停用', icon: 'none' })
    await refreshVarietiesForSelection()
    await loadResults()
    return
  }

  selectedTop.value = value
  selectedCategoryPath.value = []
  selectedVariety.value = ALL_VALUE
  categoryStep.value = 0
  await refreshVarietiesForSelection()
  await loadResults()
}

async function selectCategory(value: string) {
  const step = safeCategoryStep.value
  const parentValue = step === 0 ? selectedTop.value : selectedCategoryPath.value[step - 1]
  if (parentValue && parentValue !== ALL_VALUE)
    await ensureCategoryChildren(parentValue, true)

  if (value !== ALL_VALUE) {
    const parentNode = step === 0
      ? findCategoryByValue(catalog.value.categories, selectedTop.value)
      : findCategoryByValue(catalog.value.categories, selectedCategoryPath.value[step - 1])
    const currentNodes = parentNode?.children ?? []
    if (!currentNodes.some(node => matchesCategoryValue(node, value))) {
      selectedCategoryPath.value = selectedCategoryPath.value.slice(0, step)
      selectedVariety.value = ALL_VALUE
      categoryStep.value = Math.min(categoryStep.value, selectedCategoryPath.value.length)
      normalizeCategorySelection()
      uni.showToast({ title: '该品类已停用', icon: 'none' })
      await refreshVarietiesForSelection()
      await loadResults()
      return
    }
  }

  const next = selectedCategoryPath.value.slice(0, step)
  if (value !== ALL_VALUE)
    next[step] = value
  selectedCategoryPath.value = next
  selectedVariety.value = ALL_VALUE
  if (value !== ALL_VALUE)
    await ensureCategoryChildren(value, true)
  normalizeCategorySelection()
  const nextLevels = getCategoryLevelOptionsFromCatalog(
    catalog.value.categories,
    selectedTop.value,
    selectedCategoryPath.value,
  )
  if (value !== ALL_VALUE && step < nextLevels.length - 1)
    categoryStep.value = step + 1
  await refreshVarietiesForSelection()
  await loadResults()
}

async function goBackCategoryLevel() {
  if (categoryStep.value <= 0)
    return
  const nextStep = categoryStep.value - 1
  const parentValue = nextStep === 0 ? selectedTop.value : selectedCategoryPath.value[nextStep - 1]
  if (parentValue && parentValue !== ALL_VALUE)
    await ensureCategoryChildren(parentValue, true)
  selectedCategoryPath.value = selectedCategoryPath.value.slice(0, nextStep + 1)
  selectedVariety.value = ALL_VALUE
  categoryStep.value = nextStep
  normalizeCategorySelection()
  await refreshVarietiesForSelection()
  await loadResults()
}

async function selectVariety(value: string) {
  selectedVariety.value = value
  await loadResults()
}

function isContentChipActive(option: ContentChipOption) {
  return option.value === selectedVariety.value
}

function selectContentChip(option: ContentChipOption) {
  selectVariety(option.value)
}

function openDetail(item: QualityImageItem) {
  uni.navigateTo({
    url: `/pages/qc/detail/index?id=${encodeURIComponent(item.id)}`,
  })
}

function previewCardImage(item: QualityImageItem) {
  previewQualityImages(item)
}

function previewQualityImages(item: QualityImageItem) {
  const imageUrls = getQualityImageUrls(item)
  const imageUrl = getDetailImageUrl(item)
  openImagePreview(imageUrls, imageUrl)
}

function closeDetail() {
  detailItem.value = undefined
}

function openImagePreview(urls: string[], currentUrl: string) {
  if (!urls.length)
    return

  imagePreviewUrls.value = urls
  imagePreviewIndex.value = Math.max(0, urls.indexOf(currentUrl))
  imagePreviewVisible.value = true
}

function closeImagePreview() {
  imagePreviewVisible.value = false
}

function onImagePreviewChange(event: { detail?: { current?: number } }) {
  const current = Number(event.detail?.current ?? 0)
  imagePreviewIndex.value = Number.isFinite(current) ? current : 0
}

function switchPreviewImage(offset: number) {
  const total = imagePreviewUrls.value.length
  if (total <= 1)
    return

  imagePreviewIndex.value = (imagePreviewIndex.value + offset + total) % total
}

function syncImagePreviewClosePosition() {
  try {
    const systemInfo = uni.getSystemInfoSync()
    const fallbackCloseTop = (systemInfo.statusBarHeight || 44) + uni.upx2px(18)
    let nextCloseTop = fallbackCloseTop

    // #ifdef MP-WEIXIN
    const menuButton = uni.getMenuButtonBoundingClientRect()
    if (menuButton.top > 0 && menuButton.height > 0 && menuButton.bottom > 0)
      nextCloseTop = menuButton.bottom + uni.upx2px(16)
    // #endif

    imagePreviewCloseTop.value = nextCloseTop
  }
  catch {
    imagePreviewCloseTop.value = 44 + uni.upx2px(18)
  }
}

function shouldShowCategoryGuide(option: CatalogFilterOption) {
  if (option.value === ALL_VALUE)
    return false
  return Boolean(resolveCategoryGuideId(option))
}

function resolveCategoryGuideId(option: CatalogFilterOption) {
  return option.categoryId || option.id || findCategoryByValue(catalog.value.categories, option.value)?.id || ''
}

function createCategoryGuideSeed(option: CatalogFilterOption): CategoryNode {
  const pathNames = option.pathNames?.length
    ? option.pathNames
    : option.path
      ? option.path.split('/').filter(Boolean)
      : [option.label]

  return {
    id: resolveCategoryGuideId(option) || undefined,
    code: option.code || '',
    name: option.label,
    description: option.description,
    imageUrls: (option.imageUrls ?? []).filter(Boolean),
    path: option.path || pathNames.join('/'),
    pathIds: option.pathIds ?? [],
    pathNames,
    children: [],
  }
}

async function openCategoryGuide(option: CatalogFilterOption) {
  const categoryId = resolveCategoryGuideId(option)
  if (!categoryId)
    return

  const requestId = ++categoryGuideRequestId
  const seed = createCategoryGuideSeed(option)
  categoryGuideDetail.value = seed
  categoryGuideImageIndex.value = 0
  categoryGuideLoading.value = true
  await nextTick()
  categoryGuidePopup.value?.open('center')

  try {
    const detail = await fetchCategoryDetail(categoryId, DISABLE_MOCK_FALLBACK)
    if (requestId !== categoryGuideRequestId)
      return
    if (detail) {
      categoryGuideDetail.value = {
        ...seed,
        ...detail,
        name: detail.name || seed.name,
        description: detail.description || seed.description,
        imageUrls: detail.imageUrls?.length ? detail.imageUrls : seed.imageUrls,
      }
    }
  }
  finally {
    if (requestId === categoryGuideRequestId)
      categoryGuideLoading.value = false
  }
}

function closeCategoryGuide() {
  categoryGuideRequestId += 1
  categoryGuidePopup.value?.close()
}

function onCategoryGuidePopupChange(event: PopupChangeEvent) {
  if (event.show)
    return

  categoryGuideRequestId += 1
  categoryGuideLoading.value = false
  categoryGuideImageIndex.value = 0
  categoryGuideDetail.value = undefined
}

function onCategoryGuideImageChange(event: { detail?: { current?: number } }) {
  const current = Number(event.detail?.current ?? 0)
  categoryGuideImageIndex.value = Number.isFinite(current) ? current : 0
}

function switchCategoryGuideImage(offset: number) {
  const total = categoryGuideImageUrls.value.length
  if (total <= 1)
    return

  categoryGuideImageIndex.value = (categoryGuideImageIndex.value + offset + total) % total
}

function getDetailImageUrl(item: QualityImageItem) {
  return getQualityImageUrls(item)[0] || '/static/images/figma/detail/bag.png'
}

function getCardDescription(item: QualityImageItem) {
  return item.description || `官方品质参考图：${item.varietyName}细节、材质与工艺示例。`
}

function getCardMeta(item: QualityImageItem) {
  return `${item.varietyName}(${item.varietyCode})${item.categoryPath.join('/')}`
}

function getCondensedCategoryPath(item: QualityImageItem) {
  return item.categoryPath.join('/')
}

function getDetailVarietyLabel(item: QualityImageItem) {
  return `${item.varietyName}(${item.varietyCode})`
}

function saveDetailImage(item: QualityImageItem) {
  const imageUrl = getDetailImageUrl(item)

  // #ifdef H5
  uni.previewImage({
    urls: [imageUrl],
    current: imageUrl,
  })
  return
  // #endif

  if (/^https?:\/\//.test(imageUrl)) {
    uni.downloadFile({
      url: imageUrl,
      success: (res) => {
        if (res.statusCode === 200 && res.tempFilePath) {
          saveImageFile(res.tempFilePath)
          return
        }
        showSaveFailed(imageUrl)
      },
      fail: () => showSaveFailed(imageUrl),
    })
    return
  }

  uni.getImageInfo({
    src: imageUrl,
    success: res => saveImageFile(res.path),
    fail: () => showSaveFailed(imageUrl),
  })
}

function saveImageFile(filePath: string) {
  uni.saveImageToPhotosAlbum({
    filePath,
    success: () => {
      uni.showToast({ title: '保存成功', icon: 'success' })
    },
    fail: () => {
      uni.showToast({ title: '保存失败，请长按图片保存', icon: 'none' })
    },
  })
}

async function refreshUserProfile() {
  if (!userStore.token)
    return

  try {
    await userStore.fetchProfile()
  }
  catch {
    // 首页主数据加载不依赖用户资料刷新。
  }
}

function showSaveFailed(imageUrl: string) {
  uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
  uni.previewImage({
    urls: [imageUrl],
    current: imageUrl,
  })
}

function goReport() {
  if (suppressReportFabClick) {
    suppressReportFabClick = false
    clearSuppressReportFabClickTimer()
    return
  }
  openReportPage()
}

function openReportPage() {
  uni.navigateTo({ url: '/pages/report/create' })
}

function initReportFabPosition(keepCurrent = false) {
  let systemInfo: UniApp.GetSystemInfoResult
  try {
    systemInfo = uni.getSystemInfoSync()
  }
  catch {
    return
  }

  const size = uni.upx2px(90)
  const edgePadding = uni.upx2px(12)
  const rightOffset = uni.upx2px(46)
  const bottomOffset = uni.upx2px(112) + getSafeAreaBottom(systemInfo)
  const windowWidth = systemInfo.windowWidth || 0
  const windowHeight = systemInfo.windowHeight || 0
  const minLeft = edgePadding
  const minTop = edgePadding + (systemInfo.statusBarHeight || 0)
  const maxLeft = Math.max(minLeft, windowWidth - size - edgePadding)
  const maxTop = Math.max(minTop, windowHeight - size - edgePadding)

  reportFabBounds.value = { minLeft, minTop, maxLeft, maxTop }
  const savedPosition = keepCurrent ? undefined : getSavedReportFabPosition()
  reportFabPosition.value = {
    left: clamp(
      keepCurrent ? reportFabPosition.value.left : savedPosition?.left ?? windowWidth - size - rightOffset,
      minLeft,
      maxLeft,
    ),
    top: clamp(
      keepCurrent ? reportFabPosition.value.top : savedPosition?.top ?? windowHeight - size - bottomOffset,
      minTop,
      maxTop,
    ),
  }
  reportFabReady.value = true
}

function startReportFabDrag(event: any) {
  const touch = getTouchPoint(event)
  if (!touch)
    return

  clearSuppressReportFabClickTimer()
  reportFabDragState.active = true
  reportFabDragState.startX = getTouchX(touch)
  reportFabDragState.startY = getTouchY(touch)
  reportFabDragState.startLeft = reportFabPosition.value.left
  reportFabDragState.startTop = reportFabPosition.value.top
  reportFabDragState.moved = false
}

function moveReportFab(event: any) {
  if (!reportFabDragState.active)
    return

  const touch = getTouchPoint(event)
  if (!touch)
    return

  const deltaX = getTouchX(touch) - reportFabDragState.startX
  const deltaY = getTouchY(touch) - reportFabDragState.startY
  if (Math.abs(deltaX) > REPORT_FAB_DRAG_THRESHOLD || Math.abs(deltaY) > REPORT_FAB_DRAG_THRESHOLD)
    reportFabDragState.moved = true

  if (!reportFabDragState.moved)
    return

  reportFabPosition.value = {
    left: clamp(reportFabDragState.startLeft + deltaX, reportFabBounds.value.minLeft, reportFabBounds.value.maxLeft),
    top: clamp(reportFabDragState.startTop + deltaY, reportFabBounds.value.minTop, reportFabBounds.value.maxTop),
  }
}

function endReportFabDrag() {
  if (!reportFabDragState.active)
    return

  reportFabDragState.active = false
  if (reportFabDragState.moved) {
    saveReportFabPosition()
    suppressNextReportFabClick()
    return
  }

  suppressNextReportFabClick()
  openReportPage()
}

function cancelReportFabDrag() {
  if (!reportFabDragState.active)
    return

  reportFabDragState.active = false
  if (reportFabDragState.moved) {
    saveReportFabPosition()
    suppressNextReportFabClick()
  }
}

function suppressNextReportFabClick() {
  suppressReportFabClick = true
  clearSuppressReportFabClickTimer()
  suppressReportFabClickTimer = setTimeout(() => {
    suppressReportFabClick = false
    suppressReportFabClickTimer = undefined
  }, 500)
}

function getSavedReportFabPosition() {
  try {
    const position = uni.getStorageSync(REPORT_FAB_POSITION_STORAGE_KEY) as Partial<{ left: number, top: number }> | ''
    if (!position || typeof position.left !== 'number' || typeof position.top !== 'number')
      return undefined
    return position
  }
  catch {
    return undefined
  }
}

function saveReportFabPosition() {
  try {
    uni.setStorageSync(REPORT_FAB_POSITION_STORAGE_KEY, reportFabPosition.value)
  }
  catch {
    // 缓存失败不影响拖动和跳转。
  }
}

function getTouchPoint(event: any) {
  return event.touches?.[0] || event.changedTouches?.[0]
}

function getTouchX(touch: any) {
  return Number(touch.clientX ?? touch.pageX ?? 0)
}

function getTouchY(touch: any) {
  return Number(touch.clientY ?? touch.pageY ?? 0)
}

function getSafeAreaBottom(systemInfo: UniApp.GetSystemInfoResult) {
  return systemInfo.safeAreaInsets?.bottom || 0
}

function clearSuppressReportFabClickTimer() {
  if (!suppressReportFabClickTimer)
    return
  clearTimeout(suppressReportFabClickTimer)
  suppressReportFabClickTimer = undefined
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatTopOption(option: CatalogFilterOption): CatalogFilterOption {
  return {
    ...option,
    label: option.value === ALL_VALUE ? '全部' : option.label,
  }
}

function formatCategoryOption(option: CatalogFilterOption): CatalogFilterOption {
  if (option.value === ALL_VALUE)
    return { ...option, label: '全部' }
  return option
}

function formatVarietyOption(option: CatalogFilterOption): CatalogFilterOption {
  if (option.value === ALL_VALUE)
    return { ...option, label: '全部' }
  return {
    ...option,
    label: option.label.replace(/\s*\([^)]*\)\s*$/, ''),
  }
}
</script>

<template>
  <view class="home-page">
    <image
      class="bg-header"
      src="/static/images/figma/mine/mine-bg.svg"
      mode="scaleToFill"
    />

    <view
      class="hero"
      :style="{ '--status-bar-height': `${statusBarHeight}px` }"
    >
      <view class="hero-main">
        <view class="brand-copy">
          <text class="brand-title">
            品检图例
          </text>
          <text class="brand-subtitle">
            Quality Samples
          </text>
        </view>
        <image
          class="hero-visual"
          src="/static/images/qc/home_hero.png"
          mode="aspectFit"
        />
      </view>

      <view class="search-row">
        <view class="search-icon" />
        <input
          v-model="searchDraft"
          class="search-input"
          confirm-type="search"
          placeholder="搜索品种、类目"
          placeholder-class="placeholder"
          @confirm="applySearch"
        />
        <button
          class="search-button"
          hover-class="none"
          @click="applySearch"
        >
          搜索
        </button>
      </view>
    </view>

    <view class="body-shell">
      <scroll-view
        class="top-tabs"
        scroll-x
        :show-scrollbar="false"
      >
        <view class="top-tabs-inner">
          <view
            v-for="option in topTabs"
            :key="option.value"
            class="top-tab-entry"
          >
            <button
              :class="['top-tab', option.value === selectedTop ? 'top-tab-active' : '']"
              hover-class="none"
              @click="selectTop(option.value)"
            >
              <text>{{ option.label }}</text>
              <view class="top-tab-line" />
            </button>
            <button
              v-if="shouldShowCategoryGuide(option)"
              class="top-tab-help"
              hover-class="none"
              @click="openCategoryGuide(option)"
            >
              <uni-icons
                class="help-uni-icon"
                type="help"
                size="18"
                color="#B9C0CA"
              />
            </button>
          </view>
        </view>
      </scroll-view>

      <view
        v-if="loading"
        class="state-panel"
      >
        <view class="loading-mark" />
        <text>正在加载品质图片...</text>
      </view>

      <view
        v-else-if="loadError"
        class="state-panel state-panel-error"
      >
        <text class="state-title">
          网络异常
        </text>
        <text class="state-desc">
          {{ loadError }}
        </text>
        <button
          class="retry-button"
          hover-class="none"
          @click="load"
        >
          点击重试
        </button>
      </view>

      <view
        v-else
        class="main-panel"
      >
        <scroll-view
          v-if="showLeftNav"
          class="category-side"
          scroll-y
          :show-scrollbar="false"
        >
          <button
            v-if="safeCategoryStep > 0"
            class="category-item category-back"
            hover-class="none"
            @click="goBackCategoryLevel"
          >
            返回
          </button>
          <view
            v-for="option in categoryNavOptions"
            :key="option.value"
            class="category-item-row"
          >
            <button
              :class="[
                'category-item',
                option.value === (selectedCategoryPath[safeCategoryStep] ?? ALL_VALUE) ? 'category-item-active' : '',
              ]"
              hover-class="none"
              @click="selectCategory(option.value)"
            >
              <view class="category-label-wrap">
                <text class="category-label">
                  {{ option.label }}
                </text>
              </view>
            </button>
            <button
              v-if="shouldShowCategoryGuide(option)"
              class="category-help"
              hover-class="none"
              @click="openCategoryGuide(option)"
            >
              <uni-icons
                class="help-uni-icon"
                type="help"
                size="18"
                color="#B9C0CA"
              />
            </button>
          </view>
        </scroll-view>

        <view class="result-area">
          <scroll-view
            class="product-filter-scroll"
            scroll-x
            :show-scrollbar="false"
          >
            <view class="product-filter-list">
              <button
                v-for="option in contentChips"
                :key="`${option.kind}-${option.value}`"
                :class="['product-chip', isContentChipActive(option) ? 'product-chip-active' : '']"
                hover-class="none"
                @click="selectContentChip(option)"
              >
                {{ option.label }}
              </button>
            </view>
          </scroll-view>

          <view
            v-if="filteredItems.length === 0"
            class="empty-state"
          >
            <image
              class="empty-illustration"
              src="/static/images/qc/sous.png"
              mode="aspectFit"
            />
            <text class="empty-title">
              暂无相关品质图片
            </text>
            <text class="empty-desc">
              请尝试更换筛选条件或搜索词
            </text>
          </view>

          <scroll-view
            v-else
            class="image-grid-scroll"
            scroll-y
            :lower-threshold="80"
            :show-scrollbar="false"
            @scrolltolower="loadMoreResults"
          >
            <view class="image-grid">
              <view
                v-for="item in filteredItems"
                :key="item.id"
                class="image-card"
              >
                <view
                  :class="['image-wrap', `tone-${item.placeholderTone || 'green'}`]"
                  @click.stop="previewCardImage(item)"
                >
                  <image
                    v-if="item.imageUrl"
                    class="sample-image"
                    :src="item.imageUrl"
                    mode="aspectFit"
                  />
                  <text
                    v-else
                    class="image-caption"
                  >
                    {{ item.varietyName }}
                  </text>
                </view>
                <view
                  class="card-body"
                  @click="openDetail(item)"
                >
                  <text class="card-title">
                    {{ getCardDescription(item) }}
                  </text>
                  <text class="card-meta">
                    {{ getCardMeta(item) }}
                  </text>
                </view>
              </view>
            </view>
            <view
              v-if="loadingMore || loadMoreError || !hasMore"
              class="load-more-state"
            >
              <text v-if="loadingMore">
                加载中...
              </text>
              <button
                v-else-if="loadMoreError"
                class="load-more-retry"
                hover-class="none"
                @click.stop="loadMoreResults"
              >
                加载失败，点击重试
              </button>
              <text v-else>
                没有更多了
              </text>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <uni-popup
      ref="categoryGuidePopup"
      type="center"
      background-color="transparent"
      mask-background-color="rgba(37, 38, 43, 0.4)"
      :safe-area="false"
      @change="onCategoryGuidePopupChange"
    >
      <view
        v-if="categoryGuideDetail"
        class="category-guide-popup"
      >
        <button
          class="category-guide-close"
          hover-class="none"
          @click="closeCategoryGuide"
        >
          <view class="category-guide-close-icon" />
        </button>

        <view class="category-guide-head">
          <text class="category-guide-title">
            {{ categoryGuideTitle }}
          </text>
          <text class="category-guide-desc">
            {{ categoryGuideDescription }}
          </text>
        </view>

        <view class="category-guide-media-shell">
          <view class="category-guide-media">
            <swiper
              v-if="categoryGuideImageUrls.length"
              class="category-guide-swiper"
              :current="categoryGuideImageIndex"
              circular
              @change="onCategoryGuideImageChange"
            >
              <swiper-item
                v-for="imageUrl in categoryGuideImageUrls"
                :key="imageUrl"
              >
                <image
                  class="category-guide-image"
                  :src="imageUrl"
                  mode="aspectFit"
                />
              </swiper-item>
            </swiper>
            <view
              v-else
              class="category-guide-empty"
            >
              <text>{{ categoryGuideEmptyText }}</text>
            </view>
          </view>

          <template v-if="categoryGuideShowNav">
            <button
              class="category-guide-nav category-guide-nav-prev"
              hover-class="none"
              @click="switchCategoryGuideImage(-1)"
            >
              <view class="category-guide-nav-icon category-guide-nav-icon-prev" />
            </button>
            <button
              class="category-guide-nav category-guide-nav-next"
              hover-class="none"
              @click="switchCategoryGuideImage(1)"
            >
              <view class="category-guide-nav-icon category-guide-nav-icon-next" />
            </button>
          </template>
        </view>

        <view
          v-if="categoryGuideImageUrls.length > 1"
          class="category-guide-dots"
        >
          <view
            v-for="(imageUrl, index) in categoryGuideImageUrls"
            :key="`${imageUrl}-${index}`"
            :class="['category-guide-dot', index === categoryGuideImageIndex ? 'category-guide-dot-active' : '']"
          />
        </view>
      </view>
    </uni-popup>

    <button
      v-if="canShowReportFab"
      class="report-fab"
      hover-class="none"
      :style="reportFabStyle"
      @click="goReport"
      @touchstart.stop="startReportFabDrag"
      @touchmove.stop.prevent="moveReportFab"
      @touchend.stop="endReportFabDrag"
      @touchcancel.stop="cancelReportFabDrag"
    >
      <text class="fab-plus">
        +
      </text>
    </button>

    <view
      v-if="detailItem"
      class="detail-page-overlay"
    >
      <view class="detail-hero">
        <image
          class="detail-hero-bg"
          src="/static/images/figma/detail/image-detail-bg.svg"
          mode="scaleToFill"
        />
        <view
          class="detail-top"
          :style="{ paddingTop: `${statusBarHeight}px` }"
        >
          <button
            class="detail-back"
            hover-class="none"
            @click="closeDetail"
          >
            <view class="detail-back-icon" />
          </button>
        </view>

        <view class="detail-product-scene">
          <image
            class="detail-product-shadow"
            src="/static/images/figma/detail/product-shadow.svg"
            mode="aspectFill"
          />
          <image
            class="detail-product-image"
            :src="getDetailImageUrl(detailItem)"
            mode="aspectFit"
          />
        </view>
      </view>

      <view class="detail-sheet">
        <view class="detail-field-row">
          <view class="detail-label-wrap">
            <view class="detail-label-mark" />
            <text class="detail-label">品类</text>
          </view>
          <text class="detail-value">
            {{ getCondensedCategoryPath(detailItem) }}
          </text>
        </view>

        <view class="detail-field-row">
          <view class="detail-label-wrap">
            <view class="detail-label-mark" />
            <text class="detail-label">品种</text>
          </view>
          <text class="detail-value detail-value-small">
            {{ getDetailVarietyLabel(detailItem) }}
          </text>
        </view>

        <view class="detail-field-row detail-desc-row">
          <view class="detail-label-wrap">
            <view class="detail-label-mark" />
            <text class="detail-label">描述</text>
          </view>
          <text class="detail-value detail-desc">
            {{ detailItem.description || getFullCategoryPath(detailItem) }}
          </text>
        </view>
      </view>

      <view class="detail-bottom-bar">
        <button
          class="detail-save-button"
          hover-class="none"
          @click="saveDetailImage(detailItem)"
        >
          <image
            class="detail-save-icon"
            src="/static/images/figma/detail/download.svg"
            mode="aspectFit"
          />
          <text>保存图片</text>
        </button>
      </view>
    </view>

    <view
      v-if="imagePreviewVisible"
      class="image-preview-mask"
      @click="closeImagePreview"
    >
      <button
        class="image-preview-close"
        hover-class="none"
        :style="imagePreviewCloseStyle"
        @click.stop="closeImagePreview"
      >
        <view class="image-preview-close-icon" />
      </button>
      <swiper
        class="image-preview-swiper"
        :current="imagePreviewIndex"
        circular
        @change="onImagePreviewChange"
        @click.stop
      >
        <swiper-item
          v-for="imageUrl in imagePreviewUrls"
          :key="imageUrl"
        >
          <image
            class="image-preview-image"
            :src="imageUrl"
            mode="aspectFit"
            @click.stop
          />
        </swiper-item>
      </swiper>
      <template v-if="imagePreviewUrls.length > 1">
        <button
          class="image-preview-nav image-preview-nav-prev"
          hover-class="none"
          @click.stop="switchPreviewImage(-1)"
        >
          <view class="image-preview-nav-icon image-preview-nav-icon-prev" />
        </button>
        <button
          class="image-preview-nav image-preview-nav-next"
          hover-class="none"
          @click.stop="switchPreviewImage(1)"
        >
          <view class="image-preview-nav-icon image-preview-nav-icon-next" />
        </button>
      </template>
    </view>
  </view>
</template>

<style scoped>
.home-page {
  position: relative;
  min-height: calc(100vh - var(--window-bottom, 0px));
  box-sizing: border-box;
  overflow-x: hidden;
  background: #f7f7f7;
  color: #25262b;
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}

.bg-header {
  position: absolute;
  z-index: 0;
  left: 0;
  right: 0;
  top: 0;
  width: 100%;
  height: 464rpx;
}

.hero {
  position: relative;
  z-index: 1;
  height: 416rpx;
  box-sizing: border-box;
  overflow: hidden;
  background: transparent;
}

.hero-main {
  position: absolute;
  z-index: 1;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.brand-copy {
  position: absolute;
  z-index: 2;
  left: 72rpx;
  top: calc(var(--status-bar-height, 44px) + 95rpx);
}

.brand-title,
.brand-subtitle {
  display: block;
  color: #25262b;
}

.brand-title {
  font-size: 60rpx;
  font-weight: 900;
  letter-spacing: 8rpx;
  line-height: 64rpx;
}

.brand-subtitle {
  margin-top: 6rpx;
  font-size: 44rpx;
  font-weight: 500;
  line-height: 52rpx;
}

.hero-visual {
  position: absolute;
  right: 72rpx;
  top: calc(var(--status-bar-height, 44px) - 8rpx);
  width: 303rpx;
  height: 303rpx;
}

.search-row {
  position: absolute;
  z-index: 2;
  display: flex;
  left: 50rpx;
  right: 50rpx;
  top: calc(var(--status-bar-height, 44px) + 238rpx);
  width: auto;
  height: 70rpx;
  align-items: center;
  box-sizing: border-box;
  margin: 0;
  padding: 0 11rpx 0 34rpx;
  border: 2rpx solid #92e616;
  border-radius: 20rpx;
  background: #fff;
}

.search-icon {
  position: relative;
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-right: 24rpx;
}

.search-icon::before {
  position: absolute;
  left: 1rpx;
  top: 1rpx;
  width: 18rpx;
  height: 18rpx;
  border: 4rpx solid #a2a9bb;
  border-radius: 50%;
  content: '';
}

.search-icon::after {
  position: absolute;
  right: 2rpx;
  bottom: 5rpx;
  width: 13rpx;
  height: 4rpx;
  border-radius: 999rpx;
  background: #a2a9bb;
  content: '';
  transform: rotate(45deg);
}

.search-input {
  min-width: 0;
  flex: 1;
  height: 66rpx;
  color: #25262b;
  font-size: 26rpx;
  line-height: 66rpx;
}

.placeholder {
  color: #777978;
}

.search-button {
  flex-shrink: 0;
  width: 74rpx;
  height: 50rpx;
  margin: 0;
  padding: 0;
  border-radius: 10rpx;
  background: #92e616;
  color: #25262b;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 50rpx;
}

.body-shell {
  position: relative;
  z-index: 1;
  height: calc(100vh - var(--window-bottom, 0px) - 416rpx);
  overflow: hidden;
  border-radius: 30rpx 30rpx 0 0;
  background: #fff;
}

.top-tabs {
  width: 100%;
  height: 113rpx;
  white-space: nowrap;
  background: #fff;
}

.top-tabs-inner {
  display: inline-flex;
  gap: 58rpx;
  min-width: 100%;
  box-sizing: border-box;
  padding: 36rpx 68rpx 0 38rpx;
}

.top-tab-entry {
  position: relative;
  display: inline-block;
  height: 77rpx;
  overflow: visible;
}

.top-tab {
  position: relative;
  width: auto;
  height: 77rpx;
  margin: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #25262b;
  font-size: 30rpx;
  font-weight: 400;
  line-height: 40rpx;
  white-space: nowrap;
}

.top-tab-active {
  font-weight: 400;
}

.top-tab-line {
  position: absolute;
  left: 50%;
  bottom: 0;
  display: none;
  width: 60rpx;
  height: 10rpx;
  background: #92e616;
  transform: translateX(-50%);
}

.top-tab-active .top-tab-line {
  display: block;
}

.top-tab-help {
  position: absolute;
  z-index: 2;
  left: 100%;
  top: 4rpx;
  display: flex;
  width: 32rpx;
  height: 32rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  margin-left: 8rpx;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: 1;
}

.main-panel {
  display: flex;
  height: calc(100% - 113rpx);
  min-height: 0;
  background: #fff;
}

.category-side {
  width: 180rpx;
  height: 100%;
  min-height: 0;
  flex-shrink: 0;
  overflow: hidden;
  background: #f7f7f7;
}

.category-item-row {
  position: relative;
  width: 100%;
  height: 100rpx;
}

.category-item {
  position: relative;
  z-index: 0;
  display: flex;
  width: 100%;
  height: 100rpx;
  align-items: center;
  box-sizing: border-box;
  margin: 0;
  padding: 0 52rpx 0 38rpx;
  border-radius: 0;
  background: transparent;
  color: #000;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 100rpx;
  text-align: left;
}

.category-item-active {
  background: transparent;
  color: #25262b;
  font-weight: 700;
}

.category-item-active::before {
  position: absolute;
  z-index: 0;
  left: 20rpx;
  right: 0;
  top: 6rpx;
  bottom: 6rpx;
  border-radius: 24rpx 0 0 24rpx;
  background: #fff;
  content: '';
}

.category-label-wrap {
  position: relative;
  z-index: 1;
  display: inline-block;
  max-width: 90rpx;
  line-height: 32rpx;
  white-space: normal;
  word-break: break-all;
}

.category-label {
  display: inline;
  white-space: normal;
}

.category-item-active .category-label-wrap::after {
  position: absolute;
  z-index: 1;
  left: 0;
  right: 0;
  bottom: -8rpx;
  display: block;
  width: 100%;
  height: 10rpx;
  box-sizing: border-box;
  border: 0;
  border-radius: 0;
  background: #92e616;
  content: '';
  pointer-events: none;
}

.category-help {
  position: absolute;
  z-index: 2;
  right: 26rpx;
  top: 50%;
  display: flex;
  width: 32rpx;
  height: 32rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: 1;
  transform: translateY(-50%);
}

.help-uni-icon {
  display: block;
  line-height: 1;
}

.top-tab-help .help-uni-icon {
  transform: translateY(1rpx);
}

.category-back {
  color: #5f9f00;
  font-size: 24rpx;
}

.result-area {
  min-width: 0;
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.product-filter-scroll {
  width: 100%;
  height: 100rpx;
  flex-shrink: 0;
  white-space: nowrap;
}

.product-filter-list {
  display: inline-flex;
  gap: 12rpx;
  box-sizing: border-box;
  min-width: 100%;
  padding: 18rpx 30rpx 12rpx 19rpx;
}

.product-chip {
  min-width: 116rpx;
  height: 70rpx;
  margin: 0;
  padding: 0 28rpx;
  border-radius: 30rpx;
  background: #f7f7f7;
  color: #777978;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 70rpx;
  white-space: nowrap;
}

.product-chip-active {
  background: #25262b;
  color: #fff;
  font-weight: 500;
}

.state-panel {
  display: flex;
  min-height: 760rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  color: #777978;
  font-size: 24rpx;
  background: #fff;
}

.loading-mark {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid #e4f8ca;
  border-top-color: #92e616;
  border-radius: 50%;
}

.state-panel-error {
  padding: 0 48rpx;
  text-align: center;
}

.state-title {
  color: #25262b;
  font-size: 30rpx;
  font-weight: 700;
}

.state-desc {
  color: #777978;
  font-size: 24rpx;
  line-height: 36rpx;
}

.retry-button {
  height: 58rpx;
  margin: 8rpx 0 0;
  padding: 0 30rpx;
  border-radius: 16rpx;
  background: #92e616;
  color: #25262b;
  font-size: 24rpx;
  line-height: 58rpx;
}

.empty-state {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  align-items: center;
  padding-top: 112rpx;
  box-sizing: border-box;
  text-align: center;
}

.empty-illustration {
  width: 76rpx;
  height: 76rpx;
  margin-bottom: 18rpx;
}

.empty-title {
  color: #777978;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 34rpx;
}

.empty-desc {
  margin-top: 4rpx;
  color: #777978;
  font-size: 22rpx;
  line-height: 32rpx;
}

.image-grid-scroll {
  height: calc(100% - 100rpx);
  min-height: 0;
  overflow: hidden;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 34rpx 20rpx;
  padding: 17rpx 24rpx 44rpx;
}

.load-more-state {
  display: flex;
  min-height: 96rpx;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 6rpx 0 28rpx;
  color: #777978;
  font-size: 24rpx;
  line-height: 34rpx;
}

.load-more-retry {
  height: 56rpx;
  margin: 0;
  padding: 0 28rpx;
  border-radius: 14rpx;
  background: #f7f7f7;
  color: #25262b;
  font-size: 24rpx;
  line-height: 56rpx;
}

.image-card {
  width: calc((100% - 20rpx) / 2);
  overflow: visible;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  line-height: normal;
  text-align: left;
}

.image-wrap {
  position: relative;
  display: flex;
  width: 100%;
  height: 248rpx;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 16rpx;
  background: #f7f7f7;
}

.tone-green,
.tone-orange,
.tone-blue {
  background: #f7f7f7;
}

.sample-image {
  width: 100%;
  height: 100%;
}

.image-caption {
  color: #25262b;
  font-size: 28rpx;
  font-weight: 700;
  text-align: center;
}

.card-body {
  display: flex;
  min-height: 174rpx;
  flex-direction: column;
  box-sizing: border-box;
  padding: 16rpx 2rpx 0;
}

.card-title {
  display: -webkit-box;
  overflow: hidden;
  color: #25262b;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 32rpx;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.card-meta {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 12rpx;
  color: #777978;
  font-size: 24rpx;
  font-weight: 400;
  line-height: 32rpx;
  text-overflow: ellipsis;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.report-fab {
  position: fixed;
  z-index: 20;
  right: 46rpx;
  bottom: calc(112rpx + var(--window-bottom, 0px) + env(safe-area-inset-bottom));
  display: flex;
  box-sizing: border-box;
  width: 90rpx;
  height: 90rpx;
  align-items: center;
  justify-content: center;
  line-height: 1;
  margin: 0;
  padding: 0;
  border: 4rpx solid #fff;
  border-radius: 50%;
  background: #92e616;
  box-shadow: 0 8rpx 18rpx rgba(37, 38, 43, 0.2);
  touch-action: none;
}

.fab-plus {
  display: flex;
  width: 48rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 74rpx;
  font-weight: 300;
  line-height: 48rpx;
  transform: translateY(-3rpx);
}

.search-button::after,
.retry-button::after,
.load-more-retry::after,
.top-tab::after,
.top-tab-help::after,
.category-item::after,
.category-help::after,
.product-chip::after,
.image-card::after,
.report-fab::after,
.detail-back::after,
.detail-save-button::after,
.category-guide-close::after,
.category-guide-nav::after {
  border: 0;
}

.detail-page-overlay {
  position: fixed;
  z-index: 80;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  overflow-y: auto;
  box-sizing: border-box;
  padding-bottom: calc(130rpx + env(safe-area-inset-bottom));
  background: #fff;
  color: #25262b;
}

.detail-hero {
  position: relative;
  height: 991rpx;
  overflow: hidden;
  background: #ebe8e3;
}

.detail-hero-bg {
  position: absolute;
  z-index: 0;
  left: 0;
  top: 0;
  width: 100%;
  height: 1036rpx;
}

.detail-top {
  position: relative;
  z-index: 3;
  box-sizing: border-box;
  height: 176rpx;
}

.detail-back {
  position: absolute;
  left: 28rpx;
  bottom: 28rpx;
  display: flex;
  width: 60rpx;
  height: 60rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 18rpx;
  background: rgba(37, 38, 43, 0.48);
  line-height: 1;
}

.detail-back-icon {
  width: 22rpx;
  height: 22rpx;
  border-bottom: 4rpx solid #fff;
  border-left: 4rpx solid #fff;
  transform: rotate(45deg);
}

.detail-product-scene {
  position: absolute;
  z-index: 1;
  left: 45rpx;
  top: 185rpx;
  width: 660rpx;
  height: 660rpx;
}

.detail-product-image {
  position: absolute;
  z-index: 2;
  left: 0;
  top: 0;
  width: 660rpx;
  height: 660rpx;
}

.detail-product-shadow {
  position: absolute;
  z-index: 1;
  left: 124rpx;
  top: 490rpx;
  width: 408rpx;
  height: 97rpx;
}

.detail-sheet {
  position: relative;
  z-index: 2;
  min-height: 633rpx;
  margin-top: -1rpx;
  box-sizing: border-box;
  padding: 0 50rpx;
  border-radius: 40rpx 40rpx 0 0;
  background: #fff;
}

.detail-field-row {
  display: flex;
  align-items: center;
  min-height: 130rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.detail-desc-row {
  align-items: start;
  padding-top: 45rpx;
}

.detail-label-wrap {
  position: relative;
  width: 152rpx;
  flex-shrink: 0;
  height: 40rpx;
}

.detail-label-mark {
  position: absolute;
  left: 1rpx;
  bottom: 5rpx;
  width: 58rpx;
  height: 10rpx;
  background: #92e616;
}

.detail-label {
  position: relative;
  z-index: 1;
  color: #25262b;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 40rpx;
}

.detail-value {
  min-width: 0;
  flex: 1;
  color: #777978;
  font-size: 28rpx;
  font-weight: 400;
  line-height: 40rpx;
}

.detail-value-small {
  font-size: 26rpx;
}

.detail-desc {
  display: block;
  white-space: normal;
}

.detail-bottom-bar {
  position: fixed;
  z-index: 90;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  height: calc(130rpx + env(safe-area-inset-bottom));
  padding: 15rpx 50rpx calc(15rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #ebeaef;
  background: #fff;
}

.detail-save-button {
  display: flex;
  width: 100%;
  height: 100rpx;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 30rpx;
  background: #25262b;
  color: #fff;
  font-size: 30rpx;
  font-weight: 400;
  line-height: 100rpx;
}

.detail-save-icon {
  width: 40rpx;
  height: 40rpx;
}

.category-guide-popup {
  position: relative;
  width: 720rpx;
  box-sizing: border-box;
  padding: 30rpx 16rpx 22rpx;
  border-radius: 28rpx;
  background: #fff;
  box-shadow: 0 18rpx 44rpx rgba(37, 38, 43, 0.14);
}

.category-guide-close {
  position: absolute;
  z-index: 3;
  top: 18rpx;
  right: 18rpx;
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999rpx;
  background: #f3f5f8;
}

.category-guide-close-icon {
  position: relative;
  width: 28rpx;
  height: 28rpx;
}

.category-guide-close-icon::before,
.category-guide-close-icon::after {
  position: absolute;
  left: 12rpx;
  top: 0;
  width: 4rpx;
  height: 28rpx;
  border-radius: 999rpx;
  background: #9aa0ae;
  content: '';
}

.category-guide-close-icon::before {
  transform: rotate(45deg);
}

.category-guide-close-icon::after {
  transform: rotate(-45deg);
}

.category-guide-head {
  padding: 2rpx 86rpx 0 0;
}

.category-guide-media-shell {
  position: relative;
  margin-top: 28rpx;
  padding: 0 4rpx;
}

.category-guide-media {
  position: relative;
  height: 530rpx;
  overflow: hidden;
  border-radius: 24rpx;
  background: #f6f8fb;
}

.category-guide-swiper {
  width: 100%;
  height: 100%;
}

.category-guide-image {
  display: block;
  width: 100%;
  height: 100%;
}

.category-guide-empty {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #9aa0ae;
  font-size: 26rpx;
}

.category-guide-nav {
  position: absolute;
  z-index: 2;
  top: 50%;
  display: flex;
  width: 54rpx;
  height: 54rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999rpx;
  background: #fff;
  box-shadow: 0 6rpx 20rpx rgba(37, 38, 43, 0.12);
  transform: translateY(-50%);
}

.category-guide-nav-prev {
  left: 0;
}

.category-guide-nav-next {
  right: 0;
}

.category-guide-nav-icon {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #5f6572;
  border-right: 3rpx solid #5f6572;
}

.category-guide-nav-icon-prev {
  transform: rotate(-135deg);
}

.category-guide-nav-icon-next {
  transform: rotate(45deg);
}

.category-guide-dots {
  display: flex;
  margin-top: 18rpx;
  justify-content: center;
  gap: 10rpx;
}

.category-guide-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #d8dce6;
}

.category-guide-dot-active {
  background: #92e616;
}

.category-guide-title {
  display: block;
  color: #1f2d3d;
  font-size: 52rpx;
  font-weight: 700;
  line-height: 60rpx;
}

.category-guide-desc {
  display: block;
  margin-top: 22rpx;
  color: #4f6275;
  font-size: 28rpx;
  line-height: 46rpx;
  white-space: pre-wrap;
}

.image-preview-mask {
  position: fixed;
  z-index: 999;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.92);
}

.image-preview-swiper {
  width: 100%;
  height: 100%;
}

.image-preview-image {
  display: block;
  width: 100%;
  height: 100%;
}

.image-preview-close {
  position: fixed;
  z-index: 1002;
  top: calc(70rpx + env(safe-area-inset-top));
  right: 34rpx;
  display: flex;
  width: 72rpx;
  height: 72rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
}

.image-preview-close::after {
  border: 0;
}

.image-preview-close-icon {
  position: relative;
  width: 30rpx;
  height: 30rpx;
}

.image-preview-close-icon::before,
.image-preview-close-icon::after {
  position: absolute;
  left: 14rpx;
  top: 0;
  width: 4rpx;
  height: 30rpx;
  border-radius: 999rpx;
  background: #fff;
  content: "";
}

.image-preview-close-icon::before {
  transform: rotate(45deg);
}

.image-preview-close-icon::after {
  transform: rotate(-45deg);
}

.image-preview-nav {
  position: fixed;
  z-index: 1001;
  top: 50%;
  display: flex;
  width: 86rpx;
  height: 86rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.18);
  transform: translateY(-50%);
}

.image-preview-nav::after {
  border: 0;
}

.image-preview-nav-prev {
  left: 28rpx;
}

.image-preview-nav-next {
  right: 28rpx;
}

.image-preview-nav-icon {
  width: 24rpx;
  height: 24rpx;
  border-top: 5rpx solid #fff;
  border-right: 5rpx solid #fff;
}

.image-preview-nav-icon-prev {
  transform: translateX(5rpx) rotate(-135deg);
}

.image-preview-nav-icon-next {
  transform: translateX(-5rpx) rotate(45deg);
}
</style>
