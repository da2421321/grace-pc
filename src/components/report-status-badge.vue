<script setup lang="ts">
import { computed } from 'vue'
import { reportStatusLabel, type ReportProcessStatus } from '@/data/reports'

const props = defineProps<{
  status: ReportProcessStatus
}>()

const badgeClass = computed(() => {
  return props.status === 'pending' ? 'status-pending' : 'status-done'
})
</script>

<template>
  <view :class="['status-badge', badgeClass]">
    {{ reportStatusLabel(status) }}
  </view>
</template>

<style scoped>
.status-badge {
  flex-shrink: 0;
  border-width: 2rpx;
  border-style: solid;
  border-radius: 10rpx;
  padding: 8rpx 16rpx;
  font-size: 24rpx;
  font-weight: 500;
  line-height: 1;
}

.status-pending {
  border-color: #f5a623;
  background: #fff8e8;
  color: #c77800;
}

.status-done {
  border-color: #2e8b57;
  background: #e8f5e9;
  color: #1b5e20;
}
</style>
