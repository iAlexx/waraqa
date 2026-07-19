import { describe, expect, it } from 'vitest'

import {
  buildNormalizedSearchBlob,
  normalizeArabicQuery,
  normalizeArabicSearchText,
} from '@/lib/search/normalize'
import { RANK, compareRanked, scoreSearchMatch } from '@/lib/search/rank'
import { buildSearchHref, parseSearchParams } from '@/lib/search/params'
import {
  assertNoPrivateKeys,
  extractRankInput,
  mapPublicSearchResult,
} from '@/lib/search/map-result'
import { formatSearchResultCount } from '@/lib/search/result-count'
import { dedupeRankedByDocumentId } from '@/lib/search/dedupe'

describe('Arabic search normalization', () => {
  it('trims and collapses whitespace', () => {
    expect(normalizeArabicSearchText('  لا   حكم  عليه  ')).toBe('لا حكم عليه')
  })

  it('removes diacritics and tatweel', () => {
    expect(normalizeArabicSearchText('مُعَامَـلة')).toBe('معامله')
  })

  it('normalizes Alef forms', () => {
    expect(normalizeArabicSearchText('إخراج')).toBe('اخراج')
    expect(normalizeArabicSearchText('أحمد')).toBe('احمد')
    expect(normalizeArabicSearchText('آمال')).toBe('امال')
  })

  it('normalizes Ya and Kaf variants', () => {
    expect(normalizeArabicSearchText('على')).toBe('علي')
    expect(normalizeArabicSearchText('کتاب')).toBe('كتاب')
  })

  it('folds Arabic and Persian digits', () => {
    expect(normalizeArabicSearchText('١٢٣')).toBe('123')
    expect(normalizeArabicSearchText('۴۵')).toBe('45')
  })

  it('lowercases Latin and strips punctuation safely', () => {
    expect(normalizeArabicSearchText('Passport!!!')).toBe('passport')
  })

  it('buildNormalizedSearchBlob dedupes', () => {
    const blob = buildNormalizedSearchBlob(['إخراج قيد', 'اخراج قيد', 'سجل'])
    expect(blob).toBe('اخراج قيد سجل')
  })

  it('normalizeArabicQuery matches normalizeArabicSearchText', () => {
    expect(normalizeArabicQuery('أ')).toBe(normalizeArabicSearchText('أ'))
  })
})

describe('search ranking', () => {
  const base = {
    title: 'إخراج قيد نفوس',
    aliases: ['اخراج قيد', 'قيد فردي'],
    summary: 'ملخص تجريبي للمعاملة',
    categoryName: 'أحوال مدنية',
    agencyName: 'السجل المدني',
    serviceCenterNames: ['مركز دمشق'],
    slug: 'civil-record-extract',
  }

  it('ranks exact normalized title highest', () => {
    const a = scoreSearchMatch(base, 'اخراج قيد نفوس')
    const b = scoreSearchMatch(base, 'قيد')
    expect(a.score).toBe(RANK.EXACT_TITLE)
    expect(a.score).toBeLessThan(b.score)
  })

  it('ranks exact alias above contains', () => {
    const exact = scoreSearchMatch(base, 'اخراج قيد')
    expect(exact.reason).toBe('EXACT_ALIAS')
    const contains = scoreSearchMatch({ ...base, aliases: ['اخراج قيد نفوس طويل'] }, 'اخراج')
    expect(contains.score).toBeGreaterThan(exact.score)
  })

  it('matches related labels', () => {
    const r = scoreSearchMatch(base, 'أحوال مدنية')
    expect(r.reason).toBe('RELATED_LABEL')
  })

  it('compareRanked is stable by title then id', () => {
    const sorted = [
      { score: 40, title: 'ب', id: 2 },
      { score: 40, title: 'ا', id: 1 },
      { score: 10, title: 'ج', id: 3 },
    ].sort(compareRanked)
    expect(sorted[0].score).toBe(10)
    expect(sorted[1].title).toBe('ا')
  })
})

describe('search params', () => {
  it('parses and truncates long queries', () => {
    const long = 'ا'.repeat(200)
    const parsed = parseSearchParams({ q: long, page: '2' })
    expect(parsed.q.length).toBe(120)
    expect(parsed.errors).toContain('query_truncated')
    expect(parsed.page).toBe(2)
  })

  it('drops invalid filter slugs safely', () => {
    const parsed = parseSearchParams({
      q: 'جواز',
      category: '../etc',
      agency: 'ok-agency',
      center: '',
    })
    expect(parsed.categorySlug).toBeNull()
    expect(parsed.agencySlug).toBe('ok-agency')
    expect(parsed.serviceCenterSlug).toBeNull()
  })

  it('buildSearchHref preserves state', () => {
    expect(
      buildSearchHref({ q: 'جواز', category: 'passports', page: 2 }),
    ).toBe('/search?q=%D8%AC%D9%88%D8%A7%D8%B2&category=passports&page=2')
  })
})

describe('result mapping sanitization', () => {
  it('maps eligible docs and omits private keys', () => {
    const card = mapPublicSearchResult({
      id: 1,
      _status: 'published',
      active: true,
      markedOutdated: false,
      workflowState: 'published',
      title: 'معاملة تجريبية',
      slug: 'qa-demo',
      summary: 'ملخص',
      lastReviewedAt: '2026-01-01',
      category: { name: 'تصنيف' },
      agency: { name: 'جهة' },
      internalNotes: 'secret',
      searchText: 'secret blob',
    })
    expect(card).toBeTruthy()
    expect(assertNoPrivateKeys(card as unknown as Record<string, unknown>)).toEqual([])
    expect(card!.demoLabeled).toBe(true)
    expect(card!.href).toBe('/transactions/qa-demo')
  })

  it('rejects draft and archived', () => {
    expect(
      mapPublicSearchResult({
        id: 1,
        _status: 'draft',
        active: true,
        title: 'x',
        slug: 'x',
      }),
    ).toBeNull()
    expect(
      mapPublicSearchResult({
        id: 1,
        _status: 'published',
        active: true,
        workflowState: 'archived',
        title: 'x',
        slug: 'x',
      }),
    ).toBeNull()
  })

  it('extractRankInput reads aliases', () => {
    const input = extractRankInput({
      title: 'عنوان',
      summary: 'ملخص',
      slug: 'slug',
      aliases: [{ value: 'اسم بديل' }],
      category: { name: 'ك' },
      agency: { name: 'ج' },
      serviceCenters: [{ name: 'م' }],
    })
    expect(input.aliases).toEqual(['اسم بديل'])
    expect(input.serviceCenterNames).toEqual(['م'])
  })
})

describe('Arabic result count wording', () => {
  it('uses deterministic forms for 0–11+', () => {
    expect(formatSearchResultCount(0)).toBe('ما في نتائج')
    expect(formatSearchResultCount(1)).toBe('نتيجة واحدة')
    expect(formatSearchResultCount(2)).toBe('نتيجتان')
    expect(formatSearchResultCount(3)).toBe('3 نتائج')
    expect(formatSearchResultCount(10)).toBe('10 نتائج')
    expect(formatSearchResultCount(11)).toBe('11 نتيجة')
    expect(formatSearchResultCount(25)).toBe('25 نتيجة')
  })
})

describe('dedupeRankedByDocumentId', () => {
  it('keeps first occurrence and drops later same ids', () => {
    const out = dedupeRankedByDocumentId([
      { id: 1, title: 'a' },
      { id: 2, title: 'b' },
      { id: 1, title: 'a-dup' },
      { id: 3, title: 'c' },
    ])
    expect(out.map((x) => x.id)).toEqual([1, 2, 3])
    expect(out[0]?.title).toBe('a')
  })

  it('keeps different documents that share a title', () => {
    const out = dedupeRankedByDocumentId([
      { id: 10, title: 'نفس العنوان' },
      { id: 11, title: 'نفس العنوان' },
    ])
    expect(out).toHaveLength(2)
  })
})
