<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import { submitMyReport } from '@/data/reports'
import { uploadCommon, type CommonUploadResponse } from '@/utils/upload'

const categoryInfo = ref('')
const varietyInfo = ref('')
const categoryId = ref('')
const varietyId = ref('')
const selectedImagePath = ref('')
const uploadedImageUrl = ref('')
const description = ref('')
const submitting = ref(false)
const uploading = ref(false)
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
const previewImageUrl = computed(() => selectedImagePath.value || uploadedImageUrl.value)
const submitButtonText = computed(() => {
  if (!submitting.value)
    return '提交'
  return uploading.value ? '上传中' : '提交中'
})

onMounted(() => {
  initNavBar()
})

onLoad((options) => {
  if (!options)
    return
  categoryInfo.value = decodeQueryValue(options.category)
  varietyInfo.value = decodeQueryValue(options.variety)
  categoryId.value = decodeQueryValue(options.categoryId)
  varietyId.value = decodeQueryValue(options.varietyId)
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

function chooseReportImage() {
  if (submitting.value)
    return

  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (result) => {
      const path = getChosenImagePath(result)
      if (!path) {
        uni.showToast({ title: '未获取到图片文件', icon: 'none' })
        return
      }

      selectedImagePath.value = path
      uploadedImageUrl.value = ''
    },
    fail: (error) => {
      const message = String(error?.errMsg || '')
      if (!message.includes('cancel')) {
        uni.showToast({ title: '选择图片失败，请重试', icon: 'none' })
      }
    },
  })
}

async function submit() {
  if (submitting.value)
    return

  if (!previewImageUrl.value) {
    uni.showToast({ title: '请上传品检图', icon: 'none' })
    return
  }
  if (!description.value.trim()) {
    uni.showToast({ title: '请输入问题描述', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const reportImageUrl = await uploadSelectedImageIfNeeded()
    uni.showLoading({ title: '提交中...', mask: true })
    await submitMyReport({
      imageUrl: reportImageUrl,
      category: categoryInfo.value,
      variety: varietyInfo.value,
      categoryId: categoryId.value,
      varietyId: varietyId.value,
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
    uploading.value = false
    submitting.value = false
    uni.hideLoading()
  }
}

async function uploadSelectedImageIfNeeded() {
  if (uploadedImageUrl.value)
    return uploadedImageUrl.value

  if (!selectedImagePath.value)
    throw new Error('请上传品检图')

  uploading.value = true
  uni.showLoading({ title: '上传中...', mask: true })
  try {
    const response = await uploadCommon(selectedImagePath.value)
    const url = resolveUploadedImageUrl(response)
    if (!url)
      throw new Error('上传接口未返回图片地址')

    uploadedImageUrl.value = url
    return url
  }
  finally {
    uploading.value = false
    uni.hideLoading()
  }
}

function getChosenImagePath(result: unknown) {
  const data = result as { tempFilePaths?: unknown, tempFiles?: unknown }
  const paths = Array.isArray(data.tempFilePaths)
    ? data.tempFilePaths
    : data.tempFilePaths ? [data.tempFilePaths] : []
  const files = Array.isArray(data.tempFiles)
    ? data.tempFiles
    : data.tempFiles ? [data.tempFiles] : []
  const firstFile = files[0] as { path?: unknown, tempFilePath?: unknown } | undefined

  return toPathString(paths[0]) || toPathString(firstFile?.path) || toPathString(firstFile?.tempFilePath)
}

function toPathString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function resolveUploadedImageUrl(response: Partial<CommonUploadResponse> & { imgUrl?: string }) {
  return response.data?.fileUrl
    || response.fileUrl
    || response.url
    || response.imgUrl
    || response.fileName
    || response.newFileName
    || ''
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
        <text class="section-title">上传品检图</text>
        <view class="section-underline" />
      </view>

      <view
        class="upload-area"
        @click="chooseReportImage"
      >
        <image
          v-if="previewImageUrl"
          :src="previewImageUrl"
          class="linked-image"
          mode="scaleToFill"
        />
        <text v-else class="upload-placeholder">点击上传图片</text>
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
          {{ submitButtonText }}
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
  align-items: flex-start;
  gap: 8rpx;
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
  min-width: 0;
  color: #25262b;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 40rpx;
  word-break: break-all;
}

.modify-btn {
  flex: 0 0 107rpx;
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
  margin: 2rpx 0 0;
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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 370rpx;
  overflow: hidden;
  border-radius: 30rpx;
  background: #f7f7f7;
}

.upload-placeholder {
  position: relative;
  z-index: 1;
  color: #777978;
  font-size: 30rpx;
  font-weight: 500;
  line-height: 40rpx;
}

.linked-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
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
