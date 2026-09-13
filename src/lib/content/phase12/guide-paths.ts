/**
 * Finite meaningful answer-path matrices for Phase 12 guides.
 */
import { evaluateGuide } from '@/lib/guide/evaluate'
import type { GuideAnswers } from '@/lib/guide/types'

import { PHASE12_PROCEDURES, type Phase12ProcedureDef } from './catalog'

export type Phase12GuidePath = {
  procedureSlug: string
  pathKey: string
  answers: GuideAnswers
  expectIncomplete?: boolean
  expectVariant?: string
  expectDocsInclude?: string[]
  expectDocsExclude?: string[]
  expectNoticesInclude?: string[]
}

function toGuideInput(proc: Phase12ProcedureDef) {
  if (!proc.guide) return null
  return {
    questions: proc.guide.questions.map((q) => ({
      key: q.key,
      questionType: q.questionType,
      prompt: q.prompt,
      helpText: q.helpText ?? null,
      required: q.required,
      active: true,
      options: (q.options ?? []).map((o) => ({ key: o.key, label: o.label })),
      visibleWhen: null,
    })),
    variants: proc.guide.variants.map((v) => ({
      key: v.key,
      title: v.title,
      explanation: v.explanation,
      active: true,
    })),
    notices: proc.notices.map((n) => ({
      key: n.key,
      title: n.title,
      body: n.body,
      severity: n.severity,
      active: true,
    })),
    rules: proc.guide.decisionRules.map((r) => ({
      key: r.key,
      priority: r.priority,
      active: true,
      explanation: r.explanation,
      when: {
        all: (r.when.all ?? []).map((c) => ({
          questionKey: c.questionKey,
          operator: c.operator,
          value: c.value ?? '',
        })),
      },
      effects: r.effects.map((e) => ({ type: e.type, targetKey: e.targetKey })),
    })),
    documents: proc.documents.map((d) => ({
      key: d.key,
      title: d.key,
      detail: d.condition ?? null,
      requirementType: d.requirementType,
    })),
    steps: proc.steps.map((s) => ({
      key: s.key,
      title: s.title,
      detail: s.description,
    })),
    fees: [] as Array<{ key: string; title: string; detail: string | null }>,
  }
}

/** All meaningful finite paths for procedures with guides. */
export function buildPhase12GuidePaths(): Phase12GuidePath[] {
  const paths: Phase12GuidePath[] = []

  paths.push(
    {
      procedureSlug: 'p12-demo-tx-secondary-equivalency',
      pathKey: 'arab_complete',
      answers: { certificate_origin: 'arab' },
      expectVariant: 'variant_arab',
      expectDocsExclude: ['doc_translation'],
      expectDocsInclude: ['doc_certificate', 'doc_transcript', 'doc_id', 'doc_pdf'],
      expectNoticesInclude: ['notice_fee_unknown', 'notice_intake_freshness'],
    },
    {
      procedureSlug: 'p12-demo-tx-secondary-equivalency',
      pathKey: 'non_arab_complete',
      answers: { certificate_origin: 'non_arab' },
      expectVariant: 'variant_non_arab',
      expectDocsInclude: ['doc_translation', 'doc_certificate'],
      expectNoticesInclude: ['notice_fee_unknown', 'notice_intake_freshness'],
    },
    {
      procedureSlug: 'p12-demo-tx-secondary-equivalency',
      pathKey: 'non_arab_missing_subjects',
      answers: { certificate_origin: 'non_arab', missing_core_subjects: 'yes' },
      expectVariant: 'variant_non_arab',
      expectDocsInclude: ['doc_translation'],
      expectNoticesInclude: ['notice_supplementary', 'notice_fee_unknown'],
    },
    {
      procedureSlug: 'p12-demo-tx-secondary-equivalency',
      pathKey: 'origin_unknown',
      answers: {},
      expectIncomplete: true,
    },
  )

  for (const purpose of ['general', 'property', 'marriage', 'vehicle'] as const) {
    const include =
      purpose === 'property'
        ? ['doc_property']
        : purpose === 'marriage'
          ? ['doc_marriage_id']
          : purpose === 'vehicle'
            ? ['doc_vehicle']
            : []
    const exclude = (['doc_property', 'doc_marriage_id', 'doc_vehicle'] as const).filter(
      (k) => !include.includes(k),
    )
    paths.push({
      procedureSlug: 'p12-demo-tx-poa-mission',
      pathKey: `purpose_${purpose}`,
      answers: { poa_purpose: purpose },
      expectVariant: `variant_${purpose}`,
      expectDocsInclude: ['doc_principal_id', 'doc_agent_id', ...include],
      expectDocsExclude: [...exclude],
      expectNoticesInclude: ['notice_fee_unknown', 'notice_validity'],
    })
  }

  paths.push(
    {
      procedureSlug: 'p12-demo-tx-marriage-mission',
      pathKey: 'wife_syrian',
      answers: { wife_syrian: 'yes' },
      expectVariant: 'variant_wife_syrian',
      expectDocsInclude: ['doc_wife_extract', 'doc_contract'],
      expectNoticesInclude: ['notice_fee_unknown', 'notice_syria_proxy'],
    },
    {
      procedureSlug: 'p12-demo-tx-marriage-mission',
      pathKey: 'wife_non_syrian',
      answers: { wife_syrian: 'no' },
      expectVariant: 'variant_wife_non_syrian',
      expectDocsExclude: ['doc_wife_extract'],
      expectDocsInclude: ['doc_contract'],
      expectNoticesInclude: ['notice_fee_unknown', 'notice_syria_proxy'],
    },
    {
      procedureSlug: 'p12-demo-tx-marriage-mission',
      pathKey: 'wife_unanswered',
      answers: {},
      expectIncomplete: true,
    },
  )

  for (const kind of ['individual', 'family', 'marriage', 'divorce', 'birth', 'death'] as const) {
    paths.push({
      procedureSlug: 'p12-demo-tx-civil-extract-mission',
      pathKey: `kind_${kind}`,
      answers: { doc_kind: kind },
      expectVariant: 'variant_selected_kind',
      expectDocsInclude: ['doc_id'],
      expectNoticesInclude: ['notice_fee_unknown'],
    })
  }

  for (const isMinor of ['yes', 'no'] as const) {
    for (const missingId of ['yes', 'no'] as const) {
      for (const longVal of ['yes', 'no'] as const) {
        paths.push({
          procedureSlug: 'p12-demo-tx-passport-renew-mission',
          pathKey: `minor_${isMinor}_id_${missingId}_long_${longVal}`,
          answers: {
            is_minor: isMinor,
            missing_national_id: missingId,
            want_long_validity: longVal,
          },
          expectVariant: isMinor === 'yes' ? 'variant_minor' : 'variant_adult',
          expectDocsInclude: [
            'doc_appointment',
            'doc_form',
            'doc_old_passport',
            'doc_photos',
            ...(isMinor === 'yes' ? ['doc_guardian'] : []),
            ...(missingId === 'yes' ? ['doc_national_id'] : []),
            ...(longVal === 'yes' ? ['doc_residence'] : []),
          ],
          expectDocsExclude: [
            ...(isMinor === 'no' ? ['doc_guardian'] : []),
            ...(missingId === 'no' ? ['doc_national_id'] : []),
            ...(longVal === 'no' ? ['doc_residence'] : []),
          ],
          expectNoticesInclude: ['notice_fee_unknown', 'notice_fingerprint'],
        })
      }
    }
  }

  return paths
}

export function assertPhase12GuidePath(path: Phase12GuidePath): void {
  const proc = PHASE12_PROCEDURES.find((p) => p.slug === path.procedureSlug)
  if (!proc?.guide) throw new Error(`No guide for ${path.procedureSlug}`)
  const input = toGuideInput(proc)
  if (!input) throw new Error('guide input missing')

  const result = evaluateGuide({ ...input, answers: path.answers })

  if (path.expectIncomplete) {
    if (result.ok !== false || result.reason !== 'incomplete_answers') {
      throw new Error(`${path.pathKey}: expected incomplete_answers`)
    }
    return
  }

  if (!result.ok) {
    throw new Error(`${path.pathKey}: guide failed (${result.reason}) ${result.message}`)
  }

  if (path.expectVariant) {
    if (result.variant?.key !== path.expectVariant) {
      throw new Error(
        `${path.pathKey}: expected variant ${path.expectVariant}, got ${result.variant?.key ?? 'null'}`,
      )
    }
  }

  const docKeys = new Set(result.documents.map((d) => d.key))
  for (const k of path.expectDocsInclude ?? []) {
    if (!docKeys.has(k)) throw new Error(`${path.pathKey}: missing doc ${k}`)
  }
  for (const k of path.expectDocsExclude ?? []) {
    if (docKeys.has(k)) throw new Error(`${path.pathKey}: unexpected doc ${k}`)
  }

  const noticeKeys = new Set(result.notices.map((n) => n.key))
  for (const k of path.expectNoticesInclude ?? []) {
    if (!noticeKeys.has(k)) throw new Error(`${path.pathKey}: missing notice ${k}`)
  }

  if (result.fees.length > 0) {
    throw new Error(`${path.pathKey}: unexpected fees ${result.fees.map((f) => f.key).join(',')}`)
  }
}

export function runAllPhase12GuidePathAssertions(): { pathCount: number } {
  const paths = buildPhase12GuidePaths()
  for (const p of paths) assertPhase12GuidePath(p)
  return { pathCount: paths.length }
}
