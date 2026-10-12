<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{
  beforeImageUrls: string[]
  afterImageUrls: string[]
  snapshotAvailable: boolean
}>()

const failedImages = ref<Record<string, boolean>>({})
const groups = computed(() => [
  {
    key: 'before',
    title: '变更前图片',
    urls: props.beforeImageUrls,
    emptyText: props.snapshotAvailable ? '无图片' : '历史消息未保存变更前图片',
  },
  { key: 'after', title: '变更后图片', urls: props.afterImageUrls, emptyText: '无图片' },
])

function previewImages(urls: string[], current: string) {
  uni.previewImage({
    urls,
    current,
    fail: () => uni.showToast({ title: '图片预览失败，请稍后重试', icon: 'none' }),
  })
}
</script>

<template>
  <view class="image-comparison">
    <view v-for="group in groups" :key="group.key" class="image-comparison-group">
      <text class="image-comparison-title">
        {{ group.title }}
      </text>
      <view v-if="group.urls.length" class="image-comparison-grid">
        <view
          v-for="(url, index) in group.urls"
          :key="`${group.key}:${index}:${url}`"
          class="image-comparison-thumbnail"
          @click.stop="previewImages(group.urls, url)"
        >
          <view v-if="failedImages[url]" class="image-comparison-failed">
            <text>图片加载失败</text>
          </view>
          <image
            v-else
            class="image-comparison-image"
            :src="url"
            mode="aspectFill"
            lazy-load
            @error="failedImages[url] = true"
          />
        </view>
      </view>
      <text v-else class="image-comparison-empty">
        {{ group.emptyText }}
      </text>
    </view>
  </view>
</template>

<style scoped>
.image-comparison {
  width: 100%;
}

.image-comparison-group + .image-comparison-group {
  margin-top: 30rpx;
}

.image-comparison-title {
  display: block;
  margin-bottom: 16rpx;
  color: #25262b;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 40rpx;
}

.image-comparison-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.image-comparison-thumbnail {
  position: relative;
  width: calc((100% - 24rpx) / 3);
  height: 192rpx;
  overflow: hidden;
  border-radius: 12rpx;
  background: #f7f7f7;
}

.image-comparison-image {
  display: block;
  width: 100%;
  height: 100%;
}

.image-comparison-empty,
.image-comparison-failed {
  color: #777978;
  font-size: 24rpx;
  line-height: 36rpx;
}

.image-comparison-empty {
  display: block;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #f7f7f7;
}

.image-comparison-failed {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  text-align: center;
}
</style>
