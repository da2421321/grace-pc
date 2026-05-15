<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  ALL_VALUE,
  fetchCategories,
  fetchQualityImages,
  fetchVarieties,
  findCategoryByValue,
  getCategoryLevelOptionsFromCatalog,
  getFullCategoryPath,
  getSelectedCategoryId,
  getTopCategoryOptionsFromCatalog,
  getVarietyOptionsFromCatalog,
  type CatalogFilterOption,
  type CategoryVarietyResponse,
  type QualityImageApiResponse,
  type QualityImageItem,
  type QualityImageQuery,
} from '@/data/qc'

interface ContentChipOption extends CatalogFilterOption {
  kind: 'variety'
}

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
let queryRequestId = 0
const PAGE_SIZE = 20
const currentPage = ref(1)
const hasMore = ref(false)

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

onLoad(() => {
  try {
    statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 44
  }
  catch {
    statusBarHeight.value = 44
  }
  load()
})

async function load() {
  const requestId = ++queryRequestId
  loading.value = true
  loadError.value = ''
  loadMoreError.value = ''
  try {
    const [categoryResponse, varietyResponse, imageResponse] = await Promise.all([
      fetchCategories(),
      fetchVarieties({ pageNum: 1, pageSize: 100 }),
      fetchQualityImages({ pageNum: 1, pageSize: PAGE_SIZE }),
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
    const response = await fetchQualityImages(buildQueryParams(pageNum))
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

async function ensureCategoryChildren(value: string) {
  const node = findCategoryByValue(catalog.value.categories, value)
  if (!node?.id || node.leaf || node.children.length > 0)
    return

  const response = await fetchCategories({ parentId: node.id })
  node.children = response.items
  node.hasChildren = response.items.length > 0
  node.leaf = response.items.length === 0
  catalog.value = {
    ...catalog.value,
    categories: [...catalog.value.categories],
  }
}

async function refreshVarietiesForSelection() {
  const categoryId = getSelectedCategoryId(catalog.value.categories, selectedTop.value, selectedCategoryPath.value)
  const response = await fetchVarieties({
    categoryId: categoryId || undefined,
    keyword: appliedSearchQuery.value || undefined,
    pageNum: 1,
    pageSize: 100,
  })
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
  selectedTop.value = value
  selectedCategoryPath.value = []
  selectedVariety.value = ALL_VALUE
  categoryStep.value = 0
  if (value !== ALL_VALUE)
    await ensureCategoryChildren(value)
  await refreshVarietiesForSelection()
  await loadResults()
}

async function selectCategory(value: string) {
  const step = safeCategoryStep.value
  const next = selectedCategoryPath.value.slice(0, step)
  if (value !== ALL_VALUE)
    next[step] = value
  selectedCategoryPath.value = next
  selectedVariety.value = ALL_VALUE
  if (value !== ALL_VALUE)
    await ensureCategoryChildren(value)
  const nextLevels = getCategoryLevelOptionsFromCatalog(catalog.value.categories, selectedTop.value, next)
  if (value !== ALL_VALUE && step < nextLevels.length - 1)
    categoryStep.value = step + 1
  await refreshVarietiesForSelection()
  await loadResults()
}

async function goBackCategoryLevel() {
  if (categoryStep.value <= 0)
    return
  const nextStep = categoryStep.value - 1
  selectedCategoryPath.value = selectedCategoryPath.value.slice(0, nextStep + 1)
  selectedVariety.value = ALL_VALUE
  categoryStep.value = nextStep
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

function closeDetail() {
  detailItem.value = undefined
}

function getDetailImageUrl(item: QualityImageItem) {
  return item.imageUrl || '/static/images/figma/detail/bag.png'
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

function showSaveFailed(imageUrl: string) {
  uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
  uni.previewImage({
    urls: [imageUrl],
    current: imageUrl,
  })
}

function goReport() {
  uni.navigateTo({ url: '/pages/report/create' })
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
          <button
            v-for="option in topTabs"
            :key="option.value"
            :class="['top-tab', option.value === selectedTop ? 'top-tab-active' : '']"
            hover-class="none"
            @click="selectTop(option.value)"
          >
            <text>{{ option.label }}</text>
            <view class="top-tab-line" />
          </button>
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
          <button
            v-for="option in categoryNavOptions"
            :key="option.value"
            :class="[
              'category-item',
              option.value === (selectedCategoryPath[safeCategoryStep] ?? ALL_VALUE) ? 'category-item-active' : '',
            ]"
            hover-class="none"
            @click="selectCategory(option.value)"
          >
            <text class="category-label">
              {{ option.label }}
            </text>
          </button>
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
              <button
                v-for="item in filteredItems"
                :key="item.id"
                class="image-card"
                hover-class="none"
                @click="openDetail(item)"
              >
                <view :class="['image-wrap', `tone-${item.placeholderTone || 'green'}`]">
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
                <view class="card-body">
                  <text class="card-title">
                    {{ getCardDescription(item) }}
                  </text>
                  <text class="card-meta">
                    {{ getCardMeta(item) }}
                  </text>
                </view>
              </button>
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

    <button
      class="report-fab"
      hover-class="none"
      @click="goReport"
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
  padding: 36rpx 68rpx 0;
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

.category-item {
  position: relative;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100rpx;
  box-sizing: border-box;
  margin: 0;
  padding: 0 20rpx 0 66rpx;
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

.category-label {
  position: relative;
  z-index: 1;
}

.category-back {
  color: #777978;
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
  gap: 42rpx 24rpx;
  padding: 17rpx 52rpx 44rpx 26rpx;
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
  width: 234rpx;
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
  width: 234rpx;
  height: 282rpx;
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
.category-item::after,
.product-chip::after,
.image-card::after,
.report-fab::after,
.detail-back::after,
.detail-save-button::after {
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
</style>
