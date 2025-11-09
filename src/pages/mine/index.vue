<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const name = computed(() => userStore.name)
const avatar = computed(() => userStore.avatar)
const windowHeight = computed(() => uni.getSystemInfoSync().windowHeight - 50)

function handleToInfo() {
  uni.navigateTo({ url: '/pages/mine/info/index' })
}

function handleToEditInfo() {
  uni.navigateTo({ url: '/pages/mine/info/edit' })
}

function handleToSetting() {
  uni.navigateTo({ url: '/pages/mine/setting/index' })
}

function handleToLogin() {
  uni.reLaunch({ url: '/pages/login' })
}

function handleToAvatar() {
  uni.navigateTo({ url: '/pages/mine/avatar/index' })
}

function handleHelp() {
  uni.navigateTo({ url: '/pages/mine/help/index' })
}

function handleAbout() {
  uni.navigateTo({ url: '/pages/mine/about/index' })
}

function showToast(message: string) {
  uni.showToast({
    title: message,
    icon: 'none',
  })
}

function handleJiaoLiuQun() {
  showToast('QQ群：①133713780(满)、②146013835(满)、③189091635')
}

function handleBuilding() {
  showToast('模块建设中~')
}
</script>

<template>
  <view
    class="min-h-screen bg-[#f5f6f7]"
    :style="{ height: `${windowHeight}px` }"
  >
    <view class="bg-[#3c96f3] text-white px-4 pt-4 pb-12">
      <view class="flex items-center justify-between">
        <view class="flex items-center space-x-3">
          <view
            v-if="!avatar"
            class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-white"
          >
            <text class="iconfont icon-people text-2xl text-gray-500" />
          </view>
          <image
            v-else
            :src="avatar"
            class="h-14 w-14 rounded-full border-2 border-white"
            mode="widthFix"
            @click="handleToAvatar"
          />
          <view
            v-if="!name"
            class="text-lg ml-2"
            @click="handleToLogin"
          >
            点击登录
          </view>
          <view
            v-else
            class="text-lg ml-2"
            @click="handleToInfo"
          >
            用户名：{{ name }}
          </view>
        </view>
        <view
          class="flex items-center space-x-1 text-sm"
          @click="handleToInfo"
        >
          <text>个人信息</text>
          <text class="iconfont icon-right" />
        </view>
      </view>
    </view>

    <view class="-mt-10 space-y-4 px-4">
      <view class="grid grid-cols-4 gap-y-4 rounded-lg bg-white py-5 text-center">
        <view
          class="flex flex-col items-center text-sm"
          @click="handleJiaoLiuQun"
        >
          <text class="iconfont icon-friendfill text-2xl text-pink-500" />
          <text class="mt-2 text-gray-700">
            交流群
          </text>
        </view>
        <view
          class="flex flex-col items-center text-sm"
          @click="handleBuilding"
        >
          <text class="iconfont icon-service text-2xl text-blue-500" />
          <text class="mt-2 text-gray-700">
            在线客服
          </text>
        </view>
        <view
          class="flex flex-col items-center text-sm"
          @click="handleBuilding"
        >
          <text class="iconfont icon-community text-2xl text-purple-500" />
          <text class="mt-2 text-gray-700">
            反馈社区
          </text>
        </view>
        <view
          class="flex flex-col items-center text-sm"
          @click="handleBuilding"
        >
          <text class="iconfont icon-dianzan text-2xl text-green-500" />
          <text class="mt-2 text-gray-700">
            点赞我们
          </text>
        </view>
      </view>

      <view class="space-y-3 rounded-lg bg-white p-4 text-gray-800">
        <view
          class="flex items-center justify-between border-b border-gray-100 pb-3"
          @click="handleToEditInfo"
        >
          <view class="flex items-center space-x-3">
            <text class="iconfont icon-user text-blue-500" />
            <text>编辑资料</text>
          </view>
          <text class="iconfont icon-right text-gray-400" />
        </view>
        <view
          class="flex items-center justify-between border-b border-gray-100 pb-3"
          @click="handleHelp"
        >
          <view class="flex items-center space-x-3">
            <text class="iconfont icon-help text-blue-500" />
            <text>常见问题</text>
          </view>
          <text class="iconfont icon-right text-gray-400" />
        </view>
        <view
          class="flex items-center justify-between border-b border-gray-100 pb-3"
          @click="handleAbout"
        >
          <view class="flex items-center space-x-3">
            <text class="iconfont icon-aixin text-blue-500" />
            <text>关于我们</text>
          </view>
          <text class="iconfont icon-right text-gray-400" />
        </view>
        <view
          class="flex items-center justify-between"
          @click="handleToSetting"
        >
          <view class="flex items-center space-x-3">
            <text class="iconfont icon-setting text-blue-500" />
            <text>应用设置</text>
          </view>
          <text class="iconfont icon-right text-gray-400" />
        </view>
      </view>
    </view>
  </view>
</template>
