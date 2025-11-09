<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

const title = ref('')
const content = ref('')

onLoad((options?: Record<string, string>) => {
  const opts = options || {}
  title.value = opts.title || ''
  content.value = opts.content || ''
  if (opts.title) {
    uni.setNavigationBarTitle({ title: opts.title })
  }
})
</script>

<template>
  <view class="min-h-screen bg-white px-4 py-6">
    <uni-card
      :title="title"
      class="font-semibold"
    >
      <text class="block text-[26rpx] leading-6 text-gray-700">
        {{ content }}
      </text>
    </uni-card>
  </view>
</template>
