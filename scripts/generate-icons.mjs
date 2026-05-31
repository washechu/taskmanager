import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(__dirname, '../public/icons')

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#3b82f6"/>
  <path d="M 140 270 L 220 350 L 380 170"
    fill="none" stroke="white" stroke-width="48"
    stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`

const sizes = [
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 32,  name: 'favicon-32x32.png'   },
  { size: 16,  name: 'favicon-16x16.png'   },
]

await mkdir(outDir, { recursive: true })

for (const { size, name } of sizes) {
  const buf = Buffer.from(svg(size))
  await sharp(buf).resize(size, size).png().toFile(resolve(outDir, name))
  console.log(`✓ ${name}`)
}

// Also save the SVG itself for high-DPI displays
await writeFile(resolve(outDir, 'icon.svg'), svg(512).trim())
console.log('✓ icon.svg')

console.log('\nDone!')
