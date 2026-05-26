import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const output = 'src-tauri/icons'
mkdirSync(output, { recursive: true })

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4)
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, checksum])
}

function png(width, height) {
  const rows = []
  const center = (width - 1) / 2
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4)
    row[0] = 0
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 4
      const dx = (x - center) / center
      const dy = (y - center) / center
      const distance = Math.sqrt(dx * dx + dy * dy)
      const inside = distance <= 0.9
      const highlight = x > width * 0.56 && y < height * 0.45
      row[offset] = inside ? (highlight ? 88 : 37) : 0
      row[offset + 1] = inside ? (highlight ? 145 : 92) : 0
      row[offset + 2] = inside ? (highlight ? 255 : 230) : 0
      row[offset + 3] = inside ? 255 : 0
    }
    rows.push(row)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [32, 128, 256, 512, 1024]) {
  writeFileSync(join(output, `${size}x${size}.png`), png(size, size))
}

writeFileSync(join(output, 'icon.png'), png(1024, 1024))

const icoImages = [32, 128, 256].map((size) => ({ size, bytes: png(size, size) }))
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(icoImages.length, 4)

let offset = header.length + icoImages.length * 16
const entries = icoImages.map(({ size, bytes }) => {
  const entry = Buffer.alloc(16)
  entry[0] = size === 256 ? 0 : size
  entry[1] = size === 256 ? 0 : size
  entry[2] = 0
  entry[3] = 0
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(bytes.length, 8)
  entry.writeUInt32LE(offset, 12)
  offset += bytes.length
  return entry
})

writeFileSync(join(output, 'icon.ico'), Buffer.concat([header, ...entries, ...icoImages.map((image) => image.bytes)]))
