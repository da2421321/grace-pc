<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import ReportStatusBadge from '@/components/report-status-badge.vue'
import { fetchMyReportById, type MyReportRecord } from '@/data/reports'

const report = ref<MyReportRecord>()

onLoad(async (query = {}) => {
  const id = typeof query.id === 'string' ? decodeURIComponent(query.id) : ''
  report.value = id ? await fetchMyReportById(id) : undefined
})

function goBack() {
  uni.navigateBack()
}
</script>

<template>
  <view class="detail-page">
    <view
      v-if="!report"
      class="not-found"
    >
      <text class="not-found-title">
        未找到该上报记录
      </text>
      <button
        class="primary-button"
        @click="goBack"
      >
        返回列表
      </button>
    </view>

    <template v-else>
      <view class="status-card">
        <text class="status-label">
          处理状态
        </text>
        <ReportStatusBadge :status="report.status" />
      </view>

      <view class="image-card">
        <image
          v-if="report.imagePath"
          class="report-image"
          :src="report.imagePath"
          mode="aspectFill"
        />
        <view
          v-else
          class="image-placeholder"
        >
          {{ report.imageCaption }}
        </view>
        <view class="fields">
          <view class="field-row">
            <text class="field-label">提交用户</text>
            <text class="field-value">{{ report.submitter }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">提交时间</text>
            <text class="field-value">{{ report.submittedAt }}</text>
          </view>
          <view class="field-row">
            <text class="field-label">品类</text>
            <text class="field-value">{{ report.category }}</text>
          </view>
          <view class="field-row no-border">
            <text class="field-label">品种</text>
            <text class="field-value">{{ report.variety }}</text>
          </view>
        </view>
      </view>

      <view class="desc-card">
        <text class="field-label">
          描述
        </text>
        <text class="desc-text">
          {{ report.description }}
        </text>
      </view>
    </template>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  padding: 24rpx 20rpx 60rpx;
  background: linear-gradient(180deg, #2e8b57 0%, #6bc49a 14%, #d4efe3 40%, #f2faf6 65%, #fff 100%);
}

.not-found {
  display: flex;
  min-height: 760rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.not-found-title {
  color: #666;
  font-size: 28rpx;
}

.primary-button {
  height: 72rpx;
  margin: 32rpx 0 0;
  padding: 0 44rpx;
  border-radius: 16rpx;
  background: #2e8b57;
  color: #fff;
  font-size: 26rpx;
  line-height: 72rpx;
}

.status-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
  border-radius: 18rpx;
  background: #fff;
  padding: 22rpx 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.status-label {
  color: #5c6d66;
  font-size: 26rpx;
}

.image-card,
.desc-card {
  overflow: hidden;
  border-radius: 18rpx;
  background: #fff;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.report-image,
.image-placeholder {
  width: 100%;
  height: 520rpx;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #ffb88c 0%, #ff8a65 42%, #ff7043 100%);
  color: #fff;
  font-size: 34rpx;
  font-weight: 800;
}

.fields {
  padding: 26rpx 24rpx 8rpx;
}

.field-row {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  border-bottom: 1rpx solid #eef2f0;
  padding: 0 0 22rpx;
  margin-bottom: 22rpx;
}

.no-border {
  border-bottom: 0;
}

.field-label {
  color: #8a9690;
  font-size: 22rpx;
}

.field-value {
  color: #1a221e;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.45;
}

.desc-card {
  margin-top: 16rpx;
  padding: 24rpx;
}

.desc-text {
  display: block;
  margin-top: 14rpx;
  border-radius: 14rpx;
  background: #f4faf6;
  padding: 18rpx 20rpx;
  color: #2a322e;
  font-size: 26rpx;
  line-height: 1.65;
}

.primary-button::after {
  border: 0;
}
</style>
