<script setup lang="ts">
import type { QualityMessageItem } from '@/data/messages'
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import QualityMessageImageComparison from '@/components/quality-message-image-comparison.vue'
import { fetchQualityMessageDetail } from '@/data/messages'
import { getCustomNavigationStyle } from '@/utils/navigation'

const message = ref<QualityMessageItem>()
const loading = ref(true)
const loadError = ref('')

const pageStyle = ref<ReturnType<typeof getCustomNavigationStyle>>()

const messageTitle = computed(() => {
  if (!message.value)
    return ''
  if (message.value.title)
    return message.value.title
  const action = message.value.messageType === 'image'
    ? '图片已变更'
    : message.value.messageType === 'description' ? '描述已变更' : '状态已变更'
  const product = message.value.subjectName || getProductLabel(message.value)
  return product ? `“${product}”${action}` : action
})

const messageContent = computed(() => {
  if (!message.value)
    return ''
  const content = message.value.content.trim()
  if (content)
    return content

  const context: string[] = []
  const category = message.value.categoryPath.join(' / ')
  const product = getProductLabel(message.value)
  if (category)
    context.push(`品类：${category}`)
  if (product)
    context.push(`品种：${product}`)
  if (message.value.imageCount > 0)
    context.push(`当前参考图：${message.value.imageCount} 张`)
  return context.join('\n') || '内容已变更'
})

onLoad((query = {}) => {
  pageStyle.value = getCustomNavigationStyle()

  const id = typeof query.id === 'string' ? decodeURIComponent(query.id) : ''
  void loadMessage(id)
})

async function loadMessage(id: string) {
  loading.value = true
  loadError.value = ''

  if (id) {
    try {
      const stored = uni.getStorageSync(`quality-message-detail:v3:${id}`) as QualityMessageItem | undefined
      if (stored && typeof stored === 'object' && stored.id === id && stored.messageType
        && Array.isArray(stored.beforeImageUrls) && Array.isArray(stored.afterImageUrls)
        && typeof stored.imageChangeSnapshotAvailable === 'boolean') {
        message.value = stored
        loading.value = false
        return
      }
    }
    catch {
      // Fall through to the API recovery path.
    }
  }

  if (!id) {
    loadError.value = '消息参数缺失'
    loading.value = false
    return
  }

  try {
    message.value = await fetchQualityMessageDetail(id)
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : '消息加载失败，请稍后重试'
  }
  finally {
    loading.value = false
  }
}

function getProductLabel(item: QualityMessageItem) {
  if (!item.varietyName && !item.varietyCode)
    return ''
  if (!item.varietyCode)
    return item.varietyName
  if (!item.varietyName)
    return item.varietyCode
  return `${item.varietyName}（${item.varietyCode}）`
}

function formatMessageDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]+(\d{2}):(\d{2})/)
  if (match) {
    const [, year, month, day, hour, minute] = match
    return `${year}年${Number(month)}月${Number(day)}日  ${hour.padStart(2, '0')}:${minute}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return value
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日  ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
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
  <view class="message-detail-page" :style="pageStyle">
    <view class="message-detail-top">
      <view class="message-detail-status-bar" />
      <view class="message-detail-nav">
        <image
          class="message-detail-back"
          src="/static/images/figma/message/7fabdd9331227ca9dba59b3e264197d4e5b6d11b.svg"
          mode="aspectFit"
          @click="goBack"
        />
        <text class="message-detail-nav-title">
          最新更新
        </text>
      </view>
    </view>

    <view v-if="loading" class="message-detail-state">
      <view class="message-detail-loading" />
    </view>
    <view v-else-if="!message" class="message-detail-state">
      <text class="message-detail-state-title">
        {{ loadError || '未找到该消息' }}
      </text>
      <button class="message-detail-back-button" hover-class="none" @click="goBack">
        返回消息列表
      </button>
    </view>
    <view v-else class="message-detail-content">
      <text class="message-detail-date">
        {{ formatMessageDate(message.updateTime) }}
      </text>
      <text class="message-detail-title">
        {{ messageTitle }}
      </text>
      <text class="message-detail-copy">
        {{ messageContent }}
      </text>
      <view v-if="message.messageType === 'image'" class="message-detail-images">
        <QualityMessageImageComparison
          :before-image-urls="message.beforeImageUrls"
          :after-image-urls="message.afterImageUrls"
          :snapshot-available="message.imageChangeSnapshotAvailable"
        />
      </view>
    </view>
  </view>
</template>

<style scoped>
.message-detail-page {
  min-height: calc(100vh - var(--window-bottom, 0px));
  box-sizing: border-box;
  overflow-x: hidden;
  background: #fff;
  color: #25262b;
}

.message-detail-top {
  height: calc(var(--status-bar-height, 44px) + var(--navigation-height, 44px));
  box-sizing: border-box;
  background: #fff;
}

.message-detail-status-bar {
  height: var(--status-bar-height, 44px);
}

.message-detail-nav {
  position: relative;
  display: flex;
  height: var(--navigation-height, 44px);
  align-items: center;
  justify-content: center;
}

.message-detail-back {
  position: absolute;
  top: var(--navigation-center, 22px);
  left: 50rpx;
  width: 18rpx;
  height: 34rpx;
  transform: translateY(-50%);
}

.message-detail-nav-title {
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

.message-detail-content {
  box-sizing: border-box;
  padding: 45rpx 50rpx calc(60rpx + env(safe-area-inset-bottom));
}

.message-detail-date {
  display: block;
  color: #777978;
  font-family: Arial, sans-serif;
  font-size: 26rpx;
  font-weight: 400;
  line-height: 26rpx;
}

.message-detail-title {
  display: block;
  margin-top: 31rpx;
  color: #25262b;
  font-size: 50rpx;
  font-weight: 700;
  line-height: 70rpx;
  white-space: normal;
  word-break: break-all;
}

.message-detail-copy {
  display: block;
  margin-top: 51rpx;
  color: #25262b;
  font-size: 28rpx;
  font-weight: 400;
  line-height: 56rpx;
  white-space: pre-wrap;
  word-break: break-all;
}

.message-detail-images {
  margin-top: 32rpx;
}

.message-detail-state {
  display: flex;
  min-height: 560rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
  text-align: center;
}

.message-detail-state-title {
  color: #777978;
  font-size: 28rpx;
  line-height: 40rpx;
}

.message-detail-back-button {
  width: 240rpx;
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

.message-detail-back-button::after {
  border: 0;
}

.message-detail-loading {
  width: 52rpx;
  height: 52rpx;
  box-sizing: border-box;
  border: 5rpx solid rgba(37, 38, 43, 0.14);
  border-top-color: #25262b;
  border-radius: 50%;
  animation: message-detail-loading-spin 0.8s linear infinite;
}

@keyframes message-detail-loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
