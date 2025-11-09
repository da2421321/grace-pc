<script setup lang="ts">
import { computed, watch } from 'vue'

type Decoration = 'line' | 'circle' | 'square' | ''

const props = withDefaults(
  defineProps<{
    type?: Decoration
    title: string
    titleFontSize?: string
    titleColor?: string
    subTitle?: string
    subTitleFontSize?: string
    subTitleColor?: string
    padding?: boolean | string
  }>(),
  {
    type: '',
    titleFontSize: '14px',
    titleColor: '#333',
    subTitle: '',
    subTitleFontSize: '12px',
    subTitleColor: '#999',
    padding: false,
  },
)

const emit = defineEmits<{
  (e: 'click'): void
}>()

const paddingStyle = computed(() => {
  if (typeof props.padding === 'string') {
    return props.padding
  }
  return props.padding ? '10px' : ''
})

const decorationClass = computed(() => {
  switch (props.type) {
    case 'line':
      return 'w-1 h-3 rounded-full'
    case 'circle':
      return 'w-2 h-2 rounded-full'
    case 'square':
      return 'w-2 h-2'
    default:
      return ''
  }
})

function handleClick() {
  emit('click')
}

watch(
  () => props.title,
  (newVal) => {
    if (uni.report && newVal) {
      uni.report('title', newVal)
    }
  },
)
</script>

<template>
  <view class="bg-white">
    <view
      class="flex flex-row items-center px-[10px] py-3"
      @click="handleClick"
    >
      <view
        v-if="type"
        class="mr-1 bg-[#2979ff]"
        :class="decorationClass"
      />
      <slot
        v-else
        name="decoration"
      />

      <view
        class="flex flex-1 text-[#333]"
        :class="subTitle ? 'flex-col' : 'flex-row items-center'"
      >
        <text
          :style="{ 'font-size': titleFontSize, 'color': titleColor }"
          class="text-sm font-normal"
        >
          {{ title }}
        </text>
        <text
          v-if="subTitle"
          :style="{ 'font-size': subTitleFontSize, 'color': subTitleColor }"
          class="mt-0.5"
        >
          {{ subTitle }}
        </text>
      </view>

      <view class="text-sm">
        <slot name="right" />
      </view>
    </view>

    <view
      class="text-sm"
      :style="{ padding: paddingStyle }"
    >
      <slot />
    </view>
  </view>
</template>
