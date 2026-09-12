import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'

import { Transactions } from '@/collections/Transactions'

type NamedField = Field & { name?: string; dbName?: string; fields?: Field[]; tabs?: TabLike[] }
type TabLike = { label?: unknown; name?: string; fields?: Field[]; description?: string }

const EXPECTED_TOP_LEVEL_NAMES = [
  'title',
  'slug',
  'summary',
  'searchText',
  'publicationStatus',
  'category',
  'agency',
  'serviceCenters',
  'audiences',
  'eligibility',
  'aliases',
  'requiredDocuments',
  'steps',
  'fees',
  'estimatedDuration',
  'outcome',
  'prerequisiteProcedures',
  'sources',
  'claimBindings',
  'claimTrustOk',
  'lastReviewedAt',
  'internalNotes',
  'guideEnabled',
  'questions',
  'variants',
  'notices',
  'decisionRules',
  'workflowState',
  'contentClass',
  'active',
  'createdBy',
  'lastUpdatedBy',
  'publishedBy',
  'publishedAt',
] as const

const EXPECTED_DB_NAMES = {
  requiredDocuments: 'req_docs',
  steps: 'steps',
  fees: 'fees',
  sources: 'srcs',
  claimBindings: 'clm_b',
  questions: 'questions',
  variants: 'variants',
  notices: 'notices',
  decisionRules: 'dec_rules',
  workflowState: 'wf_state',
} as const

const EXPECTED_TAB_LABELS = [
  'الأساسيات',
  'محتوى الخدمة',
  'المتطلبات والخطوات',
  'الدليل التفاعلي',
  'المصادر والأدلة',
  'المراجعة والنشر',
  'إعدادات متقدمة',
] as const

function walkFields(fields: Field[] | undefined, visit: (field: NamedField) => void) {
  if (!fields) return
  for (const field of fields) {
    const f = field as NamedField
    visit(f)
    if (f.type === 'tabs' && Array.isArray(f.tabs)) {
      for (const tab of f.tabs) {
        walkFields(tab.fields, visit)
      }
    }
    if (Array.isArray(f.fields)) {
      walkFields(f.fields, visit)
    }
  }
}

function collectNamedFields(fields: Field[]): NamedField[] {
  const out: NamedField[] = []
  walkFields(fields, (f) => {
    if (typeof f.name === 'string' && f.name.length > 0) out.push(f)
  })
  return out
}

function tabLabels(fields: Field[]): string[] {
  const tabsField = fields.find((f) => f.type === 'tabs') as NamedField | undefined
  if (!tabsField?.tabs) return []
  return tabsField.tabs.map((t) => {
    if (typeof t.label === 'string') return t.label
    return String(t.label ?? '')
  })
}

describe('P11-A Transactions admin schema presentation', () => {
  it('exposes unnamed admin tabs with expected Arabic labels', () => {
    const tabsField = Transactions.fields.find((f) => f.type === 'tabs') as NamedField | undefined
    expect(tabsField).toBeTruthy()
    expect(tabsField?.name).toBeUndefined()

    for (const tab of tabsField?.tabs ?? []) {
      expect(tab.name).toBeUndefined()
    }

    expect(tabLabels(Transactions.fields)).toEqual([...EXPECTED_TAB_LABELS])
  })

  it('preserves all existing top-level data field names (flat shape)', () => {
    const named = collectNamedFields(Transactions.fields)
    const topLevel = new Set(named.map((f) => f.name as string))

    for (const name of EXPECTED_TOP_LEVEL_NAMES) {
      expect(topLevel.has(name), `missing field ${name}`).toBe(true)
    }

    for (const [name, dbName] of Object.entries(EXPECTED_DB_NAMES)) {
      const field = named.find((f) => f.name === name)
      expect(field, `field ${name}`).toBeTruthy()
      expect(field?.dbName).toBe(dbName)
    }
  })

  it('keeps guide / claimBindings / contentClass / workflow fields present', () => {
    const names = new Set(collectNamedFields(Transactions.fields).map((f) => f.name))
    expect(names.has('guideEnabled')).toBe(true)
    expect(names.has('questions')).toBe(true)
    expect(names.has('variants')).toBe(true)
    expect(names.has('notices')).toBe(true)
    expect(names.has('decisionRules')).toBe(true)
    expect(names.has('claimBindings')).toBe(true)
    expect(names.has('contentClass')).toBe(true)
    expect(names.has('workflowState')).toBe(true)
    expect(names.has('reviewDueAt')).toBe(true)
    expect(names.has('markedOutdated')).toBe(true)
    expect(names.has('archiveReason')).toBe(true)
  })

  it('places guide authoring under الدليل التفاعلي and claimBindings under المصادر والأدلة', () => {
    const tabsField = Transactions.fields.find((f) => f.type === 'tabs') as NamedField
    const byLabel = new Map(
      (tabsField.tabs ?? []).map((t) => [typeof t.label === 'string' ? t.label : '', t]),
    )

    const guideNames = new Set(
      collectNamedFields(byLabel.get('الدليل التفاعلي')?.fields ?? []).map((f) => f.name),
    )
    expect(guideNames.has('questions')).toBe(true)
    expect(guideNames.has('decisionRules')).toBe(true)
    expect(guideNames.has('guideEnabled')).toBe(false)

    const sourceNames = new Set(
      collectNamedFields(byLabel.get('المصادر والأدلة')?.fields ?? []).map((f) => f.name),
    )
    expect(sourceNames.has('sources')).toBe(true)
    expect(sourceNames.has('claimBindings')).toBe(true)

    const reviewNames = new Set(
      collectNamedFields(byLabel.get('المراجعة والنشر')?.fields ?? []).map((f) => f.name),
    )
    expect(reviewNames.has('lastReviewedAt')).toBe(true)
    expect(reviewNames.has('archiveReason')).toBe(true)
    expect(reviewNames.has('changeRequestComment')).toBe(true)

    const rootNames = new Set(
      Transactions.fields
        .filter((f) => f.type !== 'tabs')
        .map((f) => (f as NamedField).name)
        .filter(Boolean),
    )
    expect(rootNames.has('guideEnabled')).toBe(true)
    expect(rootNames.has('contentClass')).toBe(true)
    expect(rootNames.has('workflowState')).toBe(true)
    expect(rootNames.has('claimTrustOk')).toBe(true)
    expect(rootNames.has('archiveReason')).toBe(false)
  })

  it('does not change collection access control wiring', () => {
    expect(Transactions.access?.create).toBeTruthy()
    expect(Transactions.access?.update).toBeTruthy()
    expect(Transactions.access?.delete).toBeTruthy()
    expect(Transactions.access?.read).toBeTruthy()
    expect(typeof Transactions.access?.create).toBe('function')
    expect(typeof Transactions.access?.update).toBe('function')
    expect(typeof Transactions.access?.delete).toBe('function')
    expect(typeof Transactions.access?.read).toBe('function')
  })

  it('keeps contentClass sidebar presentation and options', () => {
    const field = collectNamedFields(Transactions.fields).find((f) => f.name === 'contentClass') as
      | (NamedField & {
          options?: Array<{ value: string }>
          admin?: { position?: string; description?: string }
          defaultValue?: string
        })
      | undefined
    expect(field).toBeTruthy()
    expect(field?.admin?.position).toBe('sidebar')
    expect(field?.defaultValue).toBe('QA_TEST')
    const values = (field?.options ?? []).map((o) => o.value)
    expect(values).toEqual(['PRODUCTION', 'DEMO', 'QA_TEST'])
    expect(field?.admin?.description).toMatch(/QA_TEST/)
    expect(field?.admin?.description).toMatch(/لا يثبت/)
  })
})
