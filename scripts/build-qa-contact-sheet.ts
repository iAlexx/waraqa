/**
 * Build BEFORE/AFTER contact sheet for a Phase 2 QA revision.
 *
 * Usage:
 *   pnpm exec tsx scripts/build-qa-contact-sheet.ts round-05-final-brand-colors
 *   pnpm exec tsx scripts/build-qa-contact-sheet.ts round-04-wordmark-interlaced-star
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = path.resolve('docs/qa/phase-2')
const revision = process.argv[2]
if (!revision) {
  console.error('Usage: tsx scripts/build-qa-contact-sheet.ts <revision-folder-name>')
  process.exit(1)
}

const revDir = path.join(ROOT, 'revisions', revision)
const outPath = path.join(revDir, 'comparison-contact-sheet.png')
const round04 = path.join(ROOT, 'revisions', 'round-04-wordmark-interlaced-star')

const CELL_W = 480
const CELL_H = 280
const LABEL_H = 32
const GAP = 16
const MARGIN = 20

type Pair = {
  section: string
  beforePath?: string
  afterPath: string
  beforeCaption: string
  afterCaption: string
  beforeNote?: string
}

function pairsFor(revisionName: string): { title: string; pairs: Pair[] } {
  if (revisionName === 'round-05-final-brand-colors') {
    return {
      title: 'Phase 2 QA — Round 05: red wordmark removed (BEFORE Round 04 / AFTER Round 05)',
      pairs: [
        {
          section: 'Wordmark desktop',
          beforePath: path.join(round04, 'wordmark-aref-ruqaa-desktop.png'),
          afterPath: path.join(revDir, 'wordmark-aref-ruqaa-desktop.png'),
          beforeCaption: 'BEFORE — Round 04 red wordmark',
          afterCaption: 'AFTER — Round 05 approved green wordmark',
        },
        {
          section: 'Wordmark mobile',
          beforePath: path.join(round04, 'wordmark-aref-ruqaa-mobile.png'),
          afterPath: path.join(revDir, 'wordmark-aref-ruqaa-mobile.png'),
          beforeCaption: 'BEFORE — Round 04 red wordmark',
          afterCaption: 'AFTER — Round 05 approved green wordmark',
        },
        {
          section: 'Home desktop',
          beforePath: path.join(round04, 'home-shell-desktop-1440.png'),
          afterPath: path.join(revDir, 'home-shell-desktop-1440.png'),
          beforeCaption: 'BEFORE — Round 04 red wordmark',
          afterCaption: 'AFTER — Round 05 brand-900 wordmark',
        },
        {
          section: 'Home mobile',
          beforePath: path.join(round04, 'home-shell-mobile-390.png'),
          afterPath: path.join(revDir, 'home-shell-mobile-390.png'),
          beforeCaption: 'BEFORE — Round 04 red wordmark',
          afterCaption: 'AFTER — Round 05 brand-900 wordmark',
        },
        {
          section: 'Reversed on dark',
          beforePath: undefined,
          afterPath: path.join(revDir, 'wordmark-reversed-dark.png'),
          beforeCaption: 'BEFORE — Round 04 (red on dark)',
          afterCaption: 'AFTER — Round 05 ivory on brand-950',
          beforeNote: 'Round 04 reversed panel used default COLR red',
        },
        {
          section: 'Print ink',
          beforePath: undefined,
          afterPath: path.join(revDir, 'wordmark-ink-print.png'),
          beforeCaption: 'BEFORE — Round 04 (still red)',
          afterCaption: 'AFTER — Round 05 ink-950',
          beforeNote: 'Round 04 print panel used default COLR red',
        },
      ],
    }
  }

  // Legacy Round 04 sheet layout
  return {
    title: 'Phase 2 QA — Round 04 contact sheet (BEFORE / AFTER)',
    pairs: [
      {
        section: 'Home mobile',
        afterPath: path.join(revDir, 'home-shell-mobile-390.png'),
        beforeCaption: 'BEFORE — Round (not archived)',
        afterCaption: 'AFTER — Round 04',
        beforeNote: 'Prior home overwritten before versioning policy',
      },
      {
        section: 'Home desktop',
        afterPath: path.join(revDir, 'home-shell-desktop-1440.png'),
        beforeCaption: 'BEFORE — Round (not archived)',
        afterCaption: 'AFTER — Round 04',
        beforeNote: 'Prior home overwritten before versioning policy',
      },
      {
        section: 'Wordmark mobile',
        beforePath: path.join(ROOT, 'wordmark-lateef-mobile.png'),
        afterPath: path.join(revDir, 'wordmark-aref-ruqaa-mobile.png'),
        beforeCaption: 'BEFORE — Lateef (rejected)',
        afterCaption: 'AFTER — Round 04',
      },
      {
        section: 'Wordmark desktop',
        beforePath: path.join(ROOT, 'wordmark-lateef-desktop.png'),
        afterPath: path.join(revDir, 'wordmark-aref-ruqaa-desktop.png'),
        beforeCaption: 'BEFORE — Lateef (rejected)',
        afterCaption: 'AFTER — Round 04',
      },
      {
        section: 'Dark feature band',
        beforePath: path.join(ROOT, 'waraqa-star-dark.png'),
        afterPath: path.join(revDir, 'pattern-dark-band-desktop.png'),
        beforeCaption: 'BEFORE — compass star',
        afterCaption: 'AFTER — Round 04',
      },
      {
        section: 'Geometric divider',
        beforePath: path.join(ROOT, 'waraqa-star-light.png'),
        afterPath: path.join(revDir, 'geometric-divider.png'),
        beforeCaption: 'BEFORE — prior star motif',
        afterCaption: 'AFTER — Round 04',
      },
    ],
  }
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function cellImage(
  file: string | undefined,
  note?: string,
): Promise<Buffer> {
  if (!file || !fs.existsSync(file)) {
    const svg = `
<svg width="${CELL_W}" height="${CELL_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#eceff1"/>
  <text x="50%" y="46%" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="18" fill="#607d8b">BEFORE unavailable</text>
  <text x="50%" y="58%" text-anchor="middle" font-family="Segoe UI,sans-serif" font-size="13" fill="#90a4ae">${escapeXml(note || '')}</text>
</svg>`
    return sharp(Buffer.from(svg)).png().toBuffer()
  }

  return sharp(file)
    .resize(CELL_W, CELL_H, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer()
}

async function captionBar(text: string, bg: string): Promise<Buffer> {
  const svg = `
<svg width="${CELL_W}" height="${LABEL_H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="10" y="22" font-family="Segoe UI,sans-serif" font-size="14" font-weight="700" fill="#ffffff">${escapeXml(text)}</text>
</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function sectionBar(text: string, width: number): Promise<Buffer> {
  const svg = `
<svg width="${width}" height="28" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#f7faf8"/>
  <text x="8" y="19" font-family="Segoe UI,sans-serif" font-size="15" font-weight="600" fill="#0a3d37">${escapeXml(text)}</text>
</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function main() {
  if (!fs.existsSync(revDir)) {
    throw new Error(`Revision folder missing: ${revDir}`)
  }

  const { title, pairs } = pairsFor(revision)
  const rowWidth = MARGIN * 2 + CELL_W * 2 + GAP
  const rowHeight = 28 + LABEL_H + CELL_H
  const headerH = 52
  const totalH = headerH + pairs.length * (rowHeight + GAP) + MARGIN
  const totalW = rowWidth

  const composites: { input: Buffer; top: number; left: number }[] = []

  const headerSvg = `
<svg width="${totalW}" height="${headerH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#062f2b"/>
  <text x="20" y="32" font-family="Segoe UI,sans-serif" font-size="16" font-weight="700" fill="#fbf8f0">${escapeXml(title)}</text>
</svg>`
  composites.push({
    input: await sharp(Buffer.from(headerSvg)).png().toBuffer(),
    top: 0,
    left: 0,
  })

  let y = headerH + 8
  for (const pair of pairs) {
    composites.push({
      input: await sectionBar(pair.section, totalW),
      top: y,
      left: 0,
    })
    y += 28

    const beforeCap = await captionBar(pair.beforeCaption, '#5c6b68')
    const afterCap = await captionBar(pair.afterCaption, '#115149')
    const beforeImg = await cellImage(pair.beforePath, pair.beforeNote)
    const afterImg = await cellImage(pair.afterPath)

    composites.push({ input: beforeCap, top: y, left: MARGIN })
    composites.push({ input: afterCap, top: y, left: MARGIN + CELL_W + GAP })
    y += LABEL_H
    composites.push({ input: beforeImg, top: y, left: MARGIN })
    composites.push({ input: afterImg, top: y, left: MARGIN + CELL_W + GAP })
    y += CELL_H + GAP
  }

  await sharp({
    create: {
      width: totalW,
      height: totalH,
      channels: 3,
      background: { r: 247, g: 250, b: 248 },
    },
  })
    .composite(composites)
    .png()
    .toFile(outPath)

  console.log('wrote', outPath)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
