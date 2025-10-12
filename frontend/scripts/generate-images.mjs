#!/usr/bin/env node
/* eslint-env node */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { rename } from 'node:fs/promises'

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
    // sharp does not allow the same input and output path
    const tmpPng = ogPng.replace(/\.png$/i, '.tmp.png')
    await sharp(ogPng)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(tmpPng)
    await rename(tmpPng, ogPng)
    console.log('Optimized:', ogPng)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
