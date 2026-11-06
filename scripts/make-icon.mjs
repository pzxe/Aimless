// Renders public/favicon.svg to the desktop app icons:
//   build/icon.png  512×512
//   build/icon.ico  16, 24, 32, 48, 64, 128, 256 (PNG-compressed ICO entries)
// Uses the locally installed Google Chrome through playwright-core.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const svg = await readFile('public/favicon.svg', 'utf8')
await mkdir('build', { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })
const render = async (size) => {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `)
  await page.setContent(`<html><body style="margin:0;background:transparent">${sized}</body></html>`)
  const png = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } })
  await page.close()
  return png
}

/** Build an ICO file whose entries are PNG images (supported since Windows Vista). */
function buildIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(images.length, 4)
  const dir = Buffer.alloc(16 * images.length)
  let offset = header.length + dir.length
  images.forEach(({ size, data }, i) => {
    const e = i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, e) // 0 means 256
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1)
    dir.writeUInt8(0, e + 2) // palette
    dir.writeUInt8(0, e + 3) // reserved
    dir.writeUInt16LE(1, e + 4) // color planes
    dir.writeUInt16LE(32, e + 6) // bits per pixel
    dir.writeUInt32LE(data.length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += data.length
  })
  return Buffer.concat([header, dir, ...images.map((i) => i.data)])
}

try {
  await writeFile('build/icon.png', await render(512))
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const images = []
  for (const size of sizes) images.push({ size, data: await render(size) })
  await writeFile('build/icon.ico', buildIco(images))
  console.log('saved build/icon.png and build/icon.ico')
} finally {
  await browser.close()
}
