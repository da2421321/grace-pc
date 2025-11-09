<script setup lang="ts">
import { ref } from 'vue'

interface BannerItem {
  image: string
}

const current = ref(0)
const swiperDotIndex = ref(0)
const data: BannerItem[] = [
  { image: '/static/images/banner/banner01.jpg' },
  { image: '/static/images/banner/banner02.jpg' },
  { image: '/static/images/banner/banner03.jpg' },
]

const managementShortcuts = [
  { icon: 'person-filled', label: '用户管理' },
  { icon: 'staff-filled', label: '角色管理' },
  { icon: 'color', label: '菜单管理' },
  { icon: 'settings-filled', label: '部门管理' },
  { icon: 'heart-filled', label: '岗位管理' },
  { icon: 'bars', label: '字典管理' },
  { icon: 'gear-filled', label: '参数设置' },
  { icon: 'chat-filled', label: '通知公告' },
  { icon: 'wallet-filled', label: '日志管理' },
] as const

function clickBannerItem(item: BannerItem) {
  // eslint-disable-next-line no-console
  console.info(item)
}

function changeSwiper(e: any) {
  current.value = e.detail.current
}

function changeGrid() {
  uni.showToast({
    title: '模块建设中~',
    icon: 'none',
  })
}
</script>

<template>
  <view class="min-h-screen bg-white px-4 py-6 space-y-6">
    <uni-swiper-dot
      class="w-full"
      :info="data"
      :current="current"
      field="content"
    >
      <swiper
        class="h-[300rpx]"
        :current="swiperDotIndex"
        @change="changeSwiper"
      >
        <swiper-item
          v-for="(item, index) in data"
          :key="index"
        >
          <view
            class="flex h-full items-center justify-center"
            @click="clickBannerItem(item)"
          >
            <image
              class="h-full w-full rounded-xl"
              :src="item.image"
              mode="aspectFill"
              :draggable="false"
            />
          </view>
        </swiper-item>
      </swiper>
    </uni-swiper-dot>

    <uni-section
      title="系统管理"
      type="line"
    />
    <view class="rounded-lg bg-white">
      <uni-grid
        :column="4"
        :show-border="false"
        @change="changeGrid"
      >
        <uni-grid-item
          v-for="item in managementShortcuts"
          :key="item.label"
        >
          <view class="flex flex-col items-center justify-center py-4 text-sm text-gray-700">
            <uni-icons
              :type="item.icon"
              size="30"
            />
            <text class="mt-2">
              {{ item.label }}
            </text>
          </view>
        </uni-grid-item>
      </uni-grid>
    </view>
  </view>
</template>

<style scoped></style>
