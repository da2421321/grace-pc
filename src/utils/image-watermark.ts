import watermarkImage from '@/static/images/watermark.png'

const DEFAULT_WATERMARK_CANVAS_ID = 'image-watermark-canvas'
const MAX_EXPORT_EDGE = 2560
const WATERMARK_IMAGE_WIDTH = 800
const WATERMARK_IMAGE_HEIGHT = 800
const WATERMARK_ACCOUNT_OFFSET_Y = 28
const WATERMARK_ACCOUNT_OFFSET_X = 26
const WATERMARK_ACCOUNT_FONT_SIZE = 18
const WATERMARK_ACCOUNT_ANGLE = -Math.PI / 12

// watermark.png 是固定的 800×800 重复图案，这些是每个 logo 单元的中心点。
const WATERMARK_LOGO_CENTERS = [
  { x: 382, y: 24 },
  { x: 678, y: 46 },
  { x: 190, y: 70 },
  { x: 440, y: 106 },
  { x: 28, y: 120 },
  { x: 250, y: 162 },
  { x: 706, y: 182 },
  { x: 40, y: 230 },
  { x: 468, y: 238 },
  { x: 278, y: 298 },
  { x: 714, y: 326 },
  { x: 54, y: 366 },
  { x: 478, y: 384 },
  { x: 286, y: 442 },
  { x: 738, y: 462 },
  { x: 58, y: 512 },
  { x: 506, y: 520 },
  { x: 314, y: 578 },
  { x: 772, y: 580 },
  { x: 574, y: 630 },
  { x: 80, y: 648 },
  { x: 382, y: 690 },
  { x: 626, y: 738 },
  { x: 148, y: 758 },
  { x: 436, y: 778 },
] as const

type WatermarkCanvasContext = {
  clearRect: (x: number, y: number, width: number, height: number) => void
  drawImage: (image: WatermarkCanvasImage, dx: number, dy: number, dWidth: number, dHeight: number) => void
  fillText: (text: string, x: number, y: number) => void
  restore: () => void
  rotate: (angle: number) => void
  save: () => void
  translate: (x: number, y: number) => void
  font: string
  fillStyle: string
  globalAlpha: number
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
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
  userName?: string
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
  const userName = options.userName?.trim() || '当前用户'
  const cacheKey = JSON.stringify([canvasId, normalizedSource, userName])
  const cached = watermarkedImageCache.get(cacheKey)
  if (cached)
    return cached

  const task = createWatermarkedImage(normalizedSource, canvasId, userName).catch((error) => {
    watermarkedImageCache.delete(cacheKey)
    throw error
  })
  watermarkedImageCache.set(cacheKey, task)
  return task
}

async function createWatermarkedImage(source: string, canvasId: string, userName: string) {
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
  drawUserName(drawingContext, userName, size.width, size.height)

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
  const { scale, offsetX, offsetY, drawWidth, drawHeight } = getWatermarkTransform(
    width,
    height,
    watermarkWidth,
    watermarkHeight,
  )

  context.save()
  context.globalAlpha = 1
  context.drawImage(watermark, offsetX, offsetY, drawWidth, drawHeight)
  context.restore()
}

function drawUserName(context: WatermarkCanvasContext, userName: string, width: number, height: number) {
  const { scale, offsetX, offsetY } = getWatermarkTransform(
    width,
    height,
    WATERMARK_IMAGE_WIDTH,
    WATERMARK_IMAGE_HEIGHT,
  )
  const fontSize = Math.max(8, Math.round(WATERMARK_ACCOUNT_FONT_SIZE * scale))

  context.save()
  context.globalAlpha = 0.45
  context.fillStyle = '#8FB8A1'
  context.font = `500 ${fontSize}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'

  for (const { x, y } of WATERMARK_LOGO_CENTERS) {
    context.save()
    context.translate(
      offsetX + (x + WATERMARK_ACCOUNT_OFFSET_X) * scale,
      offsetY + y * scale,
    )
    context.rotate(WATERMARK_ACCOUNT_ANGLE)
    context.fillText(userName, 0, WATERMARK_ACCOUNT_OFFSET_Y * scale)
    context.restore()
  }

  context.restore()
}

function getWatermarkTransform(width: number, height: number, watermarkWidth: number, watermarkHeight: number) {
  const scale = Math.max(width / watermarkWidth, height / watermarkHeight)
  const drawWidth = watermarkWidth * scale
  const drawHeight = watermarkHeight * scale

  return {
    scale,
    drawWidth,
    drawHeight,
    offsetX: (width - drawWidth) / 2,
    offsetY: (height - drawHeight) / 2,
  }
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
