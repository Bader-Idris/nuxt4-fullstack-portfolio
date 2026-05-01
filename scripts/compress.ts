import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { glob } from 'glob'
import sharp from 'sharp'
import ttf2woff2 from 'ttf2woff2'
import fs from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.join(__dirname, '..')

async function runCommand(command: string, args: string[]) {
  return new Promise((resolve) => {
    console.log(`Running: ${command} ${args.join(' ')}`)
    const proc = spawn(command, args, { stdio: 'inherit' })
    proc.on('close', (code) => {
      if (code === 0) resolve(true)
      else {
        console.warn(`Command ${command} failed with code ${code}. Skipping...`)
        resolve(false)
      }
    })
    proc.on('error', (err) => {
      console.warn(`Command ${command} not found or failed to start. Skipping...`)
      resolve(false)
    })
  })
}

/**
 * Models Optimization
 */
async function optimizeModels() {
  console.log('--- Optimizing Models ---')
  const files = await glob('**/*.glb', {
    cwd: rootDir,
    ignore: ['node_modules/**', 'dist/**', '.nuxt/**', '**/*-compressed.glb', 'android/**', 'ios/**']
  })

  for (const inputFile of files) {
    const fullInputPath = path.join(rootDir, inputFile)
    const outputFile = fullInputPath.replace('.glb', '-compressed.glb')
    
    console.log(`Processing: ${inputFile}`)
    
    // Step 1: Draco compression (Pure JS, always works)
    await runCommand('npx', [
      'gltf-transform', 'draco', fullInputPath, outputFile,
      '--method', 'edgebreaker',
      '--quantize-position', '14',
      '--quantize-normal', '10'
    ])

    // Step 2: Try KTX2 (UASTC) - Requires system binaries, might skip if missing
    await runCommand('npx', [
      'gltf-transform', 'uastc', outputFile, outputFile,
      '--level', '4',
      '--rdo', '4'
    ])
    
    console.log(`Finished processing: ${inputFile}`)
  }
}

/**
 * Textures Optimization
 */
async function optimizeTextures() {
  console.log('--- Optimizing Textures ---')
  
  const files = await glob('public/**/*.{png,jpg}', {
    cwd: rootDir,
    ignore: ['**/ui/**', '**/favicons/**', '**/social/**']
  })

  const defaultPreset = '--nowarn --2d --t2 --encode etc1s --qlevel 255 --assign_oetf srgb --target_type RGB'
  const presets: [RegExp, string][] = [
    [ /terrain\/terrain.png$/, '--nowarn --2d --t2 --encode uastc --genmipmap --assign_oetf linear --target_type RGB' ],
    [ /career\/.+png$/, '--nowarn --2d --t2 --encode uastc --assign_oetf srgb --target_type RG' ],
    // Add other presets as needed
  ]

  for (const file of files) {
    const input = path.join(rootDir, file)
    const output = input.replace(/\.(png|jpg)$/, '.ktx2')

    const presetMatch = presets.find(([regex]) => regex.test(file))
    const preset = presetMatch ? presetMatch[1] : defaultPreset

    try {
      // Try to use toktx if available
      await runCommand('toktx', [
        ...preset.split(' '),
        output,
        input
      ])
      console.log(`Optimized Texture: ${file} -> .ktx2`)
    } catch (err) {
      console.warn(`Skipping KTX2 for ${file} (toktx not found or failed). Fallback to WebP if needed.`)
      // Optional: Fallback to sharp WebP for standalone images if KTX2 fails
      if (file.includes('ui/')) {
         // UI already handled
      }
    }
  }

  // UI images to WebP
  const uiFiles = await glob('public/ui/**/*.{png,jpg}', { cwd: rootDir })
  for (const file of uiFiles) {
    const input = path.join(rootDir, file)
    const output = input.replace(/\.(png|jpg)$/, '.webp')
    await sharp(input).webp({ quality: 80 }).toFile(output)
    console.log(`Converted UI: ${file} -> ${path.basename(output)}`)
  }
}

/**
 * Font Optimization
 */
async function optimizeFonts() {
  console.log('--- Optimizing Fonts ---')
  const fontDirs = await glob('public/fonts/*/', { cwd: rootDir })
  
  for (const dir of fontDirs) {
    const fullDir = path.join(rootDir, dir)
    const ttfFiles = await glob('*.ttf', { cwd: fullDir })
    
    for (const ttfFile of ttfFiles) {
      const inputPath = path.join(fullDir, ttfFile)
      const outputPath = inputPath.replace('.ttf', '.woff2')
      
      const input = await fs.readFile(inputPath)
      await fs.writeFile(outputPath, ttf2woff2(input))
      console.log(`Converted Font: ${path.join(dir, ttfFile)} -> .woff2`)
    }

    // Purge legacy formats
    const legacyFiles = await glob('*.{eot,svg,woff,ttf}', { cwd: fullDir })
    for (const legacy of legacyFiles) {
      if (!legacy.endsWith('.woff2')) {
        await fs.unlink(path.join(fullDir, legacy))
        console.log(`Purged legacy font: ${path.join(dir, legacy)}`)
      }
    }
  }

  // Update all CSS/SCSS files in the project to point to woff2 only
  console.log('--- Updating Font References in Stylesheets ---')
  const stylesheetFiles = await glob('**/*.{css,scss}', {
    cwd: rootDir,
    ignore: ['node_modules/**', 'dist/**', '.nuxt/**']
  })

  for (const styleFile of stylesheetFiles) {
    const stylePath = path.join(rootDir, styleFile)
    let content = await fs.readFile(stylePath, 'utf8')
    let modified = false

    // Handle @font-face blocks robustly
    const newContent = content.replace(/@font-face\s*\{([\s\S]+?)\}/g, (match, body) => {
      // Find any woff2 reference
      const woff2Match = body.match(/url\(['"]?(.+?\.woff2)['"]?\)/)
      
      // If we don't have a woff2, but we have a ttf/woff that we know was converted
      // We'll try to swap it.
      if (!woff2Match) {
         const otherMatch = body.match(/url\(['"]?(.+?)\.(ttf|woff|eot|svg)['"]?\)/)
         if (otherMatch) {
            const baseUrl = otherMatch[1]
            modified = true
            let newBody = body.replace(/src:\s*[\s\S]+?;/g, '').trim()
            newBody = `  ${newBody}\n  src: url('${baseUrl}.woff2') format('woff2');`
            return `@font-face {\n${newBody}\n}`
         }
      } else {
         // We have woff2, just clean up other formats in the same src block
         const woff2Url = woff2Match[1]
         if (body.includes('.ttf') || body.includes('.woff') || body.includes('.eot')) {
            modified = true
            let newBody = body.replace(/src:\s*[\s\S]+?;/g, '').trim()
            newBody = `  ${newBody}\n  src: url('${woff2Url}') format('woff2');`
            return `@font-face {\n${newBody}\n}`
         }
      }
      return match
    })

    if (modified || newContent !== content) {
      await fs.writeFile(stylePath, newContent)
      console.log(`Updated Stylesheet: ${styleFile}`)
    }
  }
}

async function main() {
  await optimizeModels()
  await optimizeTextures()
  await optimizeFonts()
  console.log('--- Optimization Complete ---')
}

main().catch(console.error)
