import process from 'node:process'
import uni from '@dcloudio/vite-plugin-uni'
import AutoPrefixPlugin from 'autoprefixer'
import TailwindCssPlugin from 'tailwindcss'
import { defineConfig } from 'vite'
import { UnifiedViteWeappTailwindcssPlugin as uvwt } from 'weapp-tailwindcss/vite'

export default defineConfig({
  plugins: [
    uni(),
    uvwt({
      disabled: process.env.UNI_PLATFORM === 'h5',
      rem2rpx: true,
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
    postcss: {
      plugins: [TailwindCssPlugin, AutoPrefixPlugin],
    },
  },
})
