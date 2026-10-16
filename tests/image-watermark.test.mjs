/* eslint test/no-import-node-test: off -- Use the built-in runner without adding dependencies. */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/utils/image-watermark.ts', import.meta.url), 'utf8')

function createHarness(overrides = {}, platform = 'MP-WEIXIN') {
  const state = { reads: [], writes: [], loads: [], exports: [], imageInfoRequests: [], compressions: [], active: 0, maxActive: 0 }
  let drawn = []
  let userName = ''
  const context = {
    clearRect() { drawn = [] },
    drawImage(image) { drawn.push(image.src) },
    fillText(text) { userName = text },
    restore() {},
    rotate() {},
    save() {},
    translate() {},
  }
  const canvas = {
    width: 1,
    height: 1,
    getContext: () => context,
    createImage() {
      let imageSource = ''
      return {
        get src() { return imageSource },
        set src(value) {
          imageSource = value
          state.loads.push(value)
          const image = this
          queueMicrotask(() => {
            if (overrides.loadImage)
              overrides.loadImage(image, value)
            else if (value.startsWith('/static/'))
              image.onerror?.()
            else
              image.onload?.()
          })
        },
      }
    },
  }
  const fileSystem = {
    readFile(options) {
      state.reads.push(options.filePath)
      if (overrides.readFile)
        overrides.readFile(options)
      else
        options.success({ data: new ArrayBuffer(8) })
    },
    writeFile(options) {
      state.writes.push(options.filePath)
      options.success()
    },
  }
  const uni = {
    env: { USER_DATA_PATH: 'wxfile://usr' },
    getFileSystemManager: () => fileSystem,
    getImageInfo(options) {
      state.imageInfoRequests.push(options.src)
      if (overrides.getImageInfo)
        overrides.getImageInfo(options)
      else
        options.success({ path: `wxfile://tmp/${options.src.split('/').pop()}`, width: 2560, height: 1920 })
    },
    compressImage(options) {
      state.compressions.push({ src: options.src, width: options.compressedWidth, height: options.compressedHeight })
      if (overrides.compressImage)
        overrides.compressImage(options)
      else
        options.success({ tempFilePath: 'wxfile://tmp/resized.jpg' })
    },
    createSelectorQuery() {
      let callback
      return {
        select() { return this },
        fields(_options, handler) {
          callback = handler
          return this
        },
        exec() { callback({ node: canvas }) },
      }
    },
    canvasToTempFilePath(options) {
      state.active += 1
      state.maxActive = Math.max(state.maxActive, state.active)
      setImmediate(() => {
        state.active -= 1
        state.exports.push({ drawn: [...drawn], userName, width: canvas.width, height: canvas.height })
        if (overrides.exportImage)
          overrides.exportImage(options)
        else
          options.success({ tempFilePath: `wxfile://tmp/watermarked-${state.exports.length}.jpg` })
      })
    },
  }
  const excluded = platform === 'MP-WEIXIN' ? 'ifndef' : 'ifdef'
  const code = source
    .replace(new RegExp(`// #${excluded} MP-WEIXIN[\\s\\S]*?// #endif`, 'g'), '')
    .replace(/^import watermarkImage.*$/m, 'const watermarkImage = "/static/images/watermark.png"')
  const output = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const exports = {}
  runInNewContext(output, {
    exports,
    uni,
    setTimeout: overrides.setTimeout || setTimeout,
    clearTimeout: overrides.clearTimeout || clearTimeout,
  })
  return { getWatermarkedImage: exports.getWatermarkedImage, state, canvas }
}

test('loads the packaged watermark through a local user file on Android', async () => {
  const { getWatermarkedImage, state, canvas } = createHarness()
  const result = await getWatermarkedImage('https://example.com/photo.jpg', { userName: '测试账号' })
  assert.match(result, /watermarked/)
  assert.deepEqual(state.reads, ['static/images/watermark.png'])
  assert.deepEqual(state.loads, ['wxfile://tmp/photo.jpg', 'wxfile://usr/qc-image-watermark.png'])
  assert.equal(state.exports[0].userName, '测试账号')
  assert.deepEqual([state.exports[0].width, state.exports[0].height], [2560, 1920])
  assert.deepEqual([canvas.width, canvas.height], [1, 1])
})

test('reports the image and stage when Android onerror provides no argument', async () => {
  const { getWatermarkedImage, canvas } = createHarness({
    loadImage: image => image.onerror(),
  })
  await assert.rejects(getWatermarkedImage('https://example.com/bad.jpg'), (error) => {
    assert.equal(error.name, 'Error')
    assert.equal(error.stage, '加载原图')
    assert.match(error.message, /wxfile:\/\/tmp\/bad\.jpg/)
    return true
  })
  assert.equal(canvas.width, 1)
})

test('identifies watermark decoding failures separately from source image failures', async () => {
  const { getWatermarkedImage } = createHarness({
    loadImage: (image, path) => path.startsWith('wxfile://usr/') ? image.onerror() : image.onload(),
  })
  await assert.rejects(getWatermarkedImage('https://example.com/photo.jpg'), /加载水印图失败.*qc-image-watermark\.png/)
})

test('serializes different images until each canvas export has finished', async () => {
  const { getWatermarkedImage, state } = createHarness()
  const results = await Promise.all([
    getWatermarkedImage('https://example.com/first.jpg', { userName: '甲' }),
    getWatermarkedImage('https://example.com/second.jpg', { userName: '乙' }),
  ])
  assert.equal(state.maxActive, 1)
  assert.notEqual(results[0], results[1])
  assert.equal(state.exports[0].drawn[0], 'wxfile://tmp/first.jpg')
  assert.equal(state.exports[0].userName, '甲')
  assert.equal(state.exports[1].drawn[0], 'wxfile://tmp/second.jpg')
  assert.equal(state.exports[1].userName, '乙')
  assert.equal(state.reads.length, 1)
})

test('deduplicates repeated preview and save requests', async () => {
  const { getWatermarkedImage, state } = createHarness()
  const first = getWatermarkedImage('https://example.com/photo.jpg', { userName: '甲' })
  const second = getWatermarkedImage('https://example.com/photo.jpg', { userName: '甲' })
  assert.equal(first, second)
  await Promise.all([first, second])
  assert.equal(state.exports.length, 1)
})

test('allows retry after a failed watermark file preparation', async () => {
  let attempts = 0
  const { getWatermarkedImage } = createHarness({
    readFile(options) {
      attempts += 1
      if (attempts === 1)
        options.fail({ errMsg: 'readFile:fail' })
      else
        options.success({ data: new ArrayBuffer(8) })
    },
  })
  await assert.rejects(getWatermarkedImage('https://example.com/photo.jpg'), /读取水印资源失败.*readFile:fail/)
  assert.match(await getWatermarkedImage('https://example.com/photo.jpg'), /watermarked/)
})

test('preserves getImageInfo failures such as an unconfigured download domain', async () => {
  const { getWatermarkedImage, state } = createHarness({
    getImageInfo: options => options.fail({ errMsg: 'getImageInfo:fail url not in domain list' }),
  })
  await assert.rejects(getWatermarkedImage('https://example.com/photo.jpg'), /获取原图信息失败.*url not in domain list/)
  assert.equal(state.exports.length, 0)
})

test('releases a stalled image request and allows the next queued image to finish', async () => {
  const { getWatermarkedImage } = createHarness({
    loadImage(image, path) {
      if (!path.endsWith('stalled.jpg'))
        image.onload()
    },
    setTimeout: callback => setImmediate(callback),
    clearTimeout: handle => clearImmediate(handle),
  })
  const stalled = getWatermarkedImage('https://example.com/stalled.jpg')
  const next = getWatermarkedImage('https://example.com/next.jpg')
  await assert.rejects(stalled, /加载原图失败.*图片加载超时/)
  assert.match(await next, /watermarked/)
})

test('reports export failures and releases the canvas for retry', async () => {
  let attempts = 0
  const { getWatermarkedImage, canvas } = createHarness({
    exportImage(options) {
      attempts += 1
      if (attempts === 1)
        options.fail({ errMsg: 'canvasToTempFilePath:fail' })
      else
        options.success({ tempFilePath: 'wxfile://tmp/retried.jpg' })
    },
  })
  await assert.rejects(getWatermarkedImage('https://example.com/photo.jpg'), /导出水印图片失败.*canvasToTempFilePath:fail/)
  assert.equal(canvas.width, 1)
  assert.equal(await getWatermarkedImage('https://example.com/photo.jpg'), 'wxfile://tmp/retried.jpg')
})

test('roots package source paths instead of resolving them against the detail page', async () => {
  const { getWatermarkedImage, state } = createHarness({
    getImageInfo: options => options.success({ path: 'static/images/photo.png', width: 800, height: 600 }),
    loadImage: image => image.onload(),
  })
  await getWatermarkedImage('/static/images/photo.png')
  assert.equal(state.loads[0], '/static/images/photo.png')
})

test('keeps the existing source passthrough on other platforms', async () => {
  const { getWatermarkedImage, state } = createHarness({}, 'H5')
  const result = await getWatermarkedImage('https://example.com/photo.jpg')
  assert.equal(result, 'https://example.com/photo.jpg')
  assert.equal(state.loads.length, 0)
})

test('uses an OBS server thumbnail before Canvas sees the reported 9449-pixel source', async () => {
  const original = 'https://huanhua.obs.cn-south-1.myhuaweicloud.com:443/2098359545782091777.JPG'
  const { getWatermarkedImage, state } = createHarness({
    getImageInfo(options) {
      if (options.src === original)
        options.success({ path: 'wxfile://tmp/oversized.jpg', width: 9449, height: 9449 })
      else
        options.success({ path: 'wxfile://tmp/thumbnail.jpg', width: 2560, height: 2560 })
    },
    loadImage(image, path) {
      if (path.endsWith('oversized.jpg'))
        image.onerror()
      else
        image.onload()
    },
  })
  await getWatermarkedImage(original)
  assert.deepEqual(state.imageInfoRequests, [`${original}?x-image-process=image/resize,l_2560,limit_1`])
  assert.equal(state.loads[0], 'wxfile://tmp/thumbnail.jpg')
  assert.equal(state.compressions.length, 0)
  assert.deepEqual([state.exports[0].width, state.exports[0].height], [2560, 2560])
})

test('shrinks large images from other hosts before decoding them in Canvas', async () => {
  const { getWatermarkedImage, state } = createHarness({
    getImageInfo(options) {
      if (options.src === 'wxfile://tmp/resized.jpg')
        options.success({ path: options.src, width: 2560, height: 1280 })
      else
        options.success({ path: 'wxfile://tmp/oversized.jpg', width: 10000, height: 5000 })
    },
  })
  await getWatermarkedImage('https://example.com/large.jpg')
  assert.deepEqual(state.compressions, [{ src: 'wxfile://tmp/oversized.jpg', width: 2560, height: 1280 }])
  assert.equal(state.loads[0], 'wxfile://tmp/resized.jpg')
  assert.deepEqual([state.exports[0].width, state.exports[0].height], [2560, 1280])
})

test('keeps signed OBS queries intact and uses native shrinking for large files', async () => {
  const original = 'https://bucket.obs.cn-south-1.myhuaweicloud.com/large.jpg?AccessKeyId=example&Signature=example'
  const { getWatermarkedImage, state } = createHarness({
    getImageInfo(options) {
      const edge = options.src === original ? 9449 : 2560
      options.success({ path: options.src === original ? 'wxfile://tmp/oversized.jpg' : options.src, width: edge, height: edge })
    },
  })
  await getWatermarkedImage(original)
  assert.equal(state.imageInfoRequests[0], original)
  assert.equal(state.compressions.length, 1)
  assert.equal(state.loads[0], 'wxfile://tmp/resized.jpg')
})

test('falls back to native shrinking if the OBS bucket rejects image processing', async () => {
  const original = 'https://bucket.obs.cn-south-1.myhuaweicloud.com/large.jpg'
  const { getWatermarkedImage, state } = createHarness({
    getImageInfo(options) {
      if (options.src.includes('x-image-process='))
        options.fail({ errMsg: 'getImageInfo:fail 403' })
      else if (options.src === original)
        options.success({ path: 'wxfile://tmp/oversized.jpg', width: 9449, height: 9449 })
      else
        options.success({ path: options.src, width: 2560, height: 2560 })
    },
  })
  await getWatermarkedImage(original)
  assert.equal(state.imageInfoRequests[1], original)
  assert.equal(state.compressions.length, 1)
  assert.equal(state.loads[0], 'wxfile://tmp/resized.jpg')
})

test('reports native shrinking failures before allocating or loading the source in Canvas', async () => {
  const { getWatermarkedImage, state, canvas } = createHarness({
    getImageInfo: options => options.success({ path: 'wxfile://tmp/oversized.jpg', width: 9449, height: 9449 }),
    compressImage: options => options.fail({ errMsg: 'compressImage:fail' }),
  })
  await assert.rejects(getWatermarkedImage('https://example.com/large.jpg'), /缩小原图失败.*compressImage:fail/)
  assert.equal(state.loads.length, 0)
  assert.equal(canvas.width, 1)
})

test('rejects an oversized compression result instead of decoding it in Canvas', async () => {
  const { getWatermarkedImage, state } = createHarness({
    getImageInfo: options => options.success({ path: options.src, width: 9449, height: 9449 }),
  })
  await assert.rejects(getWatermarkedImage('https://example.com/large.jpg'), /缩小原图失败.*9449×9449/)
  assert.equal(state.loads.length, 0)
})
