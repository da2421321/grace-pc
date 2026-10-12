<script setup lang="ts">
import type { QualityMessageItem, QualityMessageType } from '@/data/messages'
import { onLoad, onPullDownRefresh, onReachBottom } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import QualityMessageImageComparison from '@/components/quality-message-image-comparison.vue'
import { fetchQualityMessages, getQualityMessageIcon, getQualityMessageTargetUrl, isQualityMessageType, markQualityMessagesRead, QUALITY_MESSAGE_TYPES } from '@/data/messages'
import { refreshMessageTabRedDot } from '@/utils/message-tab'
import { getCustomNavigationStyle } from '@/utils/navigation'

const PAGE_SIZE = 20

const messages = ref<QualityMessageItem[]>([])
const loading = ref(false)
const loadingMore = ref(false)
const loadError = ref('')
const loadMoreError = ref('')
const currentPage = ref(1)
const hasMore = ref(false)
const messageType = ref<QualityMessageType>('image')
const messageTypeTitle = computed(() => QUALITY_MESSAGE_TYPES[messageType.value])

const pageStyle = ref<ReturnType<typeof getCustomNavigationStyle>>()

onLoad((query = {}) => {
  pageStyle.value = getCustomNavigationStyle()
  if (!isQualityMessageType(query.type)) {
    loadError.value = '未找到该消息类型'
    return
  }
  messageType.value = query.type
  void loadMessages(true)
})

onPullDownRefresh(async () => {
  await loadMessages(true)
  uni.stopPullDownRefresh()
})

onReachBottom(() => {
  void loadMore()
})

async function loadMessages(reset = false) {
  if (reset) {
    if (loading.value)
      return
    loading.value = true
    loadError.value = ''
    loadMoreError.value = ''
  }
  else if (loading.value || loadingMore.value || !hasMore.value) {
    return
  }
  else {
    loadingMore.value = true
    loadMoreError.value = ''
  }

  const pageNum = reset ? 1 : currentPage.value + 1
  try {
    const response = await fetchQualityMessages(pageNum, PAGE_SIZE, messageType.value)
    messages.value = reset ? response.items : [...messages.value, ...response.items]
    currentPage.value = response.pageNum
    hasMore.value = response.hasMore
    if (reset && response.items.some(item => item.unread)) {
      try {
        // Opening the type reads its existing history; later updates stay unread.
        await markQualityMessagesRead(messageType.value, response.items[0].id)
        messages.value = messages.value.map(item => ({ ...item, unread: false }))
      }
      catch {
        // Keep unread state when the read request fails so opening the type can retry.
      }
      void refreshMessageTabRedDot()
    }
  }
  catch (error) {
    const message = error instanceof Error ? error.message : '消息加载失败，请稍后重试'
    if (reset)
      loadError.value = message
    else
      loadMoreError.value = message
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

function loadMore() {
  return loadMessages(false)
}

function openMessage(item: QualityMessageItem) {
  const url = getQualityMessageTargetUrl(item)
  if (!url) {
    uni.showToast({ title: '该消息未关联品类详情', icon: 'none' })
    return
  }
  uni.navigateTo({
    url,
    fail: () => uni.showToast({ title: '详情打开失败，请稍后重试', icon: 'none' }),
  })
}

function formatMessageDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{2}):(\d{2})/)
  if (match) {
    const [, , month, day, hour, minute] = match
    return `${Number(month)}月${Number(day)}日  ${hour}:${minute}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return value
  return `${date.getMonth() + 1}月${date.getDate()}日  ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/message/index' })
}
</script>

<template>
  <view class="message-type-page" :style="pageStyle">
    <view class="message-type-top">
      <view class="message-type-status-bar" />
      <view class="message-type-nav">
        <image
          class="message-type-back"
          src="/static/images/figma/message/7fabdd9331227ca9dba59b3e264197d4e5b6d11b.svg"
          mode="aspectFit"
          @click="goBack"
        />
        <text class="message-type-nav-title">
          {{ messageTypeTitle }}
        </text>
      </view>
    </view>

    <view v-if="loading && !messages.length" class="message-type-state">
      <view class="message-type-loading" />
    </view>
    <view v-else-if="loadError && !messages.length" class="message-type-state">
      <text class="message-type-state-title">
        消息加载失败
      </text>
      <text class="message-type-state-desc">
        {{ loadError }}
      </text>
      <button class="message-type-retry" hover-class="none" @click="loadMessages(true)">
        重新加载
      </button>
    </view>
    <view v-else-if="!messages.length" class="message-type-state">
      <text class="message-type-state-title">
        暂无{{ messageTypeTitle }}消息
      </text>
      <text class="message-type-state-desc">
        近一个月没有可查看的消息
      </text>
    </view>
    <view v-else class="message-type-list">
      <view v-for="item in messages" :key="item.id" class="message-type-card" :class="{ 'message-type-card-image': item.messageType === 'image' }">
        <text class="message-type-date">
          {{ formatMessageDate(item.updateTime) }}
        </text>
        <view class="message-type-card-body">
          <view class="message-type-card-gradient" />
          <view class="message-type-card-footer" />
          <view class="message-type-heading">
            <image
              class="message-type-icon"
              :src="getQualityMessageIcon(messageType)"
              mode="aspectFit"
            />
            <text class="message-type-label">
              {{ messageTypeTitle }}
            </text>
          </view>
          <view class="message-type-preview">
            <text class="message-type-preview-copy">
              {{ item.content }}
            </text>
            <QualityMessageImageComparison
              v-if="item.messageType === 'image'"
              :before-image-urls="item.beforeImageUrls"
              :after-image-urls="item.afterImageUrls"
              :snapshot-available="item.imageChangeSnapshotAvailable"
            />
          </view>
          <button class="message-type-detail-button" hover-class="none" @click="openMessage(item)">
            查看详细
          </button>
        </view>
      </view>

      <view v-if="loadingMore" class="message-type-list-tip">
        <view class="message-type-list-loading" />
      </view>
      <button v-else-if="loadMoreError" class="message-type-list-tip message-type-list-retry" hover-class="none" @click="loadMore">
        加载失败，点击重试
      </button>
      <view v-else-if="!hasMore" class="message-type-list-tip">
        近一个月的消息已全部展示
      </view>
    </view>
  </view>
</template>

<style scoped>
.message-type-page {
  min-height: calc(100vh - var(--window-bottom, 0px));
  box-sizing: border-box;
  overflow-x: hidden;
  background: #fff;
  color: #25262b;
}

.message-type-top {
  height: calc(var(--status-bar-height, 44px) + var(--navigation-height, 44px));
  box-sizing: border-box;
  background: #fff;
}

.message-type-status-bar {
  height: var(--status-bar-height, 44px);
}

.message-type-nav {
  position: relative;
  display: flex;
  height: var(--navigation-height, 44px);
  align-items: center;
  justify-content: center;
}

.message-type-back {
  position: absolute;
  top: var(--navigation-center, 22px);
  left: 50rpx;
  width: 18rpx;
  height: 34rpx;
  transform: translateY(-50%);
}

.message-type-nav-title {
  position: absolute;
  top: var(--navigation-center, 22px);
  left: 102rpx;
  max-width: calc(100% - 102rpx - var(--navigation-right-inset, 110px));
  overflow: hidden;
  color: #1a2f4d;
  font-size: 36rpx;
  font-weight: 400;
  line-height: 50rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: translateY(-50%);
}

.message-type-list {
  display: flex;
  flex-direction: column;
  gap: 60rpx;
  padding: 25rpx 20rpx calc(40rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.message-type-card {
  position: relative;
  width: 710rpx;
  height: 354rpx;
  flex-shrink: 0;
}

.message-type-date {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  color: #777978;
  font-family: Arial, sans-serif;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 30rpx;
  text-align: center;
}

.message-type-card-body {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 291rpx;
  overflow: hidden;
  border-radius: 20rpx;
  background: #fff;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.1);
}

.message-type-card-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(176.7deg, rgba(199, 247, 112, 0.5) 43.4%, #fff 86.6%);
}

.message-type-card-footer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 89rpx;
  border-radius: 0 0 20rpx 20rpx;
  background: #fff;
}

.message-type-heading {
  position: absolute;
  top: 30rpx;
  left: 30rpx;
  display: flex;
  height: 60rpx;
  align-items: center;
}

.message-type-icon {
  width: 52rpx;
  height: 52rpx;
  flex-shrink: 0;
}

.message-type-label {
  margin-left: 10rpx;
  color: #25262b;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 36rpx;
}

.message-type-preview {
  position: absolute;
  top: 95rpx;
  right: 30rpx;
  left: 30rpx;
  display: flex;
  height: 88rpx;
  align-items: center;
  box-sizing: border-box;
  padding: 0 34rpx;
  border-radius: 10rpx;
  background: #fff;
}

.message-type-preview-copy {
  display: block;
  width: 100%;
  overflow: hidden;
  color: #777978;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 32rpx;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-type-detail-button {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 89rpx;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 0 0 20rpx 20rpx;
  background: transparent;
  color: #25262b;
  font-size: 30rpx;
  font-weight: 700;
  line-height: 89rpx;
  text-align: center;
}

.message-type-card-image {
  height: auto;
}

.message-type-card-image .message-type-date {
  position: static;
  display: block;
}

.message-type-card-image .message-type-card-body {
  position: relative;
  height: auto;
  margin-top: 33rpx;
}

.message-type-card-image .message-type-heading {
  position: relative;
  top: auto;
  left: auto;
  margin: 30rpx 30rpx 0;
}

.message-type-card-image .message-type-preview {
  position: relative;
  top: auto;
  right: auto;
  left: auto;
  height: auto;
  flex-direction: column;
  align-items: stretch;
  gap: 24rpx;
  margin: 16rpx 30rpx 24rpx;
  padding: 24rpx;
}

.message-type-card-image .message-type-preview-copy {
  white-space: pre-wrap;
  word-break: break-all;
}

.message-type-card-image .message-type-detail-button {
  position: relative;
}

.message-type-detail-button::after,
.message-type-retry::after,
.message-type-list-retry::after {
  border: 0;
}

.message-type-state {
  display: flex;
  min-height: 560rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
  text-align: center;
}

.message-type-state-title {
  color: #4b4d4c;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
}

.message-type-state-desc {
  margin-top: 10rpx;
  color: #a4a6a5;
  font-size: 24rpx;
  line-height: 36rpx;
}

.message-type-retry {
  width: 220rpx;
  height: 72rpx;
  margin: 28rpx 0 0;
  padding: 0;
  border: 0;
  border-radius: 22rpx;
  background: #25262b;
  color: #fff;
  font-size: 25rpx;
  line-height: 72rpx;
}

.message-type-loading,
.message-type-list-loading {
  box-sizing: border-box;
  border: 5rpx solid rgba(37, 38, 43, 0.14);
  border-top-color: #25262b;
  border-radius: 50%;
  animation: message-type-loading-spin 0.8s linear infinite;
}

.message-type-loading {
  width: 52rpx;
  height: 52rpx;
}

.message-type-list-loading {
  width: 32rpx;
  height: 32rpx;
  border-width: 4rpx;
}

.message-type-list-tip {
  display: flex;
  height: 74rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #a4a6a5;
  font-size: 22rpx;
  line-height: 74rpx;
}

.message-type-list-retry {
  width: 100%;
}

@keyframes message-type-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
