<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const selectedCategory = ref('包包')
const selectedGrade = ref('环保材质')
const selectedType = ref('短靴')
const navBarHeight = ref(44)
const navMenuTop = ref(0)
const navMenuHeight = ref(44)

const categoryOptions = ['包包', '鞋靴', '服饰']
const gradeOptions = ['A级', '环保材质', '春夏']
const typeOptions = ['短靴']
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

function cancel() {
  uni.navigateBack()
}

function submit() {
  const url = `/pages/report/upload?category=${encodeURIComponent(selectedCategory.value)}&grade=${encodeURIComponent(selectedGrade.value)}&type=${encodeURIComponent(selectedType.value)}`

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

function selectCategory(value: string) {
  selectedCategory.value = value
}

function selectGrade(value: string) {
  selectedGrade.value = value
}

function selectType(value: string) {
  selectedType.value = value
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
      <view class="section">
        <view class="section-title-wrap">
          <text class="section-title">请选择品类</text>
          <view class="section-underline" />
        </view>
        <view class="tag-list">
          <button
            v-for="item in categoryOptions"
            :key="item"
            class="tag-item"
            :class="{ active: selectedCategory === item }"
            @click="selectCategory(item)"
          >
            {{ item }}
          </button>
        </view>
      </view>

      <view class="section">
        <view class="section-title-wrap">
          <text class="section-title">请选择品类</text>
          <view class="section-underline" />
        </view>
        <view class="tag-list">
          <button
            v-for="item in gradeOptions"
            :key="item"
            class="tag-item"
            :class="{ active: selectedGrade === item }"
            @click="selectGrade(item)"
          >
            {{ item }}
          </button>
        </view>
      </view>

      <view class="section">
        <view class="section-title-wrap">
          <text class="section-title">请选择品类</text>
          <view class="section-underline" />
        </view>
        <view class="tag-list">
          <button
            v-for="item in typeOptions"
            :key="item"
            class="tag-item"
            :class="{ active: selectedType === item }"
            @click="selectType(item)"
          >
            {{ item }}
          </button>
        </view>
      </view>
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
