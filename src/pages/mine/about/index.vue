<script setup lang="ts">
const url = import.meta.env.VITE_APP_SITE_URL
const version = import.meta.env.VITE_APP_VERSION
</script>

<template>
  <view class="min-h-screen bg-[#f8f8f8] px-4 py-6 space-y-6">
    <view class="flex flex-col items-center space-y-3 text-center">
      <image
        class="h-[150rpx] w-[150rpx]"
        src="/static/logo200.png"
        mode="widthFix"
      />
      <uni-title
        type="h2"
        title="若依移动端"
      />
    </view>
    <view class="rounded-lg bg-white text-gray-800">
      <view class="flex items-center justify-between border-b border-gray-100 px-4 py-4 text-sm">
        <text>版本信息</text>
        <text>v{{ version }}</text>
      </view>
      <view class="flex items-center justify-between border-b border-gray-100 px-4 py-4 text-sm">
        <text>官方邮箱</text>
        <text>ruoyi@xx.com</text>
      </view>
      <view class="flex items-center justify-between border-b border-gray-100 px-4 py-4 text-sm">
        <text>服务热线</text>
        <text>400-999-9999</text>
      </view>
      <view class="flex items-center justify-between px-4 py-4 text-sm">
        <text>公司网站</text>
        <uni-link
          :href="url"
          :text="url"
          :show-under-line="false"
        />
      </view>
    </view>
    <view class="pt-6 text-center text-sm text-gray-500">
      Copyright &copy; 2025 ruoyi.vip All Rights Reserved.
    </view>
  </view>
</template>
