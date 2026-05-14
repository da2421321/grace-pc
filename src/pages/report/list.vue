<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  fetchMyReports,
  reportStatusLabel,
  type MyReportRecord,
  type ReportProcessStatus,
} from '@/data/reports'

type ReportTab = 'all' | ReportProcessStatus

const rows = ref<MyReportRecord[]>([])
const activeTab = ref<ReportTab>('all')
const navBarHeight = ref(44)
const navMenuTop = ref(0)
const navMenuHeight = ref(44)

const tabs: Array<{ key: ReportTab, label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '未处理' },
  { key: 'done', label: '已处理' },
]

const navBarStyle = computed(() => ({
  height: `${navBarHeight.value}px`,
}))

const navRowStyle = computed(() => ({
  top: `${navMenuTop.value}px`,
  height: `${navMenuHeight.value}px`,
  lineHeight: `${navMenuHeight.value}px`,
}))

const filteredRows = computed(() => {
  if (activeTab.value === 'all')
    return rows.value
  return rows.value.filter(item => item.status === activeTab.value)
})

onMounted(() => {
  initNavBar()
})

onShow(async () => {
  rows.value = await fetchMyReports()
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
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }

  uni.switchTab({ url: '/pages/mine/index' })
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/report/detail?id=${encodeURIComponent(id)}` })
}

function displaySubmittedAt(value: string) {
  return value.trim().replace(/\s+/, '  ')
}
</script>

<template>
  <view class="report-list-page">
    <view class="nav-bar" :style="navBarStyle">
      <view class="nav-row" :style="navRowStyle">
        <button class="nav-back" hover-class="none" @click="goBack">
          <view class="back-icon" />
        </button>
        <text class="nav-title">上报记录</text>
      </view>
    </view>

    <view class="tabs">
      <view class="tabs-inner">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          hover-class="none"
          @click="activeTab = tab.key"
        >
          <view v-if="activeTab === tab.key" class="tab-mark" />
          <text class="tab-label">{{ tab.label }}</text>
        </button>
      </view>
    </view>

    <view class="list">
      <button
        v-for="record in filteredRows"
        :key="record.id"
        class="card"
        hover-class="none"
        @click="goDetail(record.id)"
      >
        <text class="card-time">{{ displaySubmittedAt(record.submittedAt) }}</text>
        <text class="card-name">{{ record.variety }}</text>
        <text class="status" :class="record.status === 'pending' ? 'pending' : 'done'">
          {{ reportStatusLabel(record.status) }}
        </text>
      </button>
    </view>
  </view>
</template>

<style scoped>
.report-list-page {
  min-height: 100vh;
  box-sizing: border-box;
  overflow-x: hidden;
  background: #f7f7f7;
  color: #25262b;
}

.nav-bar {
  position: relative;
  z-index: 2;
  width: 100%;
  background: #fff;
}

.nav-row {
  position: absolute;
  left: 0;
  right: 220rpx;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.nav-back {
  display: flex;
  flex: 0 0 94rpx;
  align-items: center;
  justify-content: center;
  width: 94rpx;
  height: 100%;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  line-height: 1;
}

.back-icon {
  width: 24rpx;
  height: 24rpx;
  border-bottom: 4rpx solid #25262b;
  border-left: 4rpx solid #25262b;
  transform: rotate(45deg);
}

.nav-title {
  color: #1a2f4d;
  font-size: 36rpx;
  font-weight: 400;
  line-height: 50rpx;
  white-space: nowrap;
}

.tabs {
  position: relative;
  z-index: 1;
  height: 80rpx;
  background: #fff;
}

.tabs-inner {
  display: grid;
  grid-template-columns: 60rpx 90rpx 90rpx;
  column-gap: 105rpx;
  align-items: start;
  height: 100%;
  margin-left: 81rpx;
  padding-top: 18rpx;
  box-sizing: border-box;
}

.tab {
  position: relative;
  display: block;
  width: 100%;
  height: 52rpx;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: visible;
  background: transparent;
  line-height: 40rpx;
  text-align: left;
}

.tab-label {
  position: relative;
  z-index: 1;
  display: block;
  color: #777978;
  font-size: 30rpx;
  font-weight: 400;
  line-height: 40rpx;
  text-align: center;
  white-space: nowrap;
}

.tab.active .tab-label {
  color: #25262b;
  font-weight: 700;
}

.tab-mark {
  position: absolute;
  z-index: 0;
  top: 32rpx;
  left: 50%;
  width: 55rpx;
  height: 10rpx;
  background: #92e616;
  transform: translateX(-50%);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  box-sizing: border-box;
  padding: 20rpx 20rpx calc(32rpx + env(safe-area-inset-bottom));
}

.card {
  position: relative;
  display: block;
  width: 100%;
  height: 210rpx;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  border-radius: 30rpx;
  background: #fff;
  color: inherit;
  line-height: 1;
  text-align: left;
}

.card-time {
  position: absolute;
  top: 39rpx;
  left: 30rpx;
  color: #777978;
  font-family: Arial, sans-serif;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 40rpx;
  white-space: pre;
}

.card-name {
  position: absolute;
  top: 110rpx;
  right: 180rpx;
  left: 30rpx;
  overflow: hidden;
  color: #25262b;
  font-size: 30rpx;
  font-weight: 600;
  line-height: 40rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status {
  position: absolute;
  z-index: 2;
  top: 95rpx;
  right: 30rpx;
  width: 116rpx;
  height: 70rpx;
  box-sizing: border-box;
  border-radius: 30rpx;
  font-size: 26rpx;
  line-height: 70rpx;
  text-align: center;
  white-space: nowrap;
}

.status.pending {
  background: #92e616;
  color: #25262b;
  font-weight: 600;
}

.status.done {
  background: #f7f7f7;
  color: #777978;
  font-weight: 400;
}

.nav-back::after,
.tab::after,
.card::after {
  border: 0;
}
</style>
