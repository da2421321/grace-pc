<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchMyReports, reportStatusLabel, type MyReportRecord } from '@/data/reports'

const rows = ref<MyReportRecord[]>([])
const activeTab = ref<'all' | 'pending' | 'done'>('all')

const tabs = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '未处理' },
  { key: 'done', label: '已处理' },
] as const

const filteredRows = computed(() => {
  if (activeTab.value === 'all')
    return rows.value
  return rows.value.filter(item => item.status === activeTab.value)
})

onShow(async () => {
  rows.value = await fetchMyReports()
})

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/report/detail?id=${encodeURIComponent(id)}` })
}
</script>

<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </view>
    </view>

    <view class="list">
      <button
        v-for="record in filteredRows"
        :key="record.id"
        class="card"
        @click="goDetail(record.id)"
      >
        <text class="time">{{ record.submittedAt }}</text>
        <view class="row">
          <text class="name">{{ record.variety }}</text>
          <text class="status" :class="record.status === 'pending' ? 'pending' : 'done'">
            {{ reportStatusLabel(record.status) }}
          </text>
        </view>
      </button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f7f7;
}

.tabs {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 68rpx;
  color: #858585;
  font-size: 30rpx;
  background: #fff;
}

.tab {
  position: relative;
  width: 184rpx;
  padding-bottom: 9rpx;
  text-align: left;
}

.tab.active {
  color: #1f2329;
  font-weight: 700;
}

.tab.active::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: 0;
  width: 44rpx;
  height: 7rpx;
  border-radius: 999rpx;
  background: #8ee600;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  padding: 20rpx 2rpx 28rpx;
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 44rpx;
  width: 100%;
  min-height: 218rpx;
  box-sizing: border-box;
  margin: 0;
  padding: 0 32rpx;
  background: #fff;
  border: 0;
  border-radius: 30rpx;
  color: inherit;
  line-height: 1;
  text-align: left;
}

.time {
  color: #767a80;
  font-size: 28rpx;
  line-height: 1;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.name {
  flex: 1;
  color: #252932;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1;
}

.status {
  width: 122rpx;
  height: 74rpx;
  padding: 0;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: 700;
  line-height: 74rpx;
  text-align: center;
}

.status.pending {
  background: #84e600;
  color: #141414;
}

.status.done {
  background: #f6f6f6;
  color: #8d8d8d;
  font-weight: 500;
}

button::after {
  border: 0;
}
</style>
