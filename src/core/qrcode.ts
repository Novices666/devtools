function tryJsQr(
  jsQr: (data: Uint8ClampedArray, width: number, height: number, options?: { inversionAttempts?: 'dontInvert' | 'onlyInvert' | 'attemptBoth' | 'invertFirst' }) => { data: string } | null,
  canvas: HTMLCanvasElement,
): string | undefined {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return undefined

  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  return jsQr(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' })?.data
}

async function tryZBar(canvas: HTMLCanvasElement): Promise<string | undefined> {
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return undefined

  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  const { scanImageData, ZBarSymbolType } = await import('@undecaf/zbar-wasm')
  const result = (await scanImageData(image)).find((symbol) => symbol.type === ZBarSymbolType.ZBAR_QRCODE)
  return result?.decode()
}

function createQrDecodeVariants(source: HTMLCanvasElement): HTMLCanvasElement[] {
  const variants: HTMLCanvasElement[] = []
  const scale = Math.min(2, 2048 / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return variants
  context.imageSmoothingEnabled = false
  context.drawImage(source, 0, 0, width, height)

  const image = context.getImageData(0, 0, width, height)
  for (let index = 0; index < image.data.length; index += 4) {
    const luminance = image.data[index] * 0.299 + image.data[index + 1] * 0.587 + image.data[index + 2] * 0.114
    const value = luminance < 180 ? 0 : 255
    image.data[index] = value
    image.data[index + 1] = value
    image.data[index + 2] = value
    image.data[index + 3] = 255
  }
  context.putImageData(image, 0, 0)
  variants.push(canvas)
  return variants
}

/**
 * 尝试多个本地解码器及二值化图像，以提升圆点、Logo 遮挡等异形二维码的识别率。
 */
export async function decodeQrCode(canvas: HTMLCanvasElement): Promise<string | undefined> {
  try {
    const result = await tryZBar(canvas)
    if (result) return result
  } catch {
    // ZBar 的 WebAssembly 加载失败时，继续使用 JavaScript 解码器。
  }

  const jsQrModule = await import('jsqr')
  const jsQr = jsQrModule.default
  const variants = [canvas, ...createQrDecodeVariants(canvas)]

  for (const variant of variants) {
    const result = tryJsQr(jsQr, variant)
    if (result) return result
  }

  return undefined
}
