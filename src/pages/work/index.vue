<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  ALL_VALUE,
  buildReportCategoryPath,
  fetchQualityImages,
  getCategoryLevelOptions,
  getItemsAfterTop,
  getTopCategoryOptions,
  getVarietyOptions,
  type QualityImageItem,
} from '@/data/qc'
import { addMyReport } from '@/data/reports'

const items = ref<QualityImageItem[]>([])
const loading = ref(true)
const selectedTop = ref(ALL_VALUE)
const selectedCategoryPath = ref<string[]>([])
const selectedVariety = ref(ALL_VALUE)
const pickerExpanded = ref(true)
const imagePath = ref('')
const description = ref('')

const topCategoryOptions = computed(() => getTopCategoryOptions(items.value).filter(option => option.value !== ALL_VALUE))
const itemsAfterTop = computed(() => getItemsAfterTop(items.value, selectedTop.value))
const categoryLevelOptions = computed(() => getCategoryLevelOptions(itemsAfterTop.value, selectedCategoryPath.value))
const categoryLevelOptionsConcrete = computed(() => {
  return categoryLevelOptions.value.map(level => level.filter(option => option.value !== ALL_VALUE))
})
const subCategoriesComplete = computed(() => {
  if (categoryLevelOptionsConcrete.value.length === 0)
    return true
  return categoryLevelOptionsConcrete.value.every((_, index) => {
    const value = selectedCategoryPath.value[index]
    return Boolean(value && value !== ALL_VALUE)
  })
})
const varietyOptions = computed(() => {
  if (!subCategoriesComplete.value)
    return []
  return getVarietyOptions(itemsAfterTop.value, selectedCategoryPath.value).filter(option => option.value !== ALL_VALUE)
})
const selectedCategoryLabel = computed(() => {
  const category = buildReportCategoryPath(selectedTop.value, selectedCategoryPath.value)
  return category || '未选择品类'
})
const selectedVarietyLabel = computed(() => {
  if (selectedVariety.value === ALL_VALUE)
    return '未选择品种'
  return varietyOptions.value.find(option => option.value === selectedVariety.value)?.label ?? selectedVariety.value
})
const categoryAndVarietyReady = computed(() => {
  return selectedTop.value !== ALL_VALUE && subCategoriesComplete.value && selectedVariety.value !== ALL_VALUE
})
const canSubmit = computed(() => {
  return categoryAndVarietyReady.value && Boolean(imagePath.value) && Boolean(description.value.trim())
})

onShow(() => {
  if (items.value.length === 0)
    load()
})

async function load() {
  loading.value = true
  try {
    const response = await fetchQualityImages()
    items.value = response.items
  }
  finally {
    loading.value = false
  }
}

function selectTop(value: string) {
  selectedTop.value = value
  selectedCategoryPath.value = []
  selectedVariety.value = ALL_VALUE
  pickerExpanded.value = true
}

function selectCategory(levelIndex: number, value: string) {
  const next = selectedCategoryPath.value.slice(0, levelIndex)
  next[levelIndex] = value
  selectedCategoryPath.value = next
  selectedVariety.value = ALL_VALUE
  pickerExpanded.value = true
}

function selectVariety(value: string) {
  selectedVariety.value = value
  if (selectedTop.value !== ALL_VALUE && subCategoriesComplete.value)
    pickerExpanded.value = false
}

function expandPicker() {
  pickerExpanded.value = true
}

function collapsePicker() {
  if (categoryAndVarietyReady.value)
    pickerExpanded.value = false
}

function chooseImage() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      imagePath.value = res.tempFilePaths[0] || ''
    },
  })
}

function resetForm() {
  selectedTop.value = ALL_VALUE
  selectedCategoryPath.value = []
  selectedVariety.value = ALL_VALUE
  pickerExpanded.value = true
  imagePath.value = ''
  description.value = ''
}

function submit() {
  if (!categoryAndVarietyReady.value) {
    uni.showToast({ title: '请先选完品类和品种', icon: 'none' })
    return
  }
  if (!imagePath.value) {
    uni.showToast({ title: '请先选择上报图片', icon: 'none' })
    return
  }
  if (!description.value.trim()) {
    uni.showToast({ title: '请填写描述', icon: 'none' })
    return
  }

  addMyReport({
    category: selectedCategoryLabel.value,
    variety: selectedVarietyLabel.value,
    description: description.value,
    imagePath: imagePath.value,
  })
  resetForm()
  uni.navigateTo({ url: '/pages/report/success' })
}
</script>

<template>
  <view class="report-page">
    <view class="hero">
      <text class="hero-title">
        图片上报
      </text>
      <text class="hero-desc">
        选择品类、上传图片并描述问题，记录会同步出现在“我的上报记录”。
      </text>
    </view>

    <view
      v-if="loading"
      class="form-card loading"
    >
      正在加载品类...
    </view>

    <view
      v-else
      class="form-card"
    >
      <view
        v-if="categoryAndVarietyReady && !pickerExpanded"
        class="summary-row"
      >
        <view class="summary-text">
          <text class="summary-label">
            品类 · 品种
          </text>
          <text class="summary-value">
            {{ selectedCategoryLabel }} · {{ selectedVarietyLabel }}
          </text>
        </view>
        <button
          class="link-button"
          @click="expandPicker"
        >
          修改
        </button>
      </view>

      <view v-else>
        <view class="field-title">
          品类 <text class="required">*</text>
        </view>
        <view class="chip-list">
          <button
            v-for="option in topCategoryOptions"
            :key="option.value"
            :class="['choice-chip', option.value === selectedTop ? 'choice-chip-active' : '']"
            @click="selectTop(option.value)"
          >
            {{ option.label }}
          </button>
        </view>

        <view
          v-for="(levelOptions, levelIndex) in categoryLevelOptionsConcrete"
          :key="levelIndex"
          class="level-block"
        >
          <view
            v-if="levelIndex === 0 || selectedCategoryPath[levelIndex - 1]"
          >
            <view class="field-title">
              第 {{ levelIndex + 2 }} 级类目 <text class="required">*</text>
            </view>
            <view class="chip-list">
              <button
                v-for="option in levelOptions"
                :key="option.value"
                :class="['choice-chip', option.value === selectedCategoryPath[levelIndex] ? 'choice-chip-active' : '']"
                @click="selectCategory(levelIndex, option.value)"
              >
                {{ option.label }}
              </button>
            </view>
          </view>
        </view>

        <view class="level-block">
          <view class="field-title">
            品种 <text class="required">*</text>
          </view>
          <view
            v-if="!subCategoriesComplete"
            class="hint"
          >
            请先按顺序选完类目
          </view>
          <view
            v-else-if="varietyOptions.length === 0"
            class="hint"
          >
            暂无可选品种
          </view>
          <view
            v-else
            class="chip-list"
          >
            <button
              v-for="option in varietyOptions"
              :key="option.value"
              :class="['choice-chip', option.value === selectedVariety ? 'choice-chip-active' : '']"
              @click="selectVariety(option.value)"
            >
              {{ option.label }}
            </button>
          </view>
        </view>

        <view
          v-if="categoryAndVarietyReady"
          class="collapse-row"
        >
          <button
            class="link-button"
            @click="collapsePicker"
          >
            收起
          </button>
        </view>
      </view>

      <view
        v-if="categoryAndVarietyReady"
        class="upload-section"
      >
        <view class="field-title">
          上报图片 <text class="required">*</text>
        </view>
        <button
          class="upload-box"
          @click="chooseImage"
        >
          <image
            v-if="imagePath"
            class="upload-image"
            :src="imagePath"
            mode="aspectFill"
          />
          <text
            v-else
            class="upload-placeholder"
          >
            点击选择图片
          </text>
        </button>

        <view class="field-title">
          描述 <text class="required">*</text>
        </view>
        <textarea
          v-model="description"
          class="desc-input"
          :maxlength="300"
          placeholder="请描述问题或建议"
          placeholder-class="placeholder"
        />

        <view class="actions">
          <button
            class="secondary-button"
            @click="resetForm"
          >
            取消
          </button>
          <button
            :class="['primary-button', canSubmit ? '' : 'primary-button-disabled']"
            @click="submit"
          >
            提交
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.report-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 140rpx;
  background: linear-gradient(180deg, #2e8b57 0%, #6bc49a 18%, #bfead3 42%, #e8f5e9 58%, #f2fbf5 72%, #fff 100%);
  color: #25262b;
}

.hero {
  display: flex;
  flex-direction: column;
  padding: 18rpx 8rpx 26rpx;
  color: #fff;
}

.hero-title {
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.2;
}

.hero-desc {
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 25rpx;
  line-height: 1.5;
}

.form-card {
  border: 1rpx solid rgba(255, 255, 255, 0.78);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.96);
  padding: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.loading {
  padding: 80rpx 24rpx;
  color: #6b7a72;
  font-size: 26rpx;
  text-align: center;
}

.field-title {
  margin-bottom: 12rpx;
  color: #25262b;
  font-size: 25rpx;
  font-weight: 700;
}

.required {
  color: #c65d00;
}

.chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}

.choice-chip {
  min-height: 58rpx;
  margin: 0;
  padding: 0 18rpx;
  border: 1rpx solid #e7e9ee;
  border-radius: 999rpx;
  background: #fff;
  color: #6b7280;
  font-size: 24rpx;
  line-height: 58rpx;
}

.choice-chip-active {
  border-color: #2e8b57;
  background: #e8f5e9;
  color: #1b5e20;
  font-weight: 700;
}

.level-block {
  margin-top: 20rpx;
}

.hint {
  color: #b45309;
  font-size: 23rpx;
}

.summary-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  border: 1rpx solid #cfe9dc;
  border-radius: 16rpx;
  background: #fff;
  padding: 16rpx 18rpx;
}

.summary-text {
  min-width: 0;
  flex: 1;
}

.summary-label {
  display: block;
  color: #8a9690;
  font-size: 21rpx;
}

.summary-value {
  display: block;
  margin-top: 8rpx;
  color: #1a1f1c;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.45;
}

.link-button {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #2e8b57;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 44rpx;
}

.collapse-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 14rpx;
}

.upload-section {
  margin-top: 24rpx;
}

.upload-box {
  position: relative;
  display: flex;
  width: 100%;
  height: 410rpx;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: 0 0 24rpx;
  padding: 0;
  border: 2rpx dashed #cfe9dc;
  border-radius: 16rpx;
  background: #f8fcfa;
}

.upload-image {
  width: 100%;
  height: 100%;
}

.upload-placeholder {
  color: #2e8b57;
  font-size: 28rpx;
  font-weight: 600;
}

.desc-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 180rpx;
  border: 1rpx solid #e1e6e3;
  border-radius: 16rpx;
  background: #fff;
  padding: 18rpx;
  color: #25262b;
  font-size: 26rpx;
  line-height: 1.5;
}

.placeholder {
  color: #9ca3af;
}

.actions {
  display: flex;
  gap: 14rpx;
  margin-top: 28rpx;
}

.secondary-button,
.primary-button {
  flex: 1;
  height: 78rpx;
  margin: 0;
  border-radius: 18rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 78rpx;
}

.secondary-button {
  border: 1rpx solid #d7e6dc;
  background: #fff;
  color: #2e8b57;
}

.primary-button {
  background: #2e8b57;
  color: #fff;
}

.primary-button-disabled {
  opacity: 0.5;
}

.choice-chip::after,
.link-button::after,
.upload-box::after,
.secondary-button::after,
.primary-button::after {
  border: 0;
}
</style>
