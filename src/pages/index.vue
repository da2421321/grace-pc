<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  ALL_VALUE,
  buildSearchHaystack,
  fetchQualityImages,
  fuzzyMatch,
  getCategoryLevelOptions,
  getFullCategoryPath,
  getItemsAfterTop,
  getTopCategoryOptions,
  getVarietyOptions,
  type QualityImageItem,
} from '@/data/qc'

const statusBarHeight = ref(44)
const loading = ref(true)
const loadError = ref('')
const items = ref<QualityImageItem[]>([])
const searchDraft = ref('')
const appliedSearchQuery = ref('')
const selectedTop = ref(ALL_VALUE)
const selectedCategoryPath = ref<string[]>([])
const selectedVariety = ref(ALL_VALUE)
const categoryStep = ref(0)
const detailItem = ref<QualityImageItem>()

const topCategoryOptions = computed(() => getTopCategoryOptions(items.value))
const itemsAfterTop = computed(() => getItemsAfterTop(items.value, selectedTop.value))
const categoryLevelOptions = computed(() => getCategoryLevelOptions(itemsAfterTop.value, selectedCategoryPath.value))
const safeCategoryStep = computed(() => Math.min(categoryStep.value, Math.max(0, categoryLevelOptions.value.length - 1)))
const currentLevelOptions = computed(() => categoryLevelOptions.value[safeCategoryStep.value] ?? [])
const showLeftNav = computed(() => currentLevelOptions.value.length > 0)
const varietyOptions = computed(() => getVarietyOptions(itemsAfterTop.value, selectedCategoryPath.value))

const filteredItems = computed(() => {
  return items.value.filter((item) => {
    if (selectedTop.value !== ALL_VALUE && (item.topCategory || item.categoryPath[0]) !== selectedTop.value)
      return false

    const categoryPrefix = selectedCategoryPath.value.filter(value => value !== ALL_VALUE)
    for (let index = 0; index < categoryPrefix.length; index++) {
      if (item.categoryPath[index + 1] !== categoryPrefix[index])
        return false
    }

    if (selectedVariety.value !== ALL_VALUE && item.varietyCode !== selectedVariety.value)
      return false

    return fuzzyMatch(buildSearchHaystack(item), appliedSearchQuery.value)
  })
})

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
    items.value = response.items
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载失败，请稍后重试'
  }
  finally {
    loading.value = false
  }
}

function applySearch() {
  appliedSearchQuery.value = searchDraft.value.trim()
}

function selectTop(value: string) {
  selectedTop.value = value
  selectedCategoryPath.value = []
  selectedVariety.value = ALL_VALUE
  categoryStep.value = 0
}

function selectCategory(value: string) {
  const step = safeCategoryStep.value
  const next = selectedCategoryPath.value.slice(0, step)
  next[step] = value
  selectedCategoryPath.value = next
  selectedVariety.value = ALL_VALUE
  if (value !== ALL_VALUE && step < categoryLevelOptions.value.length - 1)
    categoryStep.value = step + 1
}

function goBackCategoryLevel() {
  if (categoryStep.value <= 0)
    return
  const nextStep = categoryStep.value - 1
  selectedCategoryPath.value = selectedCategoryPath.value.slice(0, nextStep)
  selectedVariety.value = ALL_VALUE
  categoryStep.value = nextStep
}

function selectVariety(value: string) {
  selectedVariety.value = value
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
  uni.previewImage({
    urls: [item.imageUrl],
    current: item.imageUrl,
  })
}

function goReport() {
  uni.switchTab({ url: '/pages/work/index' })
}
</script>

<template>
  <view class="home-page">
    <view
      class="home-header"
      :style="{ paddingTop: `${statusBarHeight}px` }"
    >
      <view class="header-row">
        <view>
          <text class="brand-title">
            品检图例
          </text>
          <text class="brand-subtitle">
            Quality Samples
          </text>
        </view>
        <view class="wechat-pill">
          <text class="dot-text">
            ···
          </text>
          <view class="pill-divider" />
          <text class="circle-text">
            ○
          </text>
        </view>
      </view>
    </view>

    <view class="content-shell">
      <view class="search-row">
        <input
          v-model="searchDraft"
          class="search-input"
          confirm-type="search"
          placeholder="搜索品种 / 品类"
          placeholder-class="placeholder"
          @confirm="applySearch"
        >
        <button
          class="search-button"
          @click="applySearch"
        >
          查询
        </button>
      </view>

      <scroll-view
        class="top-tabs"
        scroll-x
        :show-scrollbar="false"
      >
        <view class="top-tabs-inner">
          <button
            v-for="option in topCategoryOptions"
            :key="option.value"
            :class="['top-tab', option.value === selectedTop ? 'top-tab-active' : '']"
            @click="selectTop(option.value)"
          >
            {{ option.label }}
          </button>
        </view>
      </scroll-view>

      <view
        v-if="loading"
        class="state-box"
      >
        <view class="loading-dot" />
        <text>正在加载品质图片...</text>
      </view>

      <view
        v-else-if="loadError"
        class="state-box white-state"
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
          <view class="category-title">
            <button
              v-if="safeCategoryStep > 0"
              class="category-back"
              @click="goBackCategoryLevel"
            >
              ‹ 返回上一级
            </button>
            <text>第 {{ safeCategoryStep + 2 }} 级类目</text>
          </view>
          <button
            v-for="option in currentLevelOptions"
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
          <view class="variety-title">
            品种
          </view>
          <view class="variety-list">
            <button
              v-for="option in varietyOptions"
              :key="option.value"
              :class="['variety-chip', option.value === selectedVariety ? 'variety-chip-active' : '']"
              @click="selectVariety(option.value)"
            >
              {{ option.label }}
            </button>
          </view>

          <view
            v-if="filteredItems.length === 0"
            class="empty-card"
          >
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
                <text
                  v-if="item.description"
                  class="card-desc"
                >
                  {{ item.description }}
                </text>
                <text class="card-title">
                  {{ item.varietyName }} ({{ item.varietyCode }})
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
        <view class="detail-info">
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
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-page {
  position: relative;
  min-height: 100vh;
  overflow-x: hidden;
  background: linear-gradient(180deg, #2e8b57 0%, #6bc49a 20%, #bfead3 45%, #e8f5e9 70%, #f2fbf5 100%);
  color: #25262b;
}

.home-header {
  padding-left: 32rpx;
  padding-right: 32rpx;
  padding-bottom: 24rpx;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 96rpx;
}

.brand-title,
.brand-subtitle {
  display: block;
  color: #fff;
}

.brand-title {
  font-size: 36rpx;
  font-weight: 700;
  line-height: 42rpx;
  letter-spacing: 4rpx;
}

.brand-subtitle {
  margin-top: 4rpx;
  font-size: 24rpx;
  opacity: 0.8;
}

.wechat-pill {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 174rpx;
  height: 64rpx;
  border: 1rpx solid rgba(151, 151, 151, 0.2);
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.5);
}

.dot-text,
.circle-text {
  width: 78rpx;
  text-align: center;
  color: #111;
  font-size: 30rpx;
  line-height: 64rpx;
}

.pill-divider {
  width: 1rpx;
  height: 36rpx;
  background: rgba(0, 0, 0, 0.2);
}

.content-shell {
  margin: 0 24rpx;
  padding: 20rpx 18rpx 150rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.66);
}

.search-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.search-input {
  box-sizing: border-box;
  flex: 1;
  height: 66rpx;
  border-radius: 18rpx;
  background: #f5f7fa;
  padding: 0 18rpx;
  color: #25262b;
  font-size: 26rpx;
}

.placeholder {
  color: #99a1ad;
}

.search-button {
  flex-shrink: 0;
  height: 66rpx;
  margin: 0;
  padding: 0 12rpx;
  border: 0;
  background: transparent;
  color: #2e8b57;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 66rpx;
}

.search-button::after,
.retry-button::after,
.top-tab::after,
.category-back::after,
.category-item::after,
.variety-chip::after,
.image-card::after,
.report-fab::after,
.detail-close::after,
.preview-button::after {
  border: 0;
}

.top-tabs {
  width: 100%;
  margin-top: 16rpx;
  white-space: nowrap;
}

.top-tabs-inner {
  display: inline-flex;
  gap: 10rpx;
  padding-bottom: 4rpx;
}

.top-tab {
  height: 56rpx;
  margin: 0;
  padding: 0 22rpx;
  border-radius: 999rpx;
  background: #eef1f5;
  color: #4b5563;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 56rpx;
  white-space: nowrap;
}

.top-tab-active {
  background: #2f343d;
  color: #fff;
}

.state-box {
  display: flex;
  min-height: 760rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  color: #1b5e20;
  font-size: 28rpx;
}

.white-state {
  min-height: 420rpx;
  margin-top: 24rpx;
  border: 1rpx solid #e8eaee;
  border-radius: 24rpx;
  background: #fff;
  color: #25262b;
}

.loading-dot {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #2e8b57, #1b5e20);
  box-shadow: 0 12rpx 30rpx rgba(46, 139, 87, 0.25);
}

.state-title {
  font-size: 30rpx;
  font-weight: 700;
}

.state-desc {
  color: #6b7280;
  font-size: 24rpx;
}

.retry-button {
  height: 60rpx;
  margin: 10rpx 0 0;
  padding: 0 28rpx;
  border-radius: 16rpx;
  background: #2e8b57;
  color: #fff;
  font-size: 24rpx;
  line-height: 60rpx;
}

.main-panel {
  display: flex;
  min-height: 780rpx;
  gap: 12rpx;
  margin-top: 16rpx;
}

.category-side {
  width: 212rpx;
  max-height: 820rpx;
  flex-shrink: 0;
  overflow: hidden;
  border: 1rpx solid #e8eaee;
  border-radius: 14rpx;
  background: #fff;
}

.category-title {
  padding: 12rpx 10rpx 10rpx;
  border-bottom: 1rpx solid #eef0f4;
  color: #25262b;
  font-size: 22rpx;
  font-weight: 700;
}

.category-back {
  display: block;
  height: 38rpx;
  margin: 0 0 4rpx;
  padding: 0;
  background: transparent;
  color: #2e8b57;
  font-size: 22rpx;
  line-height: 38rpx;
  text-align: left;
}

.category-item {
  display: block;
  width: calc(100% - 16rpx);
  margin: 10rpx 8rpx 0;
  padding: 14rpx 8rpx 14rpx 12rpx;
  border-left: 4rpx solid transparent;
  border-radius: 10rpx;
  background: transparent;
  color: #4b5563;
  font-size: 24rpx;
  line-height: 1.25;
  text-align: left;
}

.category-item-active {
  border-left-color: #2e8b57;
  background: #e8f5e9;
  color: #1b5e20;
  font-weight: 700;
}

.result-area {
  min-width: 0;
  flex: 1;
}

.variety-title {
  margin-bottom: 8rpx;
  color: #6b7280;
  font-size: 22rpx;
  font-weight: 600;
}

.variety-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.variety-chip {
  min-height: 50rpx;
  margin: 0;
  padding: 0 14rpx;
  border: 1rpx solid #e7e9ee;
  border-radius: 999rpx;
  background: #fff;
  color: #6b7280;
  font-size: 22rpx;
  line-height: 50rpx;
}

.variety-chip-active {
  border-color: #2e8b57;
  background: #e8f5e9;
  color: #1b5e20;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 18rpx;
  padding: 36rpx 18rpx;
  border: 1rpx solid #e8eaee;
  border-radius: 20rpx;
  background: #fff;
  text-align: center;
}

.empty-title {
  color: #25262b;
  font-size: 28rpx;
  font-weight: 700;
}

.empty-desc {
  margin-top: 12rpx;
  color: #6b7280;
  font-size: 24rpx;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
  margin-left: -6rpx;
  margin-right: -6rpx;
}

.image-card {
  width: calc(50% - 12rpx);
  overflow: hidden;
  margin: 0 6rpx 12rpx;
  padding: 0;
  border: 1rpx solid #e8eaee;
  border-radius: 18rpx;
  background: #fff;
  text-align: left;
}

.image-wrap {
  position: relative;
  width: 100%;
  height: 180rpx;
  overflow: hidden;
  background: #f2f4f7;
}

.tone-green {
  background: linear-gradient(145deg, #e8f5e9, #bfead3);
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
  top: 72rpx;
  color: #2e8b57;
  font-size: 28rpx;
  font-weight: 700;
  text-align: center;
}

.card-body {
  display: flex;
  min-height: 138rpx;
  flex-direction: column;
  gap: 6rpx;
  padding: 10rpx 12rpx 12rpx;
}

.card-desc {
  display: -webkit-box;
  overflow: hidden;
  color: #3d6b58;
  font-size: 19rpx;
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-title {
  overflow: hidden;
  color: #1a2332;
  font-size: 20rpx;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-meta {
  overflow: hidden;
  color: #7b8794;
  font-size: 20rpx;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-fab {
  position: fixed;
  z-index: 20;
  right: 28rpx;
  bottom: calc(130rpx + env(safe-area-inset-bottom));
  display: flex;
  width: 100rpx;
  height: 100rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border-radius: 50%;
  background: #2e8b57;
  box-shadow: 0 8rpx 28rpx rgba(46, 139, 87, 0.45);
}

.fab-plus {
  color: #fff;
  font-size: 64rpx;
  font-weight: 300;
  line-height: 1;
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
  width: 100%;
  max-height: 92vh;
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
  height: 620rpx;
  align-items: center;
  justify-content: center;
  padding: 80rpx 16rpx 16rpx;
}

.detail-image {
  width: 100%;
  height: 100%;
}

.detail-info {
  display: flex;
  max-height: 420rpx;
  flex-direction: column;
  overflow-y: auto;
  padding: 22rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid rgba(255, 255, 255, 0.1);
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
  height: 72rpx;
  margin: 24rpx 0 0;
  border-radius: 20rpx;
  background: #2e8b57;
  color: #fff;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 72rpx;
}
</style>
