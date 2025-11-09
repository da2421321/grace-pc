<script setup lang="ts">
interface HelpItem {
  title: string
  content: string
}

interface HelpCategory {
  icon: string
  title: string
  childList: HelpItem[]
}

const list: HelpCategory[] = [
  {
    icon: 'iconfont icon-github',
    title: '若依问题',
    childList: [
      { title: '若依开源吗？', content: '开源' },
      { title: '若依可以商用吗？', content: '可以' },
      { title: '若依官网地址多少？', content: 'http://ruoyi.vip' },
      { title: '若依文档地址多少？', content: 'http://doc.ruoyi.vip' },
    ],
  },
  {
    icon: 'iconfont icon-help',
    title: '其他问题',
    childList: [
      {
        title: '如何退出登录？',
        content: '请点击[我的] - [应用设置] - [退出登录]即可退出登录',
      },
      {
        title: '如何修改用户头像？',
        content: '请点击[我的] - [选择头像] - [点击提交]即可更换用户头像',
      },
      {
        title: '如何修改登录密码？',
        content: '请点击[我的] - [应用设置] - [修改密码]即可修改登录密码',
      },
    ],
  },
]

function handleText(item: HelpItem) {
  uni.navigateTo({
    url: `/pages/common/textview/index?title=${item.title}&content=${item.content}`,
  })
}
</script>

<template>
  <view class="min-h-screen bg-[#f8f8f8] px-4 pb-24">
    <view
      v-for="(item, findex) in list"
      :key="findex"
      class="mt-8 space-y-3"
    >
      <view class="flex items-center text-[32rpx] font-bold text-gray-800">
        <text
          :class="item.icon"
          class="mr-2 text-base"
        />
        {{ item.title }}
      </view>
      <view class="rounded-2xl bg-white shadow-sm">
        <view
          v-for="(child, zindex) in item.childList"
          :key="zindex"
          class="px-6 py-4 text-[28rpx] text-gray-600"
          hover-class="bg-gray-50"
          @click="handleText(child)"
        >
          <text>{{ child.title }}</text>
          <view
            v-if="zindex !== item.childList.length - 1"
            class="mt-4 h-px w-full bg-gray-100"
          />
        </view>
      </view>
    </view>
  </view>
</template>
