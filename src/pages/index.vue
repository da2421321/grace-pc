<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  ALL_VALUE,
  fetchQualityImages,
  getCategoryLevelOptions,
  getFullCategoryPath,
  getItemsAfterTop,
  getTopCategoryOptions,
  getVarietyOptions,
  type FilterOption,
  type QualityImageItem,
  type QualityImageQuery,
} from '@/data/qc'

const statusBarHeight = ref(44)
const loading = ref(true)
const loadError = ref('')
const items = ref<QualityImageItem[]>([])
const catalogItems = ref<QualityImageItem[]>([])
const searchDraft = ref('')
const appliedSearchQuery = ref('')
const selectedTop = ref(ALL_VALUE)
const selectedCategoryPath = ref<string[]>([])
const selectedVariety = ref(ALL_VALUE)
const categoryStep = ref(0)
const detailItem = ref<QualityImageItem>()
let queryRequestId = 0

const topCategoryOptions = computed(() => getTopCategoryOptions(catalogItems.value))
const topTabs = computed(() => topCategoryOptions.value.map(option => formatTopOption(option)))
const itemsAfterTop = computed(() => getItemsAfterTop(catalogItems.value, selectedTop.value))
const categoryLevelOptions = computed(() => getCategoryLevelOptions(itemsAfterTop.value, selectedCategoryPath.value))
const safeCategoryStep = computed(() => Math.min(categoryStep.value, Math.max(0, categoryLevelOptions.value.length - 1)))
const currentLevelOptions = computed(() => categoryLevelOptions.value[safeCategoryStep.value] ?? [])
const categoryNavOptions = computed(() => currentLevelOptions.value.map(option => formatCategoryOption(option)))
const showLeftNav = computed(() => categoryNavOptions.value.length > 0)
const varietyOptions = computed(() => getVarietyOptions(itemsAfterTop.value, selectedCategoryPath.value))
const varietyChips = computed(() => varietyOptions.value.map(option => formatVarietyOption(option)))
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
    const response = await fetchQualityImages()
    catalogItems.value = response.items
    items.value = response.items
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
  const categoryPath = selectedCategoryPath.value
    .filter(value => value && value !== ALL_VALUE)
    .join('/')

  if (selectedTop.value !== ALL_VALUE)
    query.topCategory = selectedTop.value
  if (categoryPath)
    query.categoryPath = categoryPath
  if (selectedVariety.value !== ALL_VALUE)
    query.varietyCode = selectedVariety.value
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
  if (value !== ALL_VALUE && step < categoryLevelOptions.value.length - 1)
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

function openDetail(item: QualityImageItem) {
  detailItem.value = item
}

function closeDetail() {
  detailItem.value = undefined
}

function previewImage(item: QualityImageItem) {
  if (!item.imageUrl)
    return
  const imageUrl = item.imageUrl
  closeDetail()
  setTimeout(() => {
    uni.previewImage({
      urls: [imageUrl],
      current: imageUrl,
    })
  }, 80)
}

function goReport() {
  uni.navigateTo({ url: '/pages/report/create' })
}

function formatTopOption(option: FilterOption): FilterOption {
  return {
    ...option,
    label: option.value === ALL_VALUE ? '全部' : option.label,
  }
}

function formatCategoryOption(option: FilterOption): FilterOption {
  if (option.value === ALL_VALUE)
    return { ...option, label: '全部' }
  return {
    ...option,
    label: option.label === '环保材质' ? '环保材料' : option.label,
  }
}

function formatVarietyOption(option: FilterOption): FilterOption {
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
        >
        <button
          class="search-button"
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
            @click="selectCategory(option.value)"
          >
            {{ option.label }}
          </button>
        </scroll-view>

        <view class="result-area">
          <scroll-view
            class="variety-scroll"
            scroll-x
            :show-scrollbar="false"
          >
            <view class="variety-list">
              <button
                v-for="option in varietyChips"
                :key="option.value"
                :class="['variety-chip', option.value === selectedVariety ? 'variety-chip-active' : '']"
                @click="selectVariety(option.value)"
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
              @click="openDetail(item)"
            >
              <view :class="['image-wrap', `tone-${item.placeholderTone || 'green'}`]">
                <image
                  v-if="item.imageUrl"
                  class="sample-image"
                  :src="item.imageUrl"
                  mode="aspectFill"
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
                  {{ item.varietyName }}
                </text>
                <text class="card-meta">
                  {{ getFullCategoryPath(item) }}
                </text>
              </view>
            </button>
          </view>
        </view>
      </view>
    </view>

    <button
      class="report-fab"
      @click="goReport"
    >
      <text class="fab-plus">
        +
      </text>
    </button>

    <view
      v-if="detailItem"
      class="detail-mask"
      @click="closeDetail"
    >
      <view
        class="detail-panel"
        @click.stop
      >
        <button
          class="detail-close"
          @click="closeDetail"
        >
          ×
        </button>
        <view class="detail-image-box">
          <image
            class="detail-image"
            :src="detailItem.imageUrl"
            mode="aspectFit"
          />
        </view>
        <scroll-view
          class="detail-info"
          scroll-y
          :show-scrollbar="false"
        >
          <view class="detail-info-inner">
            <text class="detail-label">
              品类
            </text>
            <text class="detail-value">
              {{ getFullCategoryPath(detailItem) }}
            </text>
            <text class="detail-label mt">
              品种
            </text>
            <text class="detail-value">
              {{ detailItem.varietyName }} ({{ detailItem.varietyCode }})
            </text>
            <text class="detail-label mt">
              描述
            </text>
            <text class="detail-desc">
              {{ detailItem.description || '暂无描述' }}
            </text>
            <button
              class="preview-button"
              @click="previewImage(detailItem)"
            >
              预览图片
            </button>
          </view>
        </scroll-view>
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
  background: linear-gradient(180deg, #efffdf 0%, #f7fff0 280rpx, #fff 520rpx);
  color: #171a22;
}

.hero {
  box-sizing: border-box;
  padding-left: 36rpx;
  padding-right: 36rpx;
  padding-bottom: 22rpx;
  background:
    radial-gradient(circle at 78% 22%, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0) 30%),
    linear-gradient(152deg, #caff62 0%, #dfff8b 48%, #ecffd0 100%);
}

.hero-main {
  position: relative;
  height: 188rpx;
}

.brand-copy {
  position: absolute;
  z-index: 2;
  left: 16rpx;
  bottom: 10rpx;
}

.brand-title,
.brand-subtitle {
  display: block;
  color: #171a22;
}

.brand-title {
  font-size: 54rpx;
  font-weight: 900;
  letter-spacing: 4rpx;
  line-height: 58rpx;
}

.brand-subtitle {
  margin-top: 4rpx;
  font-size: 36rpx;
  font-weight: 500;
  line-height: 42rpx;
}

.hero-visual {
  position: absolute;
  right: -12rpx;
  top: -8rpx;
  width: 306rpx;
  height: 190rpx;
}

.search-row {
  display: flex;
  height: 62rpx;
  align-items: center;
  box-sizing: border-box;
  padding: 0 7rpx 0 26rpx;
  border: 2rpx solid #93dc10;
  border-radius: 16rpx;
  background: #fff;
}

.search-icon {
  position: relative;
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
  margin-right: 14rpx;
}

.search-icon::before {
  position: absolute;
  left: 0;
  top: 0;
  width: 18rpx;
  height: 18rpx;
  border: 3rpx solid #aab2c0;
  border-radius: 50%;
  content: '';
}

.search-icon::after {
  position: absolute;
  right: 2rpx;
  bottom: 4rpx;
  width: 12rpx;
  height: 3rpx;
  border-radius: 999rpx;
  background: #aab2c0;
  content: '';
  transform: rotate(45deg);
}

.search-input {
  min-width: 0;
  flex: 1;
  height: 58rpx;
  color: #171a22;
  font-size: 24rpx;
  line-height: 58rpx;
}

.placeholder {
  color: #969da8;
}

.search-button {
  flex-shrink: 0;
  width: 66rpx;
  height: 46rpx;
  margin: 0;
  padding: 0;
  border-radius: 12rpx;
  background: #bdff22;
  color: #161a1f;
  font-size: 22rpx;
  font-weight: 500;
  line-height: 46rpx;
}

.body-shell {
  min-height: calc(100vh - var(--window-bottom, 0px) - 320rpx);
  margin-top: 16rpx;
  overflow: hidden;
  border-radius: 20rpx 20rpx 0 0;
  background: #fff;
}

.top-tabs {
  width: 100%;
  height: 112rpx;
  white-space: nowrap;
  background: #fff;
}

.top-tabs-inner {
  display: inline-flex;
  gap: 50rpx;
  min-width: 100%;
  box-sizing: border-box;
  padding: 24rpx 68rpx 0;
}

.top-tab {
  position: relative;
  width: auto;
  height: 88rpx;
  margin: 0;
  padding: 0;
  border-radius: 0;
  background: transparent;
  color: #252932;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 72rpx;
  white-space: nowrap;
}

.top-tab-active {
  color: #171a22;
  font-weight: 500;
}

.top-tab-line {
  position: absolute;
  left: 50%;
  bottom: 0;
  display: none;
  width: 58rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: #74df12;
  transform: translateX(-50%);
}

.top-tab-active .top-tab-line {
  display: block;
}

.main-panel {
  display: flex;
  min-height: 760rpx;
  background: #fff;
}

.category-side {
  width: 188rpx;
  flex-shrink: 0;
  overflow: hidden;
  background: #f7f7f7;
}

.category-item {
  display: block;
  width: 100%;
  min-height: 96rpx;
  margin: 0;
  padding: 0 16rpx 0 66rpx;
  border-radius: 0;
  background: transparent;
  color: #171a22;
  font-size: 24rpx;
  font-weight: 400;
  line-height: 96rpx;
  text-align: left;
}

.category-item-active {
  width: calc(100% - 20rpx);
  margin-left: 20rpx;
  padding-left: 46rpx;
  border-radius: 16rpx 0 0 16rpx;
  background: #fff;
  font-weight: 500;
}

.category-back {
  color: #5d6570;
  font-size: 22rpx;
}

.result-area {
  min-width: 0;
  flex: 1;
  padding-top: 20rpx;
  background: #fff;
}

.variety-scroll {
  width: 100%;
  white-space: nowrap;
}

.variety-list {
  display: inline-flex;
  gap: 16rpx;
  box-sizing: border-box;
  min-width: 100%;
  padding: 0 20rpx 10rpx;
}

.variety-chip {
  min-width: 118rpx;
  height: 72rpx;
  margin: 0;
  padding: 0 28rpx;
  border-radius: 26rpx;
  background: #f8f8f8;
  color: #9a9ea7;
  font-size: 24rpx;
  font-weight: 400;
  line-height: 72rpx;
  white-space: nowrap;
}

.variety-chip-active {
  background: #282b33;
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
  color: #6f7780;
  font-size: 24rpx;
  background: #fff;
}

.loading-mark {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid #e4f8ca;
  border-top-color: #74df12;
  border-radius: 50%;
}

.state-panel-error {
  padding: 0 48rpx;
  text-align: center;
}

.state-title {
  color: #171a22;
  font-size: 30rpx;
  font-weight: 700;
}

.state-desc {
  color: #8c939d;
  font-size: 24rpx;
  line-height: 36rpx;
}

.retry-button {
  height: 58rpx;
  margin: 8rpx 0 0;
  padding: 0 30rpx;
  border-radius: 16rpx;
  background: #74df12;
  color: #171a22;
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
  color: #8c8f96;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 34rpx;
}

.empty-desc {
  margin-top: 4rpx;
  color: #8c8f96;
  font-size: 22rpx;
  line-height: 32rpx;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 12rpx 18rpx 32rpx;
}

.image-card {
  width: calc(50% - 8rpx);
  overflow: hidden;
  margin: 0;
  padding: 0;
  border: 1rpx solid #edf0f2;
  border-radius: 16rpx;
  background: #fff;
  text-align: left;
}

.image-wrap {
  position: relative;
  width: 100%;
  height: 168rpx;
  overflow: hidden;
  background: #f2f4f7;
}

.tone-green {
  background: linear-gradient(145deg, #e8f5e9, #caff62);
}

.tone-orange {
  background: linear-gradient(145deg, #fff1e6, #ffd3ad);
}

.tone-blue {
  background: linear-gradient(145deg, #eef6ff, #bfddff);
}

.sample-image {
  width: 100%;
  height: 100%;
}

.image-caption {
  position: absolute;
  left: 0;
  right: 0;
  top: 62rpx;
  color: #2e8b57;
  font-size: 28rpx;
  font-weight: 700;
  text-align: center;
}

.card-body {
  display: flex;
  min-height: 92rpx;
  flex-direction: column;
  justify-content: center;
  gap: 6rpx;
  padding: 10rpx 14rpx 12rpx;
}

.card-title {
  overflow: hidden;
  color: #171a22;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 32rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  overflow: hidden;
  color: #8d949e;
  font-size: 20rpx;
  line-height: 28rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-fab {
  position: fixed;
  z-index: 20;
  right: 60rpx;
  bottom: calc(44rpx + var(--window-bottom, 0px) + env(safe-area-inset-bottom));
  display: flex;
  width: 96rpx;
  height: 96rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 4rpx solid #fff;
  border-radius: 50%;
  background: #80e600;
  box-shadow: 0 6rpx 18rpx rgba(20, 30, 16, 0.2);
}

.fab-plus {
  color: #fff;
  font-size: 74rpx;
  font-weight: 300;
  line-height: 82rpx;
}

.search-button::after,
.retry-button::after,
.top-tab::after,
.category-item::after,
.variety-chip::after,
.image-card::after,
.report-fab::after,
.detail-close::after,
.preview-button::after {
  border: 0;
}

.detail-mask {
  position: fixed;
  z-index: 80;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.62);
}

.detail-panel {
  position: relative;
  display: flex;
  min-height: 0;
  width: 100%;
  height: 92vh;
  max-height: 92vh;
  flex-direction: column;
  overflow: hidden;
  border-radius: 28rpx 28rpx 0 0;
  background: #111;
  color: #fff;
}

.detail-close {
  position: absolute;
  z-index: 2;
  right: 18rpx;
  top: 18rpx;
  width: 58rpx;
  height: 58rpx;
  margin: 0;
  padding: 0;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 40rpx;
  line-height: 58rpx;
}

.detail-image-box {
  display: flex;
  height: 48vh;
  min-height: 260rpx;
  max-height: 620rpx;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 80rpx 16rpx 16rpx;
}

.detail-image {
  width: 100%;
  height: 100%;
}

.detail-info {
  min-height: 0;
  flex: 1;
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
}

.detail-info-inner {
  display: flex;
  flex-direction: column;
  padding: 22rpx 28rpx calc(40rpx + env(safe-area-inset-bottom));
}

.detail-label {
  color: rgba(255, 255, 255, 0.55);
  font-size: 20rpx;
}

.detail-label.mt {
  margin-top: 16rpx;
}

.detail-value,
.detail-desc {
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.92);
  font-size: 24rpx;
  line-height: 1.55;
}

.preview-button {
  flex-shrink: 0;
  height: 72rpx;
  margin: 24rpx 0 0;
  border-radius: 20rpx;
  background: #80e600;
  color: #171a22;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 72rpx;
}
</style>
