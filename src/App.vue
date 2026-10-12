<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'
import { refreshMessageTabRedDot } from '@/utils/message-tab'

onLaunch(() => {
  // eslint-disable-next-line no-console
  console.log('App Launch')
})
onShow(() => {
  // eslint-disable-next-line no-console
  console.log('App Show')
  void refreshMessageTabRedDot()
})
onHide(() => {
  // eslint-disable-next-line no-console
  console.log('App Hide')
})
</script>

<style>
@import '@/static/font/iconfont.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
</style>
