#!/usr/bin/env node
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

// Generate hero.avif from hero.jpg and optionally optimize OG
// Usage: npm run images:gen

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const heroJpg = resolve(root, 'public/hero.jpg')
const heroAvif = resolve(root, 'public/hero.avif')
const ogPng = resolve(root, 'public/icons/og-image.png')

if (!existsSync(heroJpg)) {
  console.error('hero.jpg not found at', heroJpg)
  process.exit(1)
}

async function main() {
  const sharp = (await import('sharp')).default
  await sharp(heroJpg)
    .avif({ quality: 55 })
    .toFile(heroAvif)
  console.log('Generated:', heroAvif)

  if (existsSync(ogPng)) {
    // Re-encode to ensure reasonable size (keep dimensions)
    await sharp(ogPng)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(ogPng)
    console.log('Optimized:', ogPng)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

