<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import { submitMyReport } from '@/data/reports'

const categoryInfo = ref('')
const varietyInfo = ref('')
const imageId = ref('')
const imageUrl = ref('')
const description = ref('')
const submitting = ref(false)
const navBarHeight = ref(44)
const navMenuTop = ref(0)
const navMenuHeight = ref(44)
const navBarStyle = computed(() => ({
  height: `${navBarHeight.value}px`,
}))
const navRowStyle = computed(() => ({
  top: `${navMenuTop.value}px`,
  height: `${navMenuHeight.value}px`,
  lineHeight: `${navMenuHeight.value}px`,
}))
const displayCategoryInfo = computed(() => {
  return [categoryInfo.value, varietyInfo.value].filter(Boolean).join(' / ')
})

onMounted(() => {
  initNavBar()
})

onLoad((options) => {
  if (!options)
    return
  categoryInfo.value = decodeQueryValue(options.category)
  varietyInfo.value = decodeQueryValue(options.variety)
  imageId.value = decodeQueryValue(options.imageId)
  imageUrl.value = decodeQueryValue(options.imageUrl)
})

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

function modifyCategory() {
  uni.navigateBack()
}

function cancel() {
  uni.navigateBack({ delta: 2 })
}

async function submit() {
  if (submitting.value)
    return

  if (!imageId.value) {
    uni.showToast({ title: '缺少品检图信息，请重新选择', icon: 'none' })
    return
  }
  if (!description.value.trim()) {
    uni.showToast({ title: '请输入问题描述', icon: 'none' })
    return
  }

  submitting.value = true
  uni.showLoading({ title: '提交中...', mask: true })
  try {
    await submitMyReport({
      imageId: imageId.value,
      category: categoryInfo.value,
      variety: varietyInfo.value,
      imagePath: imageUrl.value,
      description: description.value,
    })
    uni.navigateTo({ url: '/pages/report/success' })
  }
  catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : '提交失败，请稍后重试',
      icon: 'none',
    })
  }
  finally {
    submitting.value = false
    uni.hideLoading()
  }
}

function decodeQueryValue(value: unknown) {
  if (typeof value !== 'string')
    return ''
  try {
    return decodeURIComponent(value)
  }
  catch {
    return value
  }
}
</script>

<template>
  <view class="report-upload-page">
    <view class="nav-bar" :style="navBarStyle">
      <view class="nav-row" :style="navRowStyle">
        <view class="nav-back" @click="goBack">
          <view class="back-icon" />
        </view>
        <text class="nav-title">图片上报</text>
      </view>
    </view>

    <view class="category-info">
      <text class="category-label">品类：</text>
      <text class="category-value">{{ displayCategoryInfo }}</text>
      <button class="modify-btn" @click="modifyCategory">
        修改
      </button>
    </view>

    <view class="upload-section">
      <view class="section-header">
        <text class="section-title">关联品检图</text>
        <view class="section-underline" />
      </view>

      <view
        class="upload-area"
      >
        <image
          v-if="imageUrl"
          :src="imageUrl"
          class="linked-image"
          mode="aspectFit"
        />
        <text v-else class="upload-placeholder">已选择品检图 {{ imageId }}</text>
      </view>
    </view>

    <view class="description-section">
      <view class="section-header">
        <text class="section-title">问题描述</text>
        <view class="section-underline" />
      </view>

      <view class="description-area">
        <textarea
          v-model="description"
          class="description-input"
          placeholder="输入并描述你的问题"
          :maxlength="500"
          :auto-height="false"
        />
      </view>
    </view>

    <view class="bottom-actions">
      <view class="action-divider" />
      <view class="action-buttons">
        <button class="action-btn cancel-btn" @click="cancel">
          取消
        </button>
        <button class="action-btn submit-btn" @click="submit">
          {{ submitting ? '提交中' : '提交' }}
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.report-upload-page {
  min-height: 100vh;
  background: #fff;
  padding-bottom: 130rpx;
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
  font-weight: 400;
  line-height: 1;
}

.category-info {
  display: flex;
  align-items: center;
  padding: 31rpx 50rpx;
}

.category-label {
  color: #25262b;
  font-size: 26rpx;
  font-weight: 500;
  line-height: 40rpx;
}

.category-value {
  flex: 1;
  color: #25262b;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 40rpx;
}

.modify-btn {
  width: 107rpx;
  height: 36rpx;
  border-radius: 18rpx;
  background: #92e616;
  color: #25262b;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 36rpx;
  text-align: center;
  border: none;
  margin: 0;
  padding: 0;
}

.modify-btn::after {
  border: none;
}

.upload-section {
  padding: 0 50rpx;
  margin-bottom: 103rpx;
}

.section-header {
  position: relative;
  display: inline-flex;
  align-items: flex-start;
  margin-bottom: 30rpx;
}

.section-title {
  position: relative;
  z-index: 1;
  color: #1f2328;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 40rpx;
}

.section-underline {
  position: absolute;
  left: 50%;
  bottom: -2rpx;
  width: 112rpx;
  height: 10rpx;
  border-radius: 999rpx;
  background: #88e100;
  transform: translateX(-50%);
  z-index: 0;
}

.upload-area {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 370rpx;
  border-radius: 30rpx;
  background: #f7f7f7;
}

.upload-placeholder {
  color: #777978;
  font-size: 30rpx;
  font-weight: 500;
  line-height: 40rpx;
}

.linked-image {
  width: 100%;
  height: 100%;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.image-item {
  width: 200rpx;
  height: 200rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background: #f7f7f7;
}

.image-preview {
  width: 100%;
  height: 100%;
}

.add-more {
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-icon {
  color: #777978;
  font-size: 60rpx;
  line-height: 1;
}

.description-section {
  padding: 0 50rpx;
}

.description-area {
  height: 163rpx;
  border-radius: 30rpx;
  background: #f7f7f7;
  padding: 24rpx;
}

.description-input {
  width: 100%;
  height: 100%;
  color: #25262b;
  font-size: 30rpx;
  line-height: 40rpx;
}

.description-input::placeholder {
  color: #777978;
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
  background: #ebeaef;
}

.action-buttons {
  display: flex;
  gap: 30rpx;
  padding: 15rpx 50rpx calc(15rpx + env(safe-area-inset-bottom));
}

.action-btn {
  height: 100rpx;
  border-radius: 30rpx;
  font-size: 30rpx;
  font-weight: 400;
  line-height: 100rpx;
  text-align: center;
  border: none;
  margin: 0;
}

.cancel-btn {
  width: 260rpx;
  background: #f7f7f7;
  color: #25262b;
}

.submit-btn {
  flex: 1;
  background: #25262b;
  color: #fff;
}

.action-btn::after {
  border: none;
}
</style>
