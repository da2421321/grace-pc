<script setup lang="ts">
import { onHide, onShow } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref } from 'vue'

const navBarHeight = ref(44)
const navMenuTop = ref(0)
const navMenuHeight = ref(44)
const countdown = ref(2)

let timer: ReturnType<typeof setInterval> | undefined
let openingReports = false

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
  startCountdown()
})

onUnmounted(() => {
  clearReturnTimer()
})

onShow(() => {
  openingReports = false
})

onHide(() => {
  clearReturnTimer()
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
    return undefined
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

function clearReturnTimer() {
  if (!timer)
    return
  clearInterval(timer)
  timer = undefined
}

function startCountdown() {
  countdown.value = 2
  openingReports = false
  clearReturnTimer()
  timer = setInterval(() => {
    if (openingReports)
      return

    if (countdown.value <= 1) {
      goHome()
      return
    }

    countdown.value -= 1
  }, 1000)
}

function goHome() {
  if (openingReports)
    return

  clearReturnTimer()
  uni.switchTab({ url: '/pages/index' })
}

function goReports() {
  openingReports = true
  clearReturnTimer()
  uni.navigateTo({ url: '/pages/report/list' })
}
</script>

<template>
  <view class="success-page">
    <view class="nav-bar" :style="navBarStyle">
      <view class="nav-row" :style="navRowStyle">
        <view class="nav-back" @click="goHome">
          <view class="back-icon" />
        </view>
        <text class="nav-title">图片上报</text>
      </view>
    </view>

    <view class="success-content">
      <image
        class="success-check"
        src="/static/images/figma/report/success-check.svg"
        mode="aspectFit"
      />

      <view class="success-message">
        <text class="success-title">提交成功！上报已保存。</text>
        <view class="success-desc">
          <text>可在「</text>
          <text class="success-highlight" @click.stop="goReports">我的-我的上报记录</text>
          <text>」中查看。</text>
        </view>
        <text class="redirect-text">{{ countdown }}秒后自动返回首页...</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.success-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: #fff;
  color: #25262b;
  overflow-x: hidden;
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
  flex: 0 0 86rpx;
  width: 86rpx;
  height: 88rpx;
  margin-left: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  width: 24rpx;
  height: 24rpx;
  border-left: 4rpx solid #25262b;
  border-bottom: 4rpx solid #25262b;
  transform: rotate(45deg);
}

.nav-title {
  color: #1a2f4d;
  font-size: 36rpx;
  font-weight: 400;
  line-height: 50rpx;
}

.success-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 119rpx;
  text-align: center;
}

.success-check {
  width: 180rpx;
  height: 180rpx;
}

.success-message {
  margin-top: 52rpx;
}

.success-title {
  display: block;
  color: #25262b;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 50rpx;
  white-space: nowrap;
}

.success-desc {
  display: flex;
  height: 50rpx;
  align-items: center;
  justify-content: center;
  color: #25262b;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 50rpx;
  white-space: nowrap;
}

.success-highlight {
  display: inline-flex;
  height: 38rpx;
  align-items: center;
  background: rgba(146, 230, 22, 0.3);
  color: #25262b;
  line-height: 38rpx;
}

.redirect-text {
  display: block;
  margin-top: 40rpx;
  color: #777978;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 40rpx;
  white-space: nowrap;
}
</style>
