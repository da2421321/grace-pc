import uni from "@dcloudio/vite-plugin-uni";
import AutoPrefixPlugin from "autoprefixer";
import TailwindCssPlugin from "tailwindcss";
import { defineConfig } from "vite";
import { UnifiedViteWeappTailwindcssPlugin as uvwt } from "weapp-tailwindcss/vite";

export default defineConfig({
	plugins: [
		uni(),
		uvwt({
			rem2rpx: true,
		}),
	],
	css: {
		postcss: {
			plugins: [TailwindCssPlugin, AutoPrefixPlugin],
		},
	},
});
