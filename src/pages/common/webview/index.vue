<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { reactive } from 'vue'

const params = reactive<{ title?: string, url?: string }>({})
const webviewStyles = {
  progress: {
    color: '#FF3333',
  },
}

onLoad((event?: Record<string, string>) => {
  if (event) {
    Object.assign(params, event)
    if (event.title) {
      uni.setNavigationBarTitle({ title: event.title })
    }
  }
})
</script>

<template>
  <view v-if="params.url">
    <web-view
      :webview-styles="webviewStyles"
      :src="`${params.url}`"
    />
  </view>
</template>
