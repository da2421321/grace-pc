<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  ALL_VALUE,
  fetchCategoryVarieties,
  fetchQualityImages,
  getCategoryLevelOptionsFromCatalog,
  getFullCategoryPath,
  getSelectedCategoryId,
  getSelectedCategoryPathNames,
  getTopCategoryOptionsFromCatalog,
  getVarietyOptionsFromCatalog,
  type CatalogFilterOption,
  type CategoryVarietyResponse,
  type QualityImageItem,
  type QualityImageQuery,
} from '@/data/qc'

interface ContentChipOption extends CatalogFilterOption {
  kind: 'top' | 'variety'
}

const statusBarHeight = ref(44)
const loading = ref(true)
const loadError = ref('')
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

const topCategoryOptions = computed(() => getTopCategoryOptionsFromCatalog(catalog.value.categories))
const topTabs = computed(() => topCategoryOptions.value.map(option => formatTopOption(option)))
const categoryLevelOptions = computed(() => {
  return getCategoryLevelOptionsFromCatalog(catalog.value.categories, selectedTop.value, selectedCategoryPath.value)
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
  const hasCategoryFilter = selectedCategoryPath.value.some(value => value && value !== ALL_VALUE)
  if (selectedTop.value === ALL_VALUE && !hasCategoryFilter) {
    return topCategoryOptions.value.map(option => ({
      ...formatTopOption(option),
      kind: 'top',
    }))
  }

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
  loading.value = true
  loadError.value = ''
  try {
    const [catalogResponse, imageResponse] = await Promise.all([
      fetchCategoryVarieties(),
      fetchQualityImages(),
    ])
    catalog.value = catalogResponse
    items.value = imageResponse.items
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载失败，请稍后重试'
  }
  finally {
    loading.value = false
  }
}

async function loadResults() {
  const requestId = ++queryRequestId
  loading.value = true
  loadError.value = ''
  try {
    const response = await fetchQualityImages(buildQueryParams())
    if (requestId === queryRequestId)
      items.value = response.items
  }
  catch (error) {
    if (requestId === queryRequestId)
      loadError.value = error instanceof Error ? error.message : '查询失败，请稍后重试'
  }
  finally {
    if (requestId === queryRequestId)
      loading.value = false
  }
}

function buildQueryParams(): QualityImageQuery {
  const query: QualityImageQuery = {}
  const categoryId = getSelectedCategoryId(catalog.value.categories, selectedTop.value, selectedCategoryPath.value)
  const categoryPathNames = getSelectedCategoryPathNames(catalog.value.categories, selectedTop.value, selectedCategoryPath.value)
  const selectedVarietyOption = varietyOptions.value.find(option => option.value === selectedVariety.value)

  if (categoryId) {
    query.categoryId = categoryId
    query.includeDescendants = true
  }
  else if (categoryPathNames.length > 0) {
    query.topCategory = categoryPathNames[0]
    if (categoryPathNames.length > 1)
      query.categoryPath = categoryPathNames.slice(1).join('/')
  }
  if (selectedVariety.value !== ALL_VALUE) {
    if (selectedVarietyOption?.varietyId)
      query.varietyId = selectedVarietyOption.varietyId
    else if (selectedVarietyOption?.varietyCode)
      query.varietyCode = selectedVarietyOption.varietyCode
    else
      query.varietyId = selectedVariety.value
  }
  if (appliedSearchQuery.value)
    query.keyword = appliedSearchQuery.value

  return query
}

function applySearch() {
  appliedSearchQuery.value = searchDraft.value.trim()
  loadResults()
}

function selectTop(value: string) {
  selectedTop.value = value
  selectedCategoryPath.value = []
  selectedVariety.value = ALL_VALUE
  categoryStep.value = 0
  loadResults()
}

function selectCategory(value: string) {
  const step = safeCategoryStep.value
  const next = selectedCategoryPath.value.slice(0, step)
  next[step] = value
  selectedCategoryPath.value = next
  selectedVariety.value = ALL_VALUE
  const nextLevels = getCategoryLevelOptionsFromCatalog(catalog.value.categories, selectedTop.value, next)
  if (value !== ALL_VALUE && step < nextLevels.length - 1)
    categoryStep.value = step + 1
  loadResults()
}

function goBackCategoryLevel() {
  if (categoryStep.value <= 0)
    return
  const nextStep = categoryStep.value - 1
  selectedCategoryPath.value = selectedCategoryPath.value.slice(0, nextStep)
  selectedVariety.value = ALL_VALUE
  categoryStep.value = nextStep
  loadResults()
}

function selectVariety(value: string) {
  selectedVariety.value = value
  loadResults()
}

function isContentChipActive(option: ContentChipOption) {
  return option.kind === 'top'
    ? option.value === selectedTop.value
    : option.value === selectedVariety.value
}

function selectContentChip(option: ContentChipOption) {
  if (option.kind === 'top') {
    selectTop(option.value)
    return
  }
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
    <view
      class="hero"
      :style="{ paddingTop: `${statusBarHeight}px` }"
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
          src="/static/images/qc/home_hero.svg"
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
            {{ option.label }}
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

          <view
            v-else
            class="image-grid"
          >
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

.hero {
  position: relative;
  height: 416rpx;
  box-sizing: border-box;
  overflow: hidden;
  padding-right: 50rpx;
  padding-left: 50rpx;
  background: linear-gradient(186deg, rgba(199, 247, 112, 0.5) 0%, #c7f770 93%);
}

.hero-main {
  position: relative;
  height: 226rpx;
  margin-top: 16rpx;
}

.brand-copy {
  position: absolute;
  z-index: 2;
  left: 22rpx;
  top: 66rpx;
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
  right: 18rpx;
  top: -18rpx;
  width: 344rpx;
  height: 244rpx;
}

.search-row {
  position: relative;
  z-index: 2;
  display: flex;
  width: 650rpx;
  height: 70rpx;
  align-items: center;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 0 6rpx 0 28rpx;
  border: 2rpx solid #92e616;
  border-radius: 20rpx;
  background: #fff;
}

.search-icon {
  position: relative;
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-right: 18rpx;
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
  min-height: calc(100vh - var(--window-bottom, 0px) - 416rpx);
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
  min-height: 1094rpx;
  background: #fff;
}

.category-side {
  width: 180rpx;
  min-height: 1094rpx;
  flex-shrink: 0;
  overflow: hidden;
  background: #fff url('/static/images/figma/home/side-menu-bg.svg') left top / 180rpx 1094rpx no-repeat;
}

.category-item {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100rpx;
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
  border-radius: 0;
}

.category-back {
  color: #777978;
  font-size: 24rpx;
}

.result-area {
  min-width: 0;
  flex: 1;
  background: #fff;
}

.product-filter-scroll {
  width: 100%;
  height: 100rpx;
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
  min-height: 640rpx;
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

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 42rpx 24rpx;
  padding: 17rpx 52rpx 44rpx 26rpx;
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
  margin: 0;
  padding: 0;
  border: 4rpx solid #fff;
  border-radius: 50%;
  background: #92e616;
  box-shadow: 0 8rpx 18rpx rgba(37, 38, 43, 0.2);
}

.fab-plus {
  color: #fff;
  font-size: 74rpx;
  font-weight: 300;
  line-height: 80rpx;
}

.search-button::after,
.retry-button::after,
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
