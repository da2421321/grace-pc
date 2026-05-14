<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  fetchMyReportById,
  reportStatusLabel,
  type MyReportRecord,
  type ReportProcessStatus,
} from '@/data/reports'

const report = ref<MyReportRecord>()
const navBarHeight = ref(44)
const navMenuTop = ref(0)
const navMenuHeight = ref(44)

const navBarStyle = computed(() => ({
  height: `${navBarHeight.value}px`,
}))

const navBackStyle = computed(() => ({
  top: `${navMenuTop.value}px`,
}))

onMounted(() => {
  initNavBar()
})

onLoad(async (query = {}) => {
  const id = typeof query.id === 'string' ? decodeURIComponent(query.id) : ''
  report.value = id ? await fetchMyReportById(id) : undefined
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

function getReportImage(record: MyReportRecord) {
  return record.imagePath || '/static/images/figma/detail/bag.png'
}

function formatCategoryValue(value: string) {
  return value.trim().replace(/\s*\/\s*/g, '/') || '未分类'
}

function statusClass(status: ReportProcessStatus) {
  return status === 'pending' ? 'pending' : 'done'
}
</script>

<template>
  <view class="report-detail-page">
    <view class="report-hero">
      <image
        class="report-hero-bg"
        src="/static/images/figma/detail/report-detail-bg.svg"
        mode="scaleToFill"
      />
      <view
        class="report-top"
        :style="navBarStyle"
      >
        <button
          class="nav-back"
          :style="navBackStyle"
          hover-class="none"
          @click="goBack"
        >
          <view class="back-icon" />
        </button>
      </view>

      <template v-if="report">
        <view class="report-product-scene">
          <image
            class="report-product-shadow"
            src="/static/images/figma/detail/product-shadow.svg"
            mode="aspectFill"
          />
          <image
            class="report-product-image"
            :src="getReportImage(report)"
            mode="aspectFill"
          />
        </view>

        <view :class="['report-status-pill', statusClass(report.status)]">
          {{ reportStatusLabel(report.status) }}
        </view>
      </template>
    </view>

    <view
      v-if="!report"
      class="not-found"
    >
      <text class="not-found-title">
        未找到该上报记录
      </text>
      <button
        class="not-found-button"
        hover-class="none"
        @click="goBack"
      >
        返回列表
      </button>
    </view>

    <view
      v-else
      class="report-sheet"
    >
      <view class="report-field-row report-submit-row">
        <view class="field-label-wrap">
          <view class="field-label-mark" />
          <text class="field-label">提交用户</text>
        </view>
        <view class="submitter-value">
          <text class="field-value">{{ report.submitter }}</text>
          <text class="submitted-time">{{ report.submittedAt }}</text>
        </view>
      </view>

      <view class="report-field-row">
        <view class="field-label-wrap">
          <view class="field-label-mark" />
          <text class="field-label">品类</text>
        </view>
        <text class="field-value">
          {{ formatCategoryValue(report.category) }}
        </text>
      </view>

      <view class="report-field-row">
        <view class="field-label-wrap">
          <view class="field-label-mark" />
          <text class="field-label">品种</text>
        </view>
        <text class="field-value field-value-small">
          {{ report.variety }}
        </text>
      </view>

      <view class="report-field-row report-desc-row">
        <view class="field-label-wrap">
          <view class="field-label-mark" />
          <text class="field-label">描述</text>
        </view>
        <text class="field-value desc-value">
          {{ report.description || '暂无描述' }}
        </text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.report-detail-page {
  min-height: 100vh;
  overflow-x: hidden;
  background: #fff;
  color: #25262b;
}

.report-hero {
  position: relative;
  height: 865rpx;
  overflow: hidden;
  background: #ebe8e3;
}

.report-hero-bg {
  position: absolute;
  z-index: 0;
  left: 0;
  top: 0;
  width: 100%;
  height: 900rpx;
}

.report-top {
  position: relative;
  z-index: 3;
  width: 100%;
  box-sizing: border-box;
}

.nav-back {
  position: absolute;
  left: 28rpx;
  display: flex;
  width: 60rpx;
  height: 60rpx;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 20rpx;
  background: rgba(37, 38, 43, 0.5);
  line-height: 1;
}

.back-icon {
  width: 22rpx;
  height: 22rpx;
  border-bottom: 4rpx solid #fff;
  border-left: 4rpx solid #fff;
  transform: translateX(4rpx) rotate(45deg);
}

.report-product-scene {
  position: absolute;
  z-index: 1;
  left: 45rpx;
  top: 115rpx;
  width: 660rpx;
  height: 660rpx;
}

.report-product-image {
  position: absolute;
  z-index: 2;
  left: 0;
  top: 0;
  width: 660rpx;
  height: 660rpx;
}

.report-product-shadow {
  position: absolute;
  z-index: 1;
  left: 124rpx;
  top: 486rpx;
  width: 408rpx;
  height: 97rpx;
}

.report-status-pill {
  position: absolute;
  z-index: 4;
  right: 50rpx;
  bottom: 33rpx;
  width: 116rpx;
  height: 70rpx;
  border-radius: 30rpx;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 70rpx;
  text-align: center;
  white-space: nowrap;
}

.report-status-pill.pending {
  background: #92e616;
  color: #25262b;
}

.report-status-pill.done {
  background: #f7f7f7;
  color: #777978;
}

.report-sheet {
  position: relative;
  z-index: 2;
  min-height: 760rpx;
  margin-top: -1rpx;
  box-sizing: border-box;
  padding: 25rpx 50rpx calc(48rpx + env(safe-area-inset-bottom));
  border-radius: 40rpx 40rpx 0 0;
  background: #fff;
}

.report-field-row {
  display: grid;
  grid-template-columns: 152rpx minmax(0, 1fr);
  align-items: center;
  min-height: 130rpx;
  border-bottom: 1rpx solid rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

.report-submit-row {
  min-height: 130rpx;
  align-items: start;
  padding-top: 45rpx;
}

.report-desc-row {
  align-items: start;
  padding-top: 45rpx;
}

.field-label-wrap {
  position: relative;
  display: inline-block;
  justify-self: start;
  height: 40rpx;
  white-space: nowrap;
}

.field-label-mark {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 5rpx;
  height: 10rpx;
  background: #92e616;
}

.field-label {
  position: relative;
  z-index: 1;
  color: #25262b;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 40rpx;
}

.field-value {
  color: #25262b;
  font-size: 28rpx;
  font-weight: 400;
  line-height: 40rpx;
}

.field-value-small {
  font-size: 26rpx;
}

.submitter-value {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.submitted-time {
  margin-top: 8rpx;
  color: #b6b6b4;
  font-family: Arial, sans-serif;
  font-size: 28rpx;
  font-weight: 400;
  line-height: 40rpx;
}

.desc-value {
  display: block;
  white-space: normal;
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

.nav-back::after,
.not-found-button::after {
  border: 0;
}
</style>
