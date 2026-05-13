<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  ALL_VALUE,
  fetchCategories,
  fetchVarieties,
  findCategoryByValue,
  getCategoryLevelOptionsFromCatalog,
  getSelectedCategoryId,
  getSelectedCategoryPathNames,
  getTopCategoryOptionsFromCatalog,
  getVarietyOptionsFromCatalog,
  type CatalogFilterOption,
  type CategoryNode,
  type VarietyOption,
} from '@/data/qc'

const categories = ref<CategoryNode[]>([])
const varieties = ref<VarietyOption[]>([])
const selectedTop = ref(ALL_VALUE)
const selectedCategoryPath = ref<string[]>([])
const selectedVariety = ref(ALL_VALUE)
const loading = ref(true)
const loadError = ref('')
const navBarHeight = ref(44)
const navMenuTop = ref(0)
const navMenuHeight = ref(44)

const topCategoryOptions = computed(() => getTopCategoryOptionsFromCatalog(categories.value).filter(option => option.value !== ALL_VALUE))
const categoryLevelOptions = computed(() => {
  return getCategoryLevelOptionsFromCatalog(categories.value, selectedTop.value, selectedCategoryPath.value)
})
const categoryLevelOptionsConcrete = computed(() => {
  return categoryLevelOptions.value.map(level => level.filter(option => option.value !== ALL_VALUE))
})
const subCategoriesComplete = computed(() => {
  if (categoryLevelOptionsConcrete.value.length === 0)
    return selectedTop.value !== ALL_VALUE
  return categoryLevelOptionsConcrete.value.every((_, index) => {
    const value = selectedCategoryPath.value[index]
    return Boolean(value && value !== ALL_VALUE)
  })
})
const varietyOptions = computed(() => {
  if (!subCategoriesComplete.value)
    return []
  return getVarietyOptionsFromCatalog(varieties.value, selectedTop.value, selectedCategoryPath.value, categories.value)
    .filter(option => option.value !== ALL_VALUE)
})
const selectedCategoryId = computed(() => getSelectedCategoryId(categories.value, selectedTop.value, selectedCategoryPath.value))
const selectedCategoryLabel = computed(() => {
  return getSelectedCategoryPathNames(categories.value, selectedTop.value, selectedCategoryPath.value).join(' / ')
})
const selectedVarietyOption = computed(() => {
  return varietyOptions.value.find(option => option.value === selectedVariety.value)
})
const selectedVarietyLabel = computed(() => {
  if (selectedVariety.value === ALL_VALUE)
    return ''
  return selectedVarietyOption.value?.label ?? selectedVariety.value
})
const navBarStyle = computed(() => ({
  height: `${navBarHeight.value}px`,
}))
const navRowStyle = computed(() => ({
  top: `${navMenuTop.value}px`,
  height: `${navMenuHeight.value}px`,
  lineHeight: `${navMenuHeight.value}px`,
}))

onMounted(() => {
  initNavBar()
  loadOptions()
})

async function loadOptions() {
  loading.value = true
  loadError.value = ''
  try {
    const categoryResponse = await fetchCategories()
    categories.value = categoryResponse.items
    varieties.value = []
    await selectDefaultOptions()
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载品类失败，请稍后重试'
  }
  finally {
    loading.value = false
  }
}

function initNavBar() {
  try {
    const systemInfo = uni.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight || 0

    // #ifdef MP-WEIXIN
    const menuButton = uni.getMenuButtonBoundingClientRect()
    const navGap = Math.max(menuButton.top - statusBarHeight, 0)
    navMenuTop.value = menuButton.top
    navMenuHeight.value = menuButton.height
    navBarHeight.value = menuButton.bottom + navGap
    return
    // #endif

    navMenuTop.value = statusBarHeight
    navMenuHeight.value = 44
    navBarHeight.value = statusBarHeight + 44
  }
  catch {
    navMenuTop.value = 0
    navMenuHeight.value = 44
    navBarHeight.value = 44
  }
}

function goBack() {
  uni.navigateBack()
}

function cancel() {
  uni.navigateBack()
}

function submit() {
  if (!selectedCategoryLabel.value) {
    uni.showToast({ title: '请选择品类', icon: 'none' })
    return
  }

  if (!selectedVarietyOption.value) {
    uni.showToast({ title: '请选择品种', icon: 'none' })
    return
  }

  const query = [
    ['category', selectedCategoryLabel.value],
    ['variety', selectedVarietyLabel.value],
    ['categoryId', selectedCategoryId.value || ''],
    ['varietyId', selectedVarietyOption.value.varietyId || selectedVarietyOption.value.id || selectedVariety.value],
  ]
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')
  const url = `/pages/report/upload?${query}`

  uni.navigateTo({
    url,
    fail: (error) => {
      console.error('跳转上传页失败', error)
      uni.showToast({
        title: '跳转失败，请重试',
        icon: 'none',
      })
    },
  })
}

async function selectDefaultOptions() {
  const firstTop = topCategoryOptions.value[0]
  if (!firstTop)
    return
  selectedTop.value = firstTop.value
  await fillFirstSubCategories(0)
  await selectFirstVariety()
}

async function selectTopOption(value: string) {
  selectedTop.value = value
  selectedCategoryPath.value = []
  selectedVariety.value = ALL_VALUE
  await ensureCategoryChildren(value)
  await fillFirstSubCategories(0)
  await selectFirstVariety()
}

async function selectCategoryLevel(levelIndex: number, value: string) {
  const next = selectedCategoryPath.value.slice(0, levelIndex)
  next[levelIndex] = value
  selectedCategoryPath.value = next
  await ensureCategoryChildren(value)
  await fillFirstSubCategories(levelIndex + 1)
  await selectFirstVariety()
}

function selectVarietyOption(value: string) {
  selectedVariety.value = value
}

async function ensureCategoryChildren(value: string) {
  const node = findCategoryByValue(categories.value, value)
  if (!node?.id || !node.hasChildren || node.children.length > 0)
    return

  const response = await fetchCategories({ parentId: node.id })
  node.children = response.items
  categories.value = [...categories.value]
}

async function fillFirstSubCategories(startIndex: number) {
  const path = selectedCategoryPath.value.slice(0, startIndex)
  for (let guard = 0; guard < 12; guard++) {
    const current = path[path.length - 1] || selectedTop.value
    await ensureCategoryChildren(current)
    const levels = getCategoryLevelOptionsFromCatalog(categories.value, selectedTop.value, path)
    const options = levels[path.length]?.filter(option => option.value !== ALL_VALUE) ?? []
    if (options.length === 0)
      break
    path.push(options[0].value)
  }
  selectedCategoryPath.value = path
}

async function selectFirstVariety() {
  const categoryId = selectedCategoryId.value
  if (!categoryId) {
    varieties.value = []
    selectedVariety.value = ALL_VALUE
    return
  }

  const response = await fetchVarieties({ categoryId, pageNum: 1, pageSize: 100 })
  varieties.value = response.items
  const options = getVarietyOptionsFromCatalog(varieties.value, selectedTop.value, selectedCategoryPath.value, categories.value)
    .filter(option => option.value !== ALL_VALUE)
  selectedVariety.value = options[0]?.value ?? ALL_VALUE
}

function retryLoad() {
  loadOptions()
}

function getSectionTitle(levelIndex: number) {
  return levelIndex === 0 ? '请选择二级品类' : `请选择第 ${levelIndex + 2} 级品类`
}

function formatVarietyLabel(option: CatalogFilterOption) {
  return option.label.replace(/\s*\([^)]*\)\s*$/, '')
}
</script>

<template>
  <view class="report-create-page">
    <view class="nav-bar" :style="navBarStyle">
      <view class="nav-row" :style="navRowStyle">
        <view class="nav-back" @click="goBack">
          <view class="back-icon" />
        </view>
        <text class="nav-title">图片上报</text>
      </view>
    </view>

    <view class="content">
      <view v-if="loading" class="state-text">
        正在加载品类...
      </view>

      <view v-else-if="loadError" class="state-text">
        <text>{{ loadError }}</text>
        <button class="retry-btn" @click="retryLoad">
          重试
        </button>
      </view>

      <template v-else>
        <view class="section">
          <view class="section-title-wrap">
            <text class="section-title">请选择一级品类</text>
            <view class="section-underline" />
          </view>
          <view class="tag-list">
            <button
              v-for="item in topCategoryOptions"
              :key="item.value"
              class="tag-item"
              :class="{ active: selectedTop === item.value }"
              @click="selectTopOption(item.value)"
            >
              {{ item.label }}
            </button>
          </view>
        </view>

        <view
          v-for="(options, levelIndex) in categoryLevelOptionsConcrete"
          :key="levelIndex"
          class="section"
        >
          <view class="section-title-wrap">
            <text class="section-title">{{ getSectionTitle(levelIndex) }}</text>
            <view class="section-underline" />
          </view>
          <view class="tag-list">
            <button
              v-for="item in options"
              :key="item.value"
              class="tag-item"
              :class="{ active: selectedCategoryPath[levelIndex] === item.value }"
              @click="selectCategoryLevel(levelIndex, item.value)"
            >
              {{ item.label }}
            </button>
          </view>
        </view>

        <view class="section">
          <view class="section-title-wrap">
            <text class="section-title">请选择品种</text>
            <view class="section-underline" />
          </view>
          <view v-if="varietyOptions.length === 0" class="empty-text">
            暂无可选品种
          </view>
          <view v-else class="tag-list">
            <button
              v-for="item in varietyOptions"
              :key="item.value"
              class="tag-item"
              :class="{ active: selectedVariety === item.value }"
              @click="selectVarietyOption(item.value)"
            >
              {{ formatVarietyLabel(item) }}
            </button>
          </view>
        </view>
      </template>
    </view>

    <view class="bottom-actions">
      <view class="action-divider" />
      <view class="action-buttons">
        <button class="action-btn cancel-btn" @click="cancel">
          取消
        </button>
        <button class="action-btn submit-btn" @click="submit">
          提交
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.report-create-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: calc(134rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.nav-bar {
  position: relative;
  width: 100%;
  background: #fff;
}

.nav-row {
  position: absolute;
  left: 0;
  right: 220rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  box-sizing: border-box;
}

.nav-back {
  flex: 0 0 68rpx;
  margin-left: 12rpx;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  width: 22rpx;
  height: 22rpx;
  border-left: 4rpx solid #1f2328;
  border-bottom: 4rpx solid #1f2328;
  transform: rotate(45deg);
}

.nav-title {
  color: #1f2328;
  font-size: 34rpx;
  line-height: 1;
  font-weight: 400;
}

.content {
  padding: 56rpx 32rpx 0;
}

.section {
  margin-bottom: 42rpx;
}

.state-text,
.empty-text {
  color: #777978;
  font-size: 28rpx;
  line-height: 44rpx;
}

.state-text {
  display: flex;
  min-height: 360rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
}

.retry-btn {
  width: 180rpx;
  height: 70rpx;
  border-radius: 22rpx;
  background: #88e100;
  color: #1f2328;
  font-size: 28rpx;
  line-height: 70rpx;
  border: 0;
}

.section-title-wrap {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
}

.section-title {
  color: #1f2328;
  font-size: 32rpx;
  line-height: 40rpx;
  font-weight: 800;
  position: relative;
  z-index: 1;
}

.section-underline {
  position: absolute;
  left: 50%;
  bottom: -4rpx;
  width: 64rpx;
  height: 12rpx;
  background: #88e100;
  transform: translateX(-50%);
  overflow: hidden;
  z-index: 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  min-width: 102rpx;
  height: 70rpx;
  padding: 0 28rpx;
  border-radius: 22rpx;
  background: #f4f4f4;
  color: #7b7b7b;
  font-size: 26rpx;
  line-height: 70rpx;
  text-align: center;
  border: 0;
  margin: 0;
}

.tag-item.active {
  background: #88e100;
  color: #1f2328;
}

.tag-item::after,
.retry-btn::after,
.action-btn::after {
  border: 0;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  z-index: 10;
}

.action-divider {
  height: 2rpx;
  background: #f0f0f0;
}

.action-buttons {
  display: flex;
  gap: 24rpx;
  padding: 18rpx 26rpx calc(18rpx + env(safe-area-inset-bottom));
}

.action-btn {
  height: 100rpx;
  border-radius: 30rpx;
  font-size: 30rpx;
  line-height: 100rpx;
  text-align: center;
  border: 0;
  margin: 0;
}

.cancel-btn {
  width: 280rpx;
  background: #f5f5f5;
  color: #26272c;
}

.submit-btn {
  flex: 1;
  background: #26272c;
  color: #fff;
}
</style>
