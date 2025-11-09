<script setup lang="ts">
import { reactive, toRefs } from 'vue'
import { useUserStore } from '@/store/user'
import { uploadAvatar } from '@/utils/upload'

const baseUrl = import.meta.env.VITE_APP_BASE_URL
const sysInfo = uni.getSystemInfoSync()
const SCREEN_WIDTH = sysInfo.screenWidth
const DRAFG_MOVE_RATIO = 1
const DRAW_IMAGE_W = sysInfo.screenWidth

let PAGE_X = 0
let PAGE_Y = 0
let T_PAGE_X = 0
let T_PAGE_Y = 0
let CUT_L = 0
let CUT_T = 0
let CUT_R = 0
let CUT_B = 0
let IMG_RATIO = 1
let IMG_REAL_W = SCREEN_WIDTH
let IMG_REAL_H = SCREEN_WIDTH
let INIT_DRAG_POSITION = 100

interface CropperState {
  imageSrc: string
  isShowImg: boolean
  cropperInitW: number
  cropperInitH: number
  cropperW: number
  cropperH: number
  cropperL: number
  cropperT: number
  transL: number
  transT: number
  scaleP: number
  imageW: number
  imageH: number
  cutL: number
  cutT: number
  cutB: number
  cutR: number | string
  qualityWidth: number
  innerAspectRadio: number
}

const userStore = useUserStore()

const state = reactive<CropperState>({
  imageSrc: userStore.avatar || '',
  isShowImg: false,
  cropperInitW: SCREEN_WIDTH,
  cropperInitH: SCREEN_WIDTH,
  cropperW: SCREEN_WIDTH,
  cropperH: SCREEN_WIDTH,
  cropperL: 0,
  cropperT: 0,
  transL: 0,
  transT: 0,
  scaleP: 0,
  imageW: 0,
  imageH: 0,
  cutL: 0,
  cutT: 0,
  cutB: SCREEN_WIDTH,
  cutR: SCREEN_WIDTH,
  qualityWidth: DRAW_IMAGE_W,
  innerAspectRadio: DRAFG_MOVE_RATIO,
})

const {
  imageSrc,
  isShowImg,
  cropperInitW,
  cropperInitH,
  cropperW,
  cropperH,
  cropperL,
  cropperT,
  cutL,
  cutT,
  cutB,
  cutR,
  imageW,
  imageH,
} = toRefs(state)

function setState(patch: Partial<CropperState>) {
  Object.assign(state, patch)
}

function getImage() {
  uni.chooseImage({
    success: (res) => {
      const [path] = res.tempFilePaths
      if (path) {
        setState({ imageSrc: path })
        loadImage()
      }
    },
  })
}

function loadImage() {
  uni.getImageInfo({
    src: state.imageSrc,
    success: (res) => {
      IMG_RATIO = res.width / res.height || 1
      if (IMG_RATIO >= 1) {
        IMG_REAL_W = SCREEN_WIDTH
        IMG_REAL_H = SCREEN_WIDTH / IMG_RATIO
      }
      else {
        IMG_REAL_W = SCREEN_WIDTH * IMG_RATIO
        IMG_REAL_H = SCREEN_WIDTH
      }
      const minRange = Math.max(IMG_REAL_W, IMG_REAL_H)
      INIT_DRAG_POSITION = Math.min(minRange, INIT_DRAG_POSITION)
      if (IMG_RATIO >= 1) {
        const cutT = Math.ceil(
          (SCREEN_WIDTH / IMG_RATIO
            - (SCREEN_WIDTH / IMG_RATIO - INIT_DRAG_POSITION))
          / 2,
        )
        const cutB = cutT
        const cutL = Math.ceil(
          (SCREEN_WIDTH - SCREEN_WIDTH + INIT_DRAG_POSITION) / 2,
        )
        const cutR = cutL
        setState({
          cropperW: SCREEN_WIDTH,
          cropperH: SCREEN_WIDTH / IMG_RATIO,
          cropperL: Math.ceil((SCREEN_WIDTH - SCREEN_WIDTH) / 2),
          cropperT: Math.ceil((SCREEN_WIDTH - SCREEN_WIDTH / IMG_RATIO) / 2),
          cutL,
          cutT,
          cutR,
          cutB,
          imageW: IMG_REAL_W,
          imageH: IMG_REAL_H,
          scaleP: IMG_REAL_W / SCREEN_WIDTH,
          qualityWidth: DRAW_IMAGE_W,
          innerAspectRadio: IMG_RATIO,
          isShowImg: true,
        })
      }
      else {
        const cutL = Math.ceil(
          (SCREEN_WIDTH * IMG_RATIO - SCREEN_WIDTH * IMG_RATIO) / 2,
        )
        const cutR = cutL
        const cutT = Math.ceil((SCREEN_WIDTH - INIT_DRAG_POSITION) / 2)
        const cutB = cutT
        setState({
          cropperW: SCREEN_WIDTH * IMG_RATIO,
          cropperH: SCREEN_WIDTH,
          cropperL: Math.ceil((SCREEN_WIDTH - SCREEN_WIDTH * IMG_RATIO) / 2),
          cropperT: Math.ceil((SCREEN_WIDTH - SCREEN_WIDTH) / 2),
          cutL,
          cutT,
          cutR,
          cutB,
          imageW: IMG_REAL_W,
          imageH: IMG_REAL_H,
          scaleP: IMG_REAL_W / SCREEN_WIDTH,
          qualityWidth: DRAW_IMAGE_W,
          innerAspectRadio: IMG_RATIO,
          isShowImg: true,
        })
      }
      uni.hideLoading()
    },
  })
}

function contentStartMove(e: any) {
  const touch = e.touches?.[0]
  if (!touch)
    return
  PAGE_X = touch.pageX
  PAGE_Y = touch.pageY
}

function contentMoveing(e: any) {
  const touch = e.touches?.[0]
  if (!touch)
    return
  let dragLengthX = (PAGE_X - touch.pageX) * DRAFG_MOVE_RATIO
  let dragLengthY = (PAGE_Y - touch.pageY) * DRAFG_MOVE_RATIO

  if (dragLengthX > 0) {
    if (state.cutL - dragLengthX < 0)
      dragLengthX = state.cutL
  }
  else if (Number(state.cutR) + dragLengthX < 0) {
    dragLengthX = -Number(state.cutR)
  }

  if (dragLengthY > 0) {
    if (state.cutT - dragLengthY < 0)
      dragLengthY = state.cutT
  }
  else if (state.cutB + dragLengthY < 0) {
    dragLengthY = -state.cutB
  }

  setState({
    cutL: state.cutL - dragLengthX,
    cutT: state.cutT - dragLengthY,
    cutR: Number(state.cutR) + dragLengthX,
    cutB: state.cutB + dragLengthY,
  })

  PAGE_X = touch.pageX
  PAGE_Y = touch.pageY
}

function contentTouchEnd() {
  // no-op placeholder
}

function dragStart(e: any) {
  const touch = e.touches?.[0]
  if (!touch)
    return
  T_PAGE_X = touch.pageX
  T_PAGE_Y = touch.pageY
  CUT_L = state.cutL
  CUT_R = Number(state.cutR)
  CUT_B = state.cutB
  CUT_T = state.cutT
}

function dragMove(e: any) {
  const touch = e.touches?.[0]
  const target = e.target as { dataset?: Record<string, string> } | undefined
  const dragType = target?.dataset?.drag
  if (!touch || !dragType)
    return
  switch (dragType) {
    case 'right': {
      let dragLength = (T_PAGE_X - touch.pageX) * DRAFG_MOVE_RATIO
      if (CUT_R + dragLength < 0)
        dragLength = -CUT_R
      setState({ cutR: CUT_R + dragLength })
      break
    }
    case 'left': {
      let dragLength = (T_PAGE_X - touch.pageX) * DRAFG_MOVE_RATIO
      if (CUT_L - dragLength < 0)
        dragLength = CUT_L
      if (CUT_L - dragLength > state.cropperW - Number(state.cutR)) {
        dragLength = CUT_L - (state.cropperW - Number(state.cutR))
      }
      setState({ cutL: CUT_L - dragLength })
      break
    }
    case 'top': {
      let dragLength = (T_PAGE_Y - touch.pageY) * DRAFG_MOVE_RATIO
      if (CUT_T - dragLength < 0)
        dragLength = CUT_T
      if (CUT_T - dragLength > state.cropperH - state.cutB) {
        dragLength = CUT_T - (state.cropperH - state.cutB)
      }
      setState({ cutT: CUT_T - dragLength })
      break
    }
    case 'bottom': {
      let dragLength = (T_PAGE_Y - touch.pageY) * DRAFG_MOVE_RATIO
      if (CUT_B + dragLength < 0)
        dragLength = -CUT_B
      setState({ cutB: CUT_B + dragLength })
      break
    }
    case 'rightBottom': {
      let dragLengthX = (T_PAGE_X - touch.pageX) * DRAFG_MOVE_RATIO
      let dragLengthY = (T_PAGE_Y - touch.pageY) * DRAFG_MOVE_RATIO

      if (CUT_B + dragLengthY < 0)
        dragLengthY = -CUT_B
      if (CUT_R + dragLengthX < 0)
        dragLengthX = -CUT_R
      setState({
        cutB: CUT_B + dragLengthY,
        cutR: CUT_R + dragLengthX,
      })
      break
    }
    default:
      break
  }
}

function getImageInfo() {
  uni.showLoading({
    title: '图片生成中...',
  })
  const ctx = uni.createCanvasContext('myCanvas')
  ctx.drawImage(state.imageSrc, 0, 0, IMG_REAL_W, IMG_REAL_H)
  ctx.draw(true, () => {
    const canvasW
      = ((state.cropperW - state.cutL - Number(state.cutR)) / state.cropperW)
        * IMG_REAL_W
    const canvasH
      = ((state.cropperH - state.cutT - state.cutB) / state.cropperH) * IMG_REAL_H
    const canvasL = (state.cutL / state.cropperW) * IMG_REAL_W
    const canvasT = (state.cutT / state.cropperH) * IMG_REAL_H
    uni.canvasToTempFilePath({
      x: canvasL,
      y: canvasT,
      width: canvasW,
      height: canvasH,
      destWidth: canvasW,
      destHeight: canvasH,
      quality: 0.5,
      canvasId: 'myCanvas',
      success: async (res) => {
        uni.hideLoading()
        const response = await uploadAvatar(res.tempFilePath)
        const avatarUrl = `${baseUrl}${response.imgUrl}`
        userStore.setAvatar(avatarUrl)
        uni.showToast({ title: '修改成功', icon: 'success' })
        uni.navigateBack()
      },
    })
  })
}

if (state.imageSrc) {
  loadImage()
}
</script>

<template>
  <view class="px-4 py-6 space-y-4">
    <view class="min-h-[750rpx] w-full">
      <view
        v-if="isShowImg"
        class="relative overflow-hidden select-none bg-black"
        :style="`width:${cropperInitW}px;height:${cropperInitH}px`"
      >
        <view
          class="absolute"
          :style="`width:${cropperW}px;height:${cropperH}px;left:${cropperL}px;top:${cropperT}px`"
        >
          <image
            :src="imageSrc"
            :style="`width:${cropperW}px;height:${cropperH}px`"
            class="block"
          />
          <view
            class="absolute bg-white/30"
            :style="`left:${cutL}px;top:${cutT}px;right:${cutR}px;bottom:${cutB}px`"
            @touchstart.stop="contentStartMove"
            @touchmove.stop="contentMoveing"
            @touchend.stop="contentTouchEnd"
          >
            <view class="relative h-full w-full outline outline-1 outline-blue-400/70">
              <view class="absolute inset-x-0 top-1/3 h-1/3 border-y border-dashed border-white/50" />
              <view class="absolute inset-y-0 left-1/3 w-1/3 border-x border-dashed border-white/50" />
              <view
                class="absolute inset-x-0 top-0 h-px bg-blue-400/40"
                data-drag="top"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view
                class="absolute inset-y-0 right-0 w-px bg-blue-400/40"
                data-drag="right"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view
                class="absolute inset-x-0 bottom-0 h-px bg-blue-400/40"
                data-drag="bottom"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view
                class="absolute inset-y-0 left-0 w-px bg-blue-400/40"
                data-drag="left"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view
                class="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1 rounded bg-blue-400"
                data-drag="top"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view class="absolute -top-1 right-0 h-2 w-2 rounded bg-blue-400" />
              <view
                class="absolute top-1/2 right-0 h-2 w-2 -translate-y-1 rounded bg-blue-400"
                data-drag="right"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view
                class="absolute bottom-0 right-0 h-4 w-4 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-400"
                data-drag="rightBottom"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view
                class="absolute bottom-0 left-1/2 h-2 w-2 translate-y-1 rounded bg-blue-400"
                data-drag="bottom"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view class="absolute bottom-0 left-0 h-2 w-2 rounded bg-blue-400" />
              <view
                class="absolute left-0 top-1/2 h-2 w-2 -translate-y-1 rounded bg-blue-400"
                data-drag="left"
                @touchstart.stop="dragStart"
                @touchmove.stop="dragMove"
              />
              <view class="absolute left-0 top-0 h-2 w-2 rounded bg-blue-400" />
            </view>
          </view>
        </view>
      </view>
    </view>
    <view class="space-y-3 px-4">
      <button
        class="h-11 w-full rounded-full border border-blue-500 text-blue-500 flex items-center justify-center"
        @click="getImage"
      >
        选择头像
      </button>
      <button
        class="h-11 w-full rounded-full bg-blue-500 text-white flex items-center justify-center"
        @click="getImageInfo"
      >
        提交
      </button>
    </view>
    <canvas
      canvas-id="myCanvas"
      :style="`position:absolute;border: 1px solid red; width:${imageW}px;height:${imageH}px;top:-9999px;left:-9999px;`"
    />
  </view>
</template>
