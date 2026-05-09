<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import ReportStatusBadge from '@/components/report-status-badge.vue'
import { fetchMyReports, type MyReportRecord } from '@/data/reports'

const rows = ref<MyReportRecord[]>([])

onShow(async () => {
  rows.value = await fetchMyReports()
})

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/report/detail?id=${encodeURIComponent(id)}` })
}
</script>

<template>
  <view class="list-page">
    <view class="page-head">
      <text class="page-title">
        我的上报记录
      </text>
      <text class="page-desc">
        共 {{ rows.length }} 条记录，点击查看详情
      </text>
    </view>

    <view class="record-list">
      <button
        v-for="record in rows"
        :key="record.id"
        class="record-card"
        @click="goDetail(record.id)"
      >
        <view class="record-main">
          <text class="record-title">
            {{ record.variety }}
          </text>
          <text class="record-time">
            {{ record.submittedAt }}
          </text>
        </view>
        <ReportStatusBadge :status="record.status" />
      </button>
    </view>
  </view>
</template>

<style scoped>
.list-page {
  min-height: 100vh;
  padding: 24rpx 24rpx 60rpx;
  background: linear-gradient(180deg, #2e8b57 0%, #6bc49a 18%, #bfead3 42%, #e8f5e9 58%, #f2fbf5 72%, #fff 100%);
}

.page-head {
  display: flex;
  flex-direction: column;
  padding: 12rpx 6rpx 20rpx;
}

.page-title {
  color: #fff;
  font-size: 38rpx;
  font-weight: 800;
}

.page-desc {
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 24rpx;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.record-card {
  display: flex;
  width: 100%;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18rpx;
  margin: 0;
  padding: 24rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.8);
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 6rpx 24rpx rgba(0, 0, 0, 0.06);
  text-align: left;
}

.record-main {
  min-width: 0;
  flex: 1;
}

.record-title {
  display: block;
  overflow: hidden;
  color: #1a1f1c;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-time {
  display: block;
  margin-top: 12rpx;
  color: #6b7a72;
  font-size: 24rpx;
}

.record-card::after {
  border: 0;
}
</style>
