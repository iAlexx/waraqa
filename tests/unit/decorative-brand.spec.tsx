import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import fs from 'node:fs'
import path from 'node:path'

import { BrandMark } from '@/components/brand/brand-mark'
import { INTERLACED_LAYERS, WaraqaStarMotif } from '@/components/brand/waraqa-star-motif'
import { GeometricPattern } from '@/components/decorative/geometric-pattern'
import { PatternedSurface } from '@/components/decorative/patterned-surface'
import { GeometricDivider } from '@/components/decorative/geometric-divider'

const starSvgPath = path.resolve('public/brand/waraqa-interlaced-star.svg')
const starDarkPath = path.resolve('public/brand/waraqa-interlaced-star-dark.svg')

describe('Waraqa interlaced star asset', () => {
  it('uses layered diamonds, not a single perimeter path', () => {
    const svg = fs.readFileSync(starSvgPath, 'utf8')
    expect(svg).toContain('viewBox="0 0 240 240"')
    expect(svg).toContain('stroke="#B58C42"')
    expect(svg).toContain('stroke-width="1.6"')
    expect(svg).toContain(INTERLACED_LAYERS.vertical)
    expect(svg).toContain(INTERLACED_LAYERS.horizontal)
    expect(svg).toContain('rotate(45 120 120)')
    expect(svg).toContain('rotate(-45 120 120)')
    expect(svg).toContain('cx="120"')
    expect(svg).toContain('cy="120"')
    expect(svg).toContain('r="10"')
    expect(svg).toContain(INTERLACED_LAYERS.outerTop)
    expect(svg).toContain(INTERLACED_LAYERS.outerRight)
    expect(svg).toContain(INTERLACED_LAYERS.outerBottom)
    expect(svg).toContain(INTERLACED_LAYERS.outerLeft)
    expect(svg).not.toMatch(/fill="#[0-9A-Fa-f]/)
    // Multiple path elements (layers), not one silhouette-only file
    expect((svg.match(/<path/g) || []).length).toBeGreaterThanOrEqual(6)
  })

  it('dark variant shares geometry with light gold stroke swap', () => {
    const light = fs.readFileSync(starSvgPath, 'utf8')
    const dark = fs.readFileSync(starDarkPath, 'utf8')
    expect(dark).toContain('stroke="#E6C97A"')
    expect(dark).toContain(INTERLACED_LAYERS.vertical)
    expect(dark).toContain('rotate(45 120 120)')
    expect(light).not.toContain('stroke="#E6C97A"')
  })

  it('rejected motif assets are gone', () => {
    expect(fs.existsSync(path.resolve('public/brand/waraqa-eight-point-star.svg'))).toBe(
      false,
    )
    expect(fs.existsSync(path.resolve('public/patterns/waraqa-star-light.svg'))).toBe(false)
    expect(fs.existsSync(path.resolve('public/patterns/waraqa-geometric-light.svg'))).toBe(
      false,
    )
  })
})

describe('WaraqaStarMotif', () => {
  it('is decorative with multiple diamond layers', () => {
    const { container } = render(<WaraqaStarMotif />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('viewBox')).toBe('0 0 240 240')
    expect(svg?.getAttribute('data-waraqa-motif')).toBe('interlaced-star')
    expect(container.querySelectorAll('[data-layer]').length).toBeGreaterThanOrEqual(8)
    expect(svg?.className.baseVal || svg?.getAttribute('class') || '').toContain(
      'pointer-events-none',
    )
  })
})

describe('GeometricPattern', () => {
  it('is aria-hidden and does not intercept pointer events', () => {
    const { container } = render(<GeometricPattern />)
    const layer = container.firstElementChild as HTMLElement
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.className).toContain('pointer-events-none')
  })
})

describe('PatternedSurface', () => {
  it('is calm by default without a pattern layer', () => {
    const { container } = render(
      <PatternedSurface variant="light">
        <p>سطح هادئ</p>
      </PatternedSurface>,
    )
    expect(screen.getByText('سطح هادئ')).toBeTruthy()
    expect(container.querySelector('[data-pattern-tone]')).toBeNull()
  })
})

describe('GeometricDivider', () => {
  it('is a compact horizontal composition with interlaced star', () => {
    const { container } = render(<GeometricDivider />)
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('[data-waraqa-motif="interlaced-star"]')).toBeTruthy()
  })
})

describe('BrandMark', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders real selectable Arabic text ورقة with wordmark font class', () => {
    const { container } = render(<BrandMark />)
    const el = screen.getByText('ورقة')
    expect(el).toBeTruthy()
    expect(el.className).toContain('font-wordmark')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('maps variants to brand colors and never uses danger/destructive/red', () => {
    const { rerender } = render(<BrandMark variant="primary" />)
    let el = screen.getByText('ورقة')
    expect(el.getAttribute('data-brand-variant')).toBe('primary')
    expect(el.className).toMatch(/brand-900|waraqa-wm-primary/)
    expect(el.className).not.toMatch(/danger|destructive|text-red|from-red|to-red/)

    rerender(<BrandMark variant="reversed" />)
    el = screen.getByText('ورقة')
    expect(el.getAttribute('data-brand-variant')).toBe('reversed')
    expect(el.className).toMatch(/ivory|waraqa-wm-reversed/)
    expect(el.className).not.toMatch(/danger|destructive|text-red/)

    rerender(<BrandMark variant="ink" />)
    el = screen.getByText('ورقة')
    expect(el.getAttribute('data-brand-variant')).toBe('ink')
    expect(el.className).toMatch(/ink-950|waraqa-wm-ink/)
    expect(el.className).not.toMatch(/danger|destructive|text-red/)
  })

  it('keeps variant color classes after a conflicting className', () => {
    render(<BrandMark variant="primary" className="text-danger text-red-600" />)
    const el = screen.getByText('ورقة')
    expect(el.className.indexOf('text-brand-900')).toBeGreaterThan(
      el.className.indexOf('text-danger'),
    )
  })
})

describe('Lateef rejection', () => {
  it('does not appear in frontend layout source', () => {
    const layout = fs.readFileSync(
      path.resolve('src/app/(frontend)/layout.tsx'),
      'utf8',
    )
    expect(layout).toContain('Aref_Ruqaa_Ink')
    expect(layout).not.toContain('Lateef')
  })
})

describe('Round 04 archive integrity', () => {
  it('keeps Round 04 revision files intact', () => {
    const dir = path.resolve(
      'docs/qa/phase-2/revisions/round-04-wordmark-interlaced-star',
    )
    expect(fs.existsSync(path.join(dir, 'home-shell-desktop-1440.png'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'wordmark-aref-ruqaa-desktop.png'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'README.md'))).toBe(true)
  })
})
