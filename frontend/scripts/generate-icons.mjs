#!/usr/bin/env node
/* eslint-env node */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

// This script requires `sharp` to be installed as a devDependency.
// Usage: `npm run icons:gen`
// It will generate PNG icons (192/512) from the SVG logo.

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const svgPath = resolve(root, 'public/icons/converta-ja-logo-icon.svg')
const out192 = resolve(root, 'public/icons/icon-192.png')
const out512 = resolve(root, 'public/icons/icon-512.png')

if (!existsSync(svgPath)) {
  console.error('SVG not found at', svgPath)
  process.exit(1)
}

async function main() {
  const sharp = (await import('sharp')).default
  await sharp(svgPath, { density: 384 }) // higher density for quality
    .resize(192, 192)
    .png({ compressionLevel: 9 })
    .toFile(out192)
  await sharp(svgPath, { density: 1024 })
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(out512)
  console.log('Generated:', out192)
  console.log('Generated:', out512)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
