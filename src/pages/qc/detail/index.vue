<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchQualityImageDetail, getFullCategoryPath, type QualityImageItem } from '@/data/qc'

const detailItem = ref<QualityImageItem>()
const navBarHeight = ref(44)
const navMenuTop = ref(0)
const navMenuHeight = ref(44)
const loading = ref(true)

const navBarStyle = computed(() => ({
  height: `${navBarHeight.value}px`,
}))

const navBackStyle = computed(() => ({
  top: `${navMenuTop.value}px`,
  height: `${navMenuHeight.value}px`,
}))

onMounted(() => {
  initNavBar()
})

onLoad(async (query = {}) => {
  initNavBar()

  const id = typeof query.id === 'string' ? decodeURIComponent(query.id) : ''
  if (!id) {
    loading.value = false
    return
  }

  try {
    detailItem.value = await fetchQualityImageDetail(id)
  }
  finally {
    loading.value = false
  }
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

function getDetailImageUrl(item: QualityImageItem) {
  return item.imageUrl || '/static/images/figma/detail/bag.png'
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
</script>

<template>
  <view class="detail-page">
    <view class="detail-hero">
      <image
        class="detail-hero-bg"
        src="/static/images/figma/detail/image-detail-bg.svg"
        mode="scaleToFill"
      />
      <view class="detail-top" :style="navBarStyle">
        <button class="detail-back" :style="navBackStyle" hover-class="none" @click="goBack">
          <view class="detail-back-icon" />
        </button>
      </view>

      <template v-if="detailItem">
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
      </template>
    </view>

    <view v-if="detailItem" class="detail-sheet">
      <view class="detail-field-row">
        <view class="detail-label-wrap">
          <view class="detail-label-inner">
            <view class="detail-label-mark" />
            <text class="detail-label">品类</text>
          </view>
        </view>
        <text class="detail-value">
          {{ getCondensedCategoryPath(detailItem) }}
        </text>
      </view>

      <view class="detail-field-row">
        <view class="detail-label-wrap">
          <view class="detail-label-inner">
            <view class="detail-label-mark" />
            <text class="detail-label">品种</text>
          </view>
        </view>
        <text class="detail-value detail-value-small">
          {{ getDetailVarietyLabel(detailItem) }}
        </text>
      </view>

      <view class="detail-field-row detail-desc-row">
        <view class="detail-label-wrap">
          <view class="detail-label-inner">
            <view class="detail-label-mark" />
            <text class="detail-label">描述</text>
          </view>
        </view>
        <text class="detail-value detail-desc">
          {{ detailItem.description || getFullCategoryPath(detailItem) }}
        </text>
      </view>
    </view>

    <view v-else-if="!loading" class="not-found">
      <text class="not-found-title">
        未找到该品类详情
      </text>
      <button class="not-found-button" hover-class="none" @click="goBack">
        返回
      </button>
    </view>

    <view v-if="detailItem" class="detail-bottom-bar">
      <button class="detail-save-button" hover-class="none" @click="saveDetailImage(detailItem)">
        <image
          class="detail-save-icon"
          src="/static/images/figma/detail/download.svg"
          mode="aspectFit"
        />
        <text>保存图片</text>
      </button>
    </view>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #fff;
  color: #25262b;
}

.detail-hero {
  position: relative;
  height: 960rpx;
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
  width: 100%;
}

.detail-back {
  position: absolute;
  left: 28rpx;
  display: flex;
  width: 60rpx;
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
  transform: translateX(4rpx) rotate(45deg);
}

.detail-product-scene {
  position: absolute;
  z-index: 1;
  left: 45rpx;
  top: 215rpx;
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
  margin-top: -40rpx;
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
  width: 152rpx;
  flex-shrink: 0;
  height: 40rpx;
}

.detail-label-inner {
  position: relative;
  display: inline-flex;
  height: 40rpx;
  align-items: center;
}

.detail-label-mark {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 5rpx;
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

.not-found {
  display: flex;
  min-height: 520rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28rpx;
  background: #fff;
  text-align: center;
}

.not-found-title {
  color: #777978;
  font-size: 28rpx;
  line-height: 40rpx;
}

.not-found-button {
  width: 260rpx;
  height: 80rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 24rpx;
  background: #25262b;
  color: #fff;
  font-size: 28rpx;
  line-height: 80rpx;
}

.detail-back::after,
.detail-save-button::after,
.not-found-button::after {
  border: 0;
}
</style>
