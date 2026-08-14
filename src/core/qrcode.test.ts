import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { PNG } from 'pngjs'
import { scanRGBABuffer, ZBarSymbolType } from '@undecaf/zbar-wasm'
import { decodeQrCode } from './qrcode'

const STYLED_QR_URL = 'https://alidocs.dingtalk.com/notable/query/view/v01Q35O8516Z9yzBl9V_A1GVdQ0_KXbNTQ0?dd_darkmode=true&dd_full_screen=true?utm_source=qrcode_query'

describe('二维码解析', () => {
  it('可解析圆点模块和 Logo 遮挡的二维码样本', async () => {
    const buffer = await readFile('public/fixtures/styled-qr-mchose.png')
    const image = PNG.sync.read(buffer)
    const symbols = await scanRGBABuffer(image.data.buffer, image.width, image.height)
    const qrCode = symbols.find((symbol) => symbol.type === ZBarSymbolType.ZBAR_QRCODE)

    expect(qrCode?.decode()).toBe(STYLED_QR_URL)
  })

  it('浏览器 Canvas 解码链路可解析同一异形二维码', async () => {
    const buffer = await readFile('public/fixtures/styled-qr-mchose.png')
    const image = PNG.sync.read(buffer)
    const context = {
      getImageData: () => ({ data: image.data, width: image.width, height: image.height }),
    }
    const canvas = {
      width: image.width,
      height: image.height,
      getContext: () => context,
    } as unknown as HTMLCanvasElement

    await expect(decodeQrCode(canvas)).resolves.toBe(STYLED_QR_URL)
  })
})
