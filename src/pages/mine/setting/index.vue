<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/store/user'
import { showModalAsync } from '@/utils/promisify'

const windowHeight = computed(() => uni.getSystemInfoSync().windowHeight)
const userStore = useUserStore()

function handleToPwd() {
  uni.navigateTo({ url: '/pages/mine/pwd/index' })
}

function showTip(message: string) {
  uni.showToast({
    title: message,
    icon: 'none',
  })
}

function handleToUpgrade() {
  showTip('模块建设中~')
}

function handleCleanTmp() {
  showTip('模块建设中~')
}

async function handleLogout() {
  const res = await showModalAsync({
    content: '确定注销并退出系统吗？',
    title: '系统提示',
    cancelText: '取消',
    confirmText: '确定',
  })
  if (!res.confirm)
    return
  await userStore.logout()
  uni.reLaunch({ url: '/pages/index' })
}
</script>

<template>
  <view
    class="min-h-screen bg-[#f8f8f8] space-y-4 px-4 py-6"
    :style="{ height: `${windowHeight}px` }"
  >
    <view class="rounded-lg bg-white text-gray-800">
      <view
        class="flex items-center justify-between border-b border-gray-100 px-4 py-4"
        @click="handleToPwd"
      >
        <view class="flex items-center space-x-3">
          <text class="iconfont icon-password text-blue-500" />
          <text>修改密码</text>
        </view>
        <text class="iconfont icon-right text-gray-400" />
      </view>
      <view
        class="flex items-center justify-between border-b border-gray-100 px-4 py-4"
        @click="handleToUpgrade"
      >
        <view class="flex items-center space-x-3">
          <text class="iconfont icon-refresh text-blue-500" />
          <text>检查更新</text>
        </view>
        <text class="iconfont icon-right text-gray-400" />
      </view>
      <view
        class="flex items-center justify-between px-4 py-4"
        @click="handleCleanTmp"
      >
        <view class="flex items-center space-x-3">
          <text class="iconfont icon-clean text-blue-500" />
          <text>清理缓存</text>
        </view>
        <text class="iconfont icon-right text-gray-400" />
      </view>
    </view>
    <view class="rounded-lg bg-white py-4 text-center text-lg text-gray-800" @click="handleLogout">
      退出登录
    </view>
  </view>
</template>
