import watermarkImage from '@/static/images/watermark.png'

const DEFAULT_WATERMARK_CANVAS_ID = 'image-watermark-canvas'
const MAX_EXPORT_EDGE = 2560
const IMAGE_LOAD_TIMEOUT = 15000
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

interface WatermarkCanvasContext {
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

interface WatermarkCanvas {
  width: number
  height: number
  createImage: () => WatermarkCanvasImage
  getContext: (contextId: '2d') => WatermarkCanvasContext | null
}

interface WatermarkCanvasImage {
  src: string
  onload: (() => void) | null
  onerror: ((error: unknown) => void) | null
}

interface WatermarkOptions {
  canvasId?: string
  userName?: string
}

interface WatermarkImageInfo {
  path: string
  width: number
  height: number
}

const watermarkedImageCache = new Map<string, Promise<string>>()
let watermarkFileTask: Promise<string> | undefined
let watermarkTaskQueue: Promise<void> = Promise.resolve()

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

  // 预览、保存和详情加载可能同时使用同一个 Canvas，必须等导出结束后再绘制下一张。
  const task = watermarkTaskQueue.then(() => createWatermarkedImage(normalizedSource, canvasId, userName)).catch((error) => {
    watermarkedImageCache.delete(cacheKey)
    throw error
  })
  watermarkTaskQueue = task.then(() => {}, () => {})
  watermarkedImageCache.set(cacheKey, task)
  return task
}

async function createWatermarkedImage(source: string, canvasId: string, userName: string) {
  // #ifndef MP-WEIXIN
  return source
  // #endif

  // #ifdef MP-WEIXIN
  const imageInfo = await prepareCanvasImage(source)
  const watermarkPath = await getWatermarkFilePath()
  const size = getExportSize(imageInfo.width, imageInfo.height)
  const canvas = await getCanvasNode(canvasId)
  canvas.width = size.width
  canvas.height = size.height

  try {
    const context = canvas.getContext('2d')
    if (!context)
      throw new Error('无法创建图片水印画布')

    // getImageInfo 对代码包图片可能返回无前导斜杠的路径，Canvas 会按当前页面解析。
    const imagePath = /^[\w-]+:/.test(imageInfo.path) || imageInfo.path.startsWith('/')
      ? imageInfo.path
      : `/${imageInfo.path}`
    const image = await loadCanvasImage(canvas, imagePath, '加载原图')
    const watermark = await loadCanvasImage(canvas, watermarkPath, '加载水印图')
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
  }
  finally {
    // 释放大图画布的像素缓冲，减少安卓设备连续预览时的内存占用。
    canvas.width = 1
    canvas.height = 1
  }
  // #endif
}

async function prepareCanvasImage(source: string): Promise<WatermarkImageInfo> {
  // OBS 在服务端缩图，避免安卓 Canvas 解码超大原图（9449×9449 约需 341 MiB）。
  // 已有查询参数可能参与 URL 签名，保留这类地址，改用后面的本地缩图。
  const canResizeOnServer = /^https?:\/\/[^/?#]+\.obs\.[a-z0-9-]+\.myhuaweicloud\.com(?::\d+)?\/[^?#]+$/i.test(source)
  let imageInfo: WatermarkImageInfo
  if (canResizeOnServer) {
    try {
      imageInfo = await getImageInfo(`${source}?x-image-process=image/resize,l_${MAX_EXPORT_EDGE},limit_1`)
    }
    catch {
      // 未启用图片处理的 OBS 桶仍可使用微信原生缩图。
      imageInfo = await getImageInfo(source)
    }
  }
  else {
    imageInfo = await getImageInfo(source)
  }

  const size = getExportSize(imageInfo.width, imageInfo.height)
  if (imageInfo.width <= size.width && imageInfo.height <= size.height)
    return imageInfo

  const resizedPath = await new Promise<string>((resolve, reject) => {
    uni.compressImage({
      src: imageInfo.path,
      compressedWidth: size.width,
      compressedHeight: size.height,
      quality: 95,
      success: result => result.tempFilePath
        ? resolve(result.tempFilePath)
        : reject(createWatermarkError('缩小原图', source, '未生成缩图文件')),
      fail: error => reject(createWatermarkError('缩小原图', source, error)),
    })
  })
  const resizedInfo = await getImageInfo(resizedPath)
  // 防止旧基础库忽略缩图尺寸后，又把超大图片送入 Canvas。
  if (resizedInfo.width > MAX_EXPORT_EDGE || resizedInfo.height > MAX_EXPORT_EDGE)
    throw createWatermarkError('缩小原图', source, `缩图尺寸仍过大：${resizedInfo.width}×${resizedInfo.height}`)

  return resizedInfo
}

function getWatermarkFilePath(): Promise<string> {
  if (watermarkFileTask)
    return watermarkFileTask

  // 代码包资源先写入用户目录，再交给 Canvas，避免安卓真机直接加载包内路径的差异。
  watermarkFileTask = new Promise<string>((resolve, reject) => {
    const userDataPath = (uni as unknown as { env: { USER_DATA_PATH: string } }).env.USER_DATA_PATH
    const filePath = `${userDataPath}/qc-image-watermark.png`
    const fileSystem = uni.getFileSystemManager()
    fileSystem.readFile({
      filePath: watermarkImage.replace(/^\/+/, ''),
      success: (result) => {
        fileSystem.writeFile({
          filePath,
          data: result.data,
          success: () => resolve(filePath),
          fail: error => reject(createWatermarkError('写入水印资源', filePath, error)),
        })
      },
      fail: error => reject(createWatermarkError('读取水印资源', watermarkImage, error)),
    })
  }).catch((error) => {
    watermarkFileTask = undefined
    throw error
  })

  return watermarkFileTask
}

function createWatermarkError(stage: string, resource: string, error?: unknown) {
  const details = error as { errMsg?: string, message?: string } | undefined
  const message = typeof error === 'string' ? error : details?.errMsg || details?.message
  return Object.assign(new Error(`${stage}失败${message ? `：${message}` : ''}（${resource}）`), {
    stage,
    resource,
    cause: error,
  })
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

function loadCanvasImage(canvas: WatermarkCanvas, src: string, stage: string): Promise<WatermarkCanvasImage> {
  return new Promise((resolve, reject) => {
    const image = canvas.createImage()
    const timer = setTimeout(() => {
      cleanup()
      reject(createWatermarkError(stage, src, '图片加载超时'))
    }, IMAGE_LOAD_TIMEOUT)
    function cleanup() {
      clearTimeout(timer)
      image.onload = null
      image.onerror = null
    }
    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = (error) => {
      cleanup()
      reject(createWatermarkError(stage, src, error))
    }
    try {
      image.src = src
    }
    catch (error) {
      cleanup()
      reject(createWatermarkError(stage, src, error))
    }
  })
}

function getImageInfo(src: string): Promise<WatermarkImageInfo> {
  return new Promise((resolve, reject) => {
    uni.getImageInfo({
      src,
      success: result => resolve({
        path: result.path,
        width: result.width,
        height: result.height,
      }),
      fail: error => reject(createWatermarkError('获取原图信息', src, error)),
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
  const { offsetX, offsetY, drawWidth, drawHeight } = getWatermarkTransform(
    width,
    height,
    watermarkWidth,
    watermarkHeight,
  )

  context.save()
  // Logo 的颜色和不透明度由 PNG 素材控制。
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
  context.globalAlpha = 0.65
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
      fail: error => reject(createWatermarkError('导出水印图片', `${width}×${height}`, error)),
    })
  })
}
