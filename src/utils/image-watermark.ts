import watermarkImage from '@/static/images/watermark.png'

const DEFAULT_WATERMARK_CANVAS_ID = 'image-watermark-canvas'
const MAX_EXPORT_EDGE = 2560
const WATERMARK_IMAGE_WIDTH = 800
const WATERMARK_IMAGE_HEIGHT = 800

type WatermarkCanvasContext = {
  clearRect: (x: number, y: number, width: number, height: number) => void
  drawImage: (image: WatermarkCanvasImage, dx: number, dy: number, dWidth: number, dHeight: number) => void
  restore: () => void
  save: () => void
  globalAlpha: number
}

type WatermarkCanvas = {
  width: number
  height: number
  createImage: () => WatermarkCanvasImage
  getContext: (contextId: '2d') => WatermarkCanvasContext | null
}

type WatermarkCanvasImage = {
  src: string
  onload: (() => void) | null
  onerror: ((error: unknown) => void) | null
}

type WatermarkOptions = {
  canvasId?: string
}

const watermarkedImageCache = new Map<string, Promise<string>>()

/**
 * 生成带水印的临时图片，供微信图片预览和保存到相册使用。
 * 预览与保存接口只会接收生成后的水印图片，不会接收原始图片地址。
 */
export function getWatermarkedImage(source: string, options: WatermarkOptions = {}) {
  const normalizedSource = source.trim()
  if (!normalizedSource)
    return Promise.reject(new Error('图片地址不能为空'))

  const canvasId = options.canvasId || DEFAULT_WATERMARK_CANVAS_ID
  const cacheKey = `${canvasId}:${normalizedSource}`
  const cached = watermarkedImageCache.get(cacheKey)
  if (cached)
    return cached

  const task = createWatermarkedImage(normalizedSource, canvasId).catch((error) => {
    watermarkedImageCache.delete(cacheKey)
    throw error
  })
  watermarkedImageCache.set(cacheKey, task)
  return task
}

async function createWatermarkedImage(source: string, canvasId: string) {
  // #ifndef MP-WEIXIN
  return source
  // #endif

  // #ifdef MP-WEIXIN
  const imageInfo = await getImageInfo(source)
  const size = getExportSize(imageInfo.width, imageInfo.height)
  const canvas = await getCanvasNode(canvasId)
  canvas.width = size.width
  canvas.height = size.height
  const context = canvas.getContext('2d')
  if (!context)
    throw new Error('无法创建图片水印画布')

  const image = await loadCanvasImage(canvas, imageInfo.path)
  // 本地静态资源不能使用 getImageInfo 返回的 path 再交给 Canvas 2D，
  // 微信开发者工具会将其错误解析成 /pages/static/...；直接使用打包后的资源地址。
  const watermark = await loadCanvasImage(canvas, watermarkImage)
  const drawingContext = context as WatermarkCanvasContext
  drawingContext.clearRect(0, 0, size.width, size.height)
  drawingContext.drawImage(image, 0, 0, size.width, size.height)
  drawWatermark(
    drawingContext,
    watermark,
    size.width,
    size.height,
    WATERMARK_IMAGE_WIDTH,
    WATERMARK_IMAGE_HEIGHT,
  )

  return await exportCanvas(canvas, size.width, size.height)
  // #endif
}

function getCanvasNode(canvasId: string): Promise<WatermarkCanvas> {
  return new Promise((resolve, reject) => {
    uni.createSelectorQuery()
      .select(`#${canvasId}`)
      .fields({ node: true }, (result) => {
        const canvas = (result as unknown as { node?: WatermarkCanvas } | null)?.node
        if (!canvas) {
          reject(new Error('水印画布尚未加载完成'))
          return
        }
        resolve(canvas)
      })
      .exec()
  })
}

function loadCanvasImage(canvas: WatermarkCanvas, src: string): Promise<WatermarkCanvasImage> {
  return new Promise((resolve, reject) => {
    const image = canvas.createImage()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

function getImageInfo(src: string): Promise<{ path: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: result => resolve({
        path: result.path,
        width: result.width,
        height: result.height,
      }),
      fail: reject,
    })
  })
}

function getExportSize(width: number, height: number) {
  const sourceWidth = Math.max(1, width)
  const sourceHeight = Math.max(1, height)
  const scale = Math.min(1, MAX_EXPORT_EDGE / Math.max(sourceWidth, sourceHeight))

  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

function drawWatermark(
  context: WatermarkCanvasContext,
  watermark: WatermarkCanvasImage,
  width: number,
  height: number,
  watermarkWidth: number,
  watermarkHeight: number,
) {
  const scale = Math.max(width / watermarkWidth, height / watermarkHeight)
  const drawWidth = watermarkWidth * scale
  const drawHeight = watermarkHeight * scale
  const offsetX = (width - drawWidth) / 2
  const offsetY = (height - drawHeight) / 2

  context.save()
  context.globalAlpha = 1
  context.drawImage(watermark, offsetX, offsetY, drawWidth, drawHeight)
  context.restore()
}

function exportCanvas(canvas: WatermarkCanvas, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvasApi = uni as unknown as {
      canvasToTempFilePath: (options: {
        canvas: WatermarkCanvas
        x: number
        y: number
        width: number
        height: number
        destWidth: number
        destHeight: number
        fileType: 'jpg'
        quality: number
        success: (result: { tempFilePath?: string }) => void
        fail: (error: unknown) => void
      }) => void
    }
    canvasApi.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width,
      height,
      destWidth: width,
      destHeight: height,
      fileType: 'jpg',
      quality: 0.95,
      success: result => result.tempFilePath ? resolve(result.tempFilePath) : reject(new Error('未生成水印图片')),
      fail: reject,
    })
  })
}
