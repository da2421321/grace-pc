<script setup lang="ts">
import type { QualityMessageGroup, QualityMessageItem } from '@/data/messages'
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { fetchQualityMessageGroups, getQualityMessageIcon } from '@/data/messages'
import { getCustomNavigationStyle } from '@/utils/navigation'

type MessageFilter = 'all' | 'unread' | 'read'

const groups = ref<QualityMessageGroup[]>([])
const loading = ref(false)
const loadError = ref('')
const searchKeyword = ref('')
const appliedKeyword = ref('')
const selectedFilter = ref<MessageFilter>('all')

const pageStyle = ref<ReturnType<typeof getCustomNavigationStyle>>()

const visibleGroups = computed(() => {
  const keyword = appliedKeyword.value.toLowerCase()
  return groups.value.filter((group) => {
    const matchesFilter = selectedFilter.value === 'all'
      || (selectedFilter.value === 'unread' && group.unreadCount > 0)
      || (selectedFilter.value === 'read' && group.total > 0 && group.unreadCount === 0)
    if (!matchesFilter)
      return false
    if (!keyword)
      return true
    const item = group.latestMessage
    const text = [group.title, item?.title, item?.subjectName, item?.varietyName, item?.varietyCode, item?.content].join(' ').toLowerCase()
    return text.includes(keyword)
  })
})

onLoad(() => {
  pageStyle.value = getCustomNavigationStyle()
})

onShow(() => {
  void loadMessageGroups()
})

onPullDownRefresh(async () => {
  await loadMessageGroups()
  uni.stopPullDownRefresh()
})

async function loadMessageGroups() {
  if (loading.value)
    return
  loading.value = true
  loadError.value = ''

  try {
    groups.value = await fetchQualityMessageGroups()
  }
  catch (error) {
    loadError.value = error instanceof Error ? error.message : '消息加载失败，请稍后重试'
  }
  finally {
    loading.value = false
  }
}

function openMessageGroup(group: QualityMessageGroup) {
  uni.navigateTo({ url: `/pages/message/type?type=${group.type}` })
}

function selectFilter(filter: MessageFilter) {
  selectedFilter.value = filter
}

function goBack() {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
    return
  }
  uni.switchTab({ url: '/pages/index' })
}

function applySearch() {
  appliedKeyword.value = searchKeyword.value.trim()
}

function getMessagePreview(item?: QualityMessageItem) {
  return item ? item.title || item.content : '近一个月暂无此类消息'
}

function formatUnreadCount(count: number) {
  return count > 99 ? '99+' : String(count)
}

function formatMessageTime(value = '') {
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})/)
  if (!match)
    return value
  const [, , , , hour, minute] = match
  return `${hour.padStart(2, '0')}:${minute}`
}
</script>

<template>
  <view class="message-page" :style="pageStyle">
    <view class="message-top">
      <view class="message-status-bar" />
      <view class="message-nav">
        <image class="message-back" src="/static/images/figma/message/7fabdd9331227ca9dba59b3e264197d4e5b6d11b.svg" mode="aspectFit" @click="goBack" />
        <text class="message-nav-title">
          消息
        </text>
      </view>
    </view>

    <view class="message-search">
      <image class="message-search-icon" src="/static/images/figma/message/3a44f6e2a1fb58ce54285be36bc90f4a5bd66e2e.svg" mode="aspectFit" />
      <input v-model="searchKeyword" class="message-search-input" type="text" confirm-type="search" placeholder="搜索你需要的消息" placeholder-class="message-search-placeholder" @confirm="applySearch">
      <button class="message-search-button" hover-class="none" @click="applySearch">
        搜索
      </button>
    </view>

    <view class="message-filters">
      <button class="message-filter" :class="{ 'message-filter-active': selectedFilter === 'all' }" hover-class="none" @click="selectFilter('all')">
        全部
      </button>
      <button class="message-filter" :class="{ 'message-filter-active': selectedFilter === 'unread' }" hover-class="none" @click="selectFilter('unread')">
        未读
      </button>
      <button class="message-filter" :class="{ 'message-filter-active': selectedFilter === 'read' }" hover-class="none" @click="selectFilter('read')">
        已读
      </button>
    </view>

    <view class="message-content">
      <view v-if="loading && !groups.length" class="message-state">
        <view class="message-loading" />
      </view>
      <view v-else-if="loadError" class="message-state">
        <uni-icons type="refreshempty" size="54" color="#a4a6a5" />
        <text class="message-state-title">
          消息加载失败
        </text>
        <text class="message-state-desc">
          {{ loadError }}
        </text>
        <button class="message-retry" hover-class="none" @click="loadMessageGroups">
          重新加载
        </button>
      </view>
      <view v-else-if="!visibleGroups.length" class="message-state">
        <uni-icons type="notification" size="58" color="#a4a6a5" />
        <text class="message-state-title">
          暂无消息
        </text>
        <text class="message-state-desc">
          没有符合条件的消息
        </text>
      </view>
      <view v-else class="message-list">
        <button v-for="group in visibleGroups" :key="group.type" class="message-row" hover-class="message-row-active" @click="openMessageGroup(group)">
          <view class="message-row-icon">
            <image class="message-type-icon" :src="getQualityMessageIcon(group.type)" mode="aspectFit" />
            <view v-if="group.unreadCount > 0" class="message-unread-badge" :class="{ 'message-unread-badge-wide': group.unreadCount > 9 }">
              <image src="/static/images/figma/message/0fcd63c339646186171749327d841017628f8b30.svg" mode="scaleToFill" />
              <text class="message-unread-count">
                {{ formatUnreadCount(group.unreadCount) }}
              </text>
            </view>
          </view>
          <view class="message-row-copy">
            <text class="message-row-title">
              {{ group.title }}
            </text>
            <text class="message-row-description">
              {{ getMessagePreview(group.latestMessage) }}
            </text>
          </view>
          <text class="message-row-time">
            {{ formatMessageTime(group.latestMessage?.updateTime) }}
          </text>
        </button>
        <view class="message-list-tip">
          近一个月的消息已全部展示
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.message-page { min-height: calc(100vh - var(--window-bottom, 0px)); box-sizing: border-box; overflow-x: hidden; background: #fff; color: #25262b; }
.message-top { height: calc(var(--status-bar-height, 44px) + var(--navigation-height, 44px)); box-sizing: border-box; background: #fff; }
.message-status-bar { height: var(--status-bar-height, 44px); }
.message-nav { position: relative; display: flex; height: var(--navigation-height, 44px); align-items: center; justify-content: center; }
.message-back { position: absolute; top: var(--navigation-center, 22px); left: 50rpx; width: 18rpx; height: 34rpx; transform: translateY(-50%); }
.message-nav-title { position: absolute; top: var(--navigation-center, 22px); left: 102rpx; max-width: calc(100% - 102rpx - var(--navigation-right-inset, 110px)); overflow: hidden; color: #1a2f4d; font-size: 36rpx; font-weight: 400; line-height: 50rpx; text-overflow: ellipsis; white-space: nowrap; transform: translateY(-50%); }
.message-search { position: relative; display: flex; width: 650rpx; height: 70rpx; box-sizing: border-box; align-items: center; margin: 12rpx auto 0; border: 2rpx solid #92e616; border-radius: 20rpx; background: #fff; }
.message-search-icon { width: 31rpx; height: 31rpx; flex-shrink: 0; margin-left: 35rpx; }
.message-search-input { min-width: 0; flex: 1; height: 64rpx; margin-left: 20rpx; padding: 0; color: #25262b; font-size: 26rpx; line-height: 64rpx; }
.message-search-placeholder { color: #777978; font-size: 26rpx; }
.message-search-button { width: 74rpx; height: 50rpx; flex-shrink: 0; margin-right: 10rpx; padding: 0; border: 1rpx solid #92e616; border-radius: 10rpx; background: #92e616; color: #25262b; font-size: 26rpx; font-weight: 400; line-height: 48rpx; text-align: center; }
.message-search-button::after, .message-filter::after, .message-row::after, .message-retry::after { border: 0; }
.message-filters { display: flex; gap: 12rpx; margin: 20rpx 0 0 52rpx; }
.message-filter { width: 116rpx; height: 70rpx; margin: 0; padding: 0; border: 0; border-radius: 30rpx; background: #f7f7f7; color: #777978; font-size: 26rpx; font-weight: 400; line-height: 70rpx; text-align: center; }
.message-filter-active { background: #92e616; color: #25262b; font-weight: 500; }
.message-content { min-height: 560rpx; padding: 20rpx 20rpx calc(40rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.message-list { display: flex; flex-direction: column; }
.message-row { position: relative; display: flex; width: 710rpx; height: 140rpx; box-sizing: border-box; align-items: center; margin: 0; padding: 0; border: 0; border-radius: 0; background: #fff; color: #25262b; line-height: normal; text-align: left; }
.message-row-active { background: #fbfff4; }
.message-row-icon { position: relative; width: 89rpx; height: 90rpx; flex-shrink: 0; margin-left: 33rpx; }
.message-type-icon { display: block; width: 89rpx; height: 90rpx; }
.message-unread-badge { position: absolute; top: 0; left: 67rpx; display: flex; min-width: 28rpx; height: 28rpx; box-sizing: border-box; align-items: center; justify-content: center; border-radius: 14rpx; background: #ff3344; }
.message-unread-badge-wide { padding: 0 6rpx; }
.message-unread-badge image { position: absolute; top: 0; left: 0; display: block; width: 100%; height: 28rpx; }
.message-unread-count { position: relative; color: #fff; font-family: Arial, sans-serif; font-size: 24rpx; font-weight: 400; line-height: 28rpx; white-space: nowrap; }
.message-row-copy { min-width: 0; flex: 1; margin-left: 24rpx; margin-right: 29rpx; }
.message-row-title, .message-row-description { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.message-row-title { padding-right: 100rpx; color: #25262b; font-size: 30rpx; font-weight: 500; line-height: 34rpx; }
.message-row-description { margin-top: 18rpx; color: #777978; font-size: 26rpx; font-weight: 400; line-height: 30rpx; }
.message-row-time { position: absolute; top: 37rpx; right: 29rpx; color: #777978; font-family: Arial, sans-serif; font-size: 24rpx; line-height: 30rpx; text-align: right; }
.message-state { display: flex; min-height: 560rpx; flex-direction: column; align-items: center; justify-content: center; padding: 40rpx; box-sizing: border-box; text-align: center; }
.message-state-title { margin-top: 24rpx; color: #4b4d4c; font-size: 28rpx; font-weight: 600; line-height: 40rpx; }
.message-state-desc { margin-top: 10rpx; color: #a4a6a5; font-size: 24rpx; line-height: 36rpx; }
.message-retry { width: 220rpx; height: 72rpx; margin: 28rpx 0 0; padding: 0; border: 0; border-radius: 22rpx; background: #25262b; color: #fff; font-size: 25rpx; line-height: 72rpx; }
.message-loading { box-sizing: border-box; border-style: solid; border-color: rgba(37, 38, 43, 0.14); border-top-color: #25262b; border-radius: 50%; animation: message-loading-spin 0.8s linear infinite; }
.message-loading { width: 52rpx; height: 52rpx; border-width: 5rpx; }
.message-list-tip { display: flex; height: 74rpx; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; background: transparent; color: #a4a6a5; font-size: 22rpx; line-height: 74rpx; }
@keyframes message-loading-spin { to { transform: rotate(360deg); } }
</style>
