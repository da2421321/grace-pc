<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

let timer: ReturnType<typeof setTimeout> | undefined

onMounted(() => {
  timer = setTimeout(() => {
    uni.switchTab({ url: '/pages/index' })
  }, 2000)
})

onUnmounted(() => {
  if (timer)
    clearTimeout(timer)
})

function goHome() {
  if (timer)
    clearTimeout(timer)
  uni.switchTab({ url: '/pages/index' })
}

function goReports() {
  if (timer)
    clearTimeout(timer)
  uni.redirectTo({ url: '/pages/report/list' })
}
</script>

<template>
  <view class="success-page">
    <view class="success-card">
      <view class="check-circle">
        ✓
      </view>
      <text class="success-title">
        提交成功
      </text>
      <text class="success-desc">
        上报已保存，可在“我的 - 我的上报记录”中查看处理状态。
      </text>
      <text class="redirect-text">
        2 秒后自动返回首页
      </text>
      <view class="success-actions">
        <button
          class="secondary-button"
          @click="goReports"
        >
          查看记录
        </button>
        <button
          class="primary-button"
          @click="goHome"
        >
          返回首页
        </button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.success-page {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
  background: linear-gradient(180deg, #2e8b57 0%, #6bc49a 18%, #bfead3 42%, #e8f5e9 58%, #f2fbf5 72%, #fff 100%);
}

.success-card {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.96);
  padding: 56rpx 36rpx 40rpx;
  box-shadow: 0 10rpx 38rpx rgba(0, 0, 0, 0.08);
  text-align: center;
}

.check-circle {
  display: flex;
  width: 120rpx;
  height: 120rpx;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #2e8b57;
  box-shadow: 0 8rpx 24rpx rgba(46, 139, 87, 0.35);
  color: #fff;
  font-size: 70rpx;
  line-height: 1;
}

.success-title {
  margin-top: 30rpx;
  color: #1a1f1c;
  font-size: 36rpx;
  font-weight: 800;
}

.success-desc {
  margin-top: 18rpx;
  color: #5c6d66;
  font-size: 26rpx;
  line-height: 1.65;
}

.redirect-text {
  margin-top: 24rpx;
  color: #8a9690;
  font-size: 24rpx;
}

.success-actions {
  display: flex;
  width: 100%;
  gap: 14rpx;
  margin-top: 34rpx;
}

.secondary-button,
.primary-button {
  flex: 1;
  height: 76rpx;
  margin: 0;
  border-radius: 18rpx;
  font-size: 27rpx;
  font-weight: 700;
  line-height: 76rpx;
}

.secondary-button {
  border: 1rpx solid #cfe9dc;
  background: #fff;
  color: #2e8b57;
}

.primary-button {
  background: #2e8b57;
  color: #fff;
}

.secondary-button::after,
.primary-button::after {
  border: 0;
}
</style>
