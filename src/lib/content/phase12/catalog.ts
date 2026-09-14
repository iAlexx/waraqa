/**
 * Phase 12 claim-first DEMO catalog.
 * Facts are paraphrased from opened primary/near-primary sources only.
 * No invented fees, durations, addresses, or official rules.
 */
import {
  PHASE12_CHECKED_AT,
  PHASE12_CLAIM_KEYS as K,
  PHASE12_SOURCE_URLS,
  PHASE12_STABLE,
} from './markers'

/** Evidence row for claims backed by more than one opened source. */
export type Phase12ClaimEvidence = {
  sourceSlug: string
  relationType: 'SUPPORTS' | 'CONTRADICTS'
}

export type Phase12ClaimDef = {
  key: string
  statement: string
  status: 'VERIFIED' | 'UNKNOWN' | 'CONFLICTED' | 'NEEDS_OFFICIAL_CONFIRMATION'
  publicationPermission: 'PUBLIC' | 'PUBLIC_WITH_WARNING' | 'INTERNAL_ONLY' | 'BLOCKED'
  /** Primary source. Also the default single SUPPORTS evidence row when `evidence` is omitted. */
  sourceSlug: string
  /**
   * Multi-source evidence. Required for CONFLICTED claims (needs at least one
   * SUPPORTS and one CONTRADICTS row). Omit for the common single-source case.
   */
  evidence?: Phase12ClaimEvidence[]
  /** When true, may be required on transaction publish bindings. */
  authoritativeCandidate: boolean
}

/** Evidence rows a claim should be seeded with (defaults to one SUPPORTS row). */
export function claimEvidenceRows(claim: Phase12ClaimDef): Phase12ClaimEvidence[] {
  if (claim.evidence && claim.evidence.length > 0) return claim.evidence
  return [{ sourceSlug: claim.sourceSlug, relationType: 'SUPPORTS' }]
}

export type Phase12SourceDef = {
  slug: string
  title: string
  sourceType: 'official_webpage' | 'announcement' | 'other'
  officialUrl: string
  agencySlug: string
  notes: string
  coveredSections: string[]
}

export type Phase12DocDef = {
  slug: string
  name: string
  documentType:
    | 'identity'
    | 'civil_record'
    | 'application'
    | 'photograph'
    | 'certificate'
    | 'approval'
    | 'contract'
    | 'form'
    | 'other'
  description?: string
}

/**
 * Optional processing-time estimate taken verbatim-in-meaning from a service page.
 * Absent whenever the opened source publishes no duration — never inferred.
 */
export type Phase12DurationDef = {
  minimum?: number
  maximum?: number
  unit: 'minutes' | 'business_days' | 'calendar_days'
  note?: string
}

export type Phase12ProcedureDef = {
  slug: string
  title: string
  aliases: string[]
  summary: string
  categorySlug: string
  agencySlug: string
  audiences: Array<'citizen' | 'resident' | 'student' | 'other'>
  eligibility: string
  outcome: string
  /** Primary citable source for the transaction. */
  sourceSlug: string
  /** Extra non-primary sources cited on the transaction (reconciled/superseded material). */
  supportingSourceSlugs?: string[]
  /** Claim keys required for authoritative sections we publish. */
  requiredClaimKeys: string[]
  /** Optional warning/uncertain claims bound non-required. */
  optionalClaimKeys: string[]
  /** Only set when the opened service page states a processing time. */
  estimatedDuration?: Phase12DurationDef
  documents: Array<{
    key: string
    docSlug: string
    requirementType: 'required' | 'optional' | 'conditional'
    condition?: string
    notes?: string
  }>
  steps: Array<{ key: string; title: string; description: string }>
  /** Always empty in Phase 12 — fee amounts not published on opened pages. */
  fees: []
  channelNote: string
  notices: Array<{
    key: string
    title: string
    body: string
    severity: 'info' | 'warning'
  }>
  guide: null | {
    questions: Array<{
      key: string
      questionType: 'boolean' | 'single'
      prompt: string
      helpText?: string
      required: boolean
      options?: Array<{ key: string; label: string }>
    }>
    variants: Array<{ key: string; title: string; explanation: string }>
    decisionRules: Array<{
      key: string
      priority: number
      explanation: string
      when: {
        all?: Array<{
          questionKey: string
          operator: 'equals' | 'notEquals' | 'includes' | 'exists'
          value?: string
        }>
      }
      effects: Array<{
        type:
          | 'includeDocument'
          | 'excludeDocument'
          | 'includeNotice'
          | 'selectVariant'
        targetKey: string
      }>
    }>
  }
  whySelected: string
  goldenDemo?: boolean
}

export const PHASE12_CATEGORIES = [
  {
    slug: PHASE12_STABLE.categoryEducation,
    name: 'تعليم وشهادات',
    description: 'معاملات دراسية ومعادلة شهادات — محتوى تجريبي للعرض.',
  },
  {
    slug: PHASE12_STABLE.categoryConsular,
    name: 'خدمات قنصلية',
    description: 'خدمات عبر البعثات الدبلوماسية — محتوى تجريبي للعرض.',
  },
  {
    slug: PHASE12_STABLE.categoryCivil,
    name: 'أحوال مدنية',
    description: 'وقائع مدنية وتوثيق — محتوى تجريبي للعرض.',
  },
  {
    slug: PHASE12_STABLE.categoryTravel,
    name: 'سفر وجوازات',
    description: 'جوازات سفر ووثائق سفر — محتوى تجريبي للعرض.',
  },
] as const

export const PHASE12_AGENCIES = [
  {
    slug: PHASE12_STABLE.agencyMoe,
    name: 'وزارة التربية والتعليم',
    shortName: 'التربية',
    type: 'ministry' as const,
    description: 'الجهة المشار إليها في إعلانات معادلة الشهادات الثانوية غير السورية (عبر سانا).',
  },
  {
    slug: PHASE12_STABLE.agencyMofa,
    name: 'وزارة الخارجية والمغتربين',
    shortName: 'الخارجية',
    type: 'ministry' as const,
    officialWebsite: 'https://mofaex.gov.sy/',
    description: 'بوابة الخدمات الرسمية للوزارة — مصدر صفحات الخدمات القنصلية.',
  },
] as const

export const PHASE12_SOURCES: Phase12SourceDef[] = [
  {
    slug: PHASE12_STABLE.sourceSanaEquivalency,
    title: 'سانا — إعلان وزارة التربية عن معادلة الشهادات الثانوية غير السورية',
    sourceType: 'announcement',
    officialUrl: PHASE12_SOURCE_URLS.sanaEquivalency,
    agencySlug: PHASE12_STABLE.agencyMoe,
    notes: `Opened ${PHASE12_CHECKED_AT}. Official Syrian Arab News Agency (SANA) reporting MoE statement dated 2026-08-01. Not a ministry webpage. Telegram original not separately archived. Superseded on supplementary exams by the later SANA clarification — kept as CONTRADICTS-side evidence, not removed.`,
    coveredSections: [
      'summary',
      'eligibility',
      'required_documents',
      'steps',
      'outcome',
      'service_centers',
      'other',
    ],
  },
  {
    slug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    title: 'سانا — توضيح وزارة التربية حول آلية معادلة الشهادات غير السورية (استقبال دائم وتسلسل التصديق)',
    sourceType: 'announcement',
    officialUrl: PHASE12_SOURCE_URLS.sanaEquivalencyAnan,
    agencySlug: PHASE12_STABLE.agencyMoe,
    notes: `Opened ${PHASE12_CHECKED_AT}. Later SANA item carrying the MoE clarification: year-round intake (including the university admission period), attestation chain (issuing education authority → issuing-country MFA → Syrian MFA), sworn Arabic translation for non-Arabic certificates, any person may submit a complete file, and cancellation of the Arabic + social studies complementary exams for foreign certificate holders. Preferred over the earlier announcement where the two differ.`,
    coveredSections: [
      'summary',
      'eligibility',
      'required_documents',
      'steps',
      'outcome',
      'service_centers',
      'other',
    ],
  },
  {
    slug: PHASE12_STABLE.sourceSanaSuppSuspension,
    title: 'سانا — تعليق الامتحان التكميلي للطلبة السوريين للعامين 2025-2026 و2026-2027',
    sourceType: 'announcement',
    officialUrl: PHASE12_SOURCE_URLS.sanaSuppSuspension,
    agencySlug: PHASE12_STABLE.agencyMoe,
    notes: `Opened ${PHASE12_CHECKED_AT}. Scope is narrow: Syrian students, school years 2025-2026 and 2026-2027. Used only for the scoped suspension claim and as CONTRADICTS evidence on the general supplementary-exam claim.`,
    coveredSections: ['summary', 'eligibility', 'other'],
  },
  {
    slug: PHASE12_STABLE.sourceMofaPoa,
    title: 'وزارة الخارجية — تنظيم الوكالات في البعثات الدبلوماسية',
    sourceType: 'official_webpage',
    officialUrl: PHASE12_SOURCE_URLS.mofaPoa,
    agencySlug: PHASE12_STABLE.agencyMofa,
    notes: `Opened ${PHASE12_CHECKED_AT}. Fee amounts deferred to «دليل الرسوم» (not transcribed). Page states same-day completion — recorded as a duration claim, no invented business-day range.`,
    coveredSections: [
      'summary',
      'eligibility',
      'required_documents',
      'steps',
      'duration',
      'outcome',
      'service_centers',
      'other',
    ],
  },
  {
    slug: PHASE12_STABLE.sourceMofaMarriage,
    title: 'وزارة الخارجية — أحوال مدنية / تسجيل الزواج',
    sourceType: 'official_webpage',
    officialUrl: PHASE12_SOURCE_URLS.mofaMarriage,
    agencySlug: PHASE12_STABLE.agencyMofa,
    notes: `Opened ${PHASE12_CHECKED_AT}. Fee amounts not listed on page body. Page states a 15–25 minute service time with a workload caveat, and a nationality-dependent personal attendance rule.`,
    coveredSections: [
      'summary',
      'eligibility',
      'required_documents',
      'steps',
      'duration',
      'outcome',
      'service_centers',
      'other',
    ],
  },
  {
    slug: PHASE12_STABLE.sourceMofaCivilExtract,
    title: 'وزارة الخارجية — استخراج وثيقة أحوال مدنية',
    sourceType: 'official_webpage',
    officialUrl: PHASE12_SOURCE_URLS.mofaCivilExtract,
    agencySlug: PHASE12_STABLE.agencyMofa,
    notes: `Opened ${PHASE12_CHECKED_AT}. Fee amount not published on the page. Same-day completion is stated on the service page and recorded as a duration claim.`,
    coveredSections: [
      'summary',
      'eligibility',
      'required_documents',
      'steps',
      'duration',
      'outcome',
      'service_centers',
      'other',
    ],
  },
  {
    slug: PHASE12_STABLE.sourceMofaPassportRenew,
    title: 'وزارة الخارجية — تجديد جواز السفر (بدل عن منتهي)',
    sourceType: 'official_webpage',
    officialUrl: PHASE12_SOURCE_URLS.mofaPassportRenew,
    agencySlug: PHASE12_STABLE.agencyMofa,
    notes: `Opened ${PHASE12_CHECKED_AT}. Fee amounts not listed on page body. No processing duration published — transaction intentionally carries no estimatedDuration.`,
    coveredSections: [
      'summary',
      'eligibility',
      'required_documents',
      'steps',
      'outcome',
      'service_centers',
      'other',
    ],
  },
]

export const PHASE12_CLAIMS: Phase12ClaimDef[] = [
  {
    key: K.eqChannel,
    statement:
      'تقديم طلبات معادلة الشهادات الثانوية غير السورية يتم عبر دوائر الامتحانات في مديريات التربية بالمحافظات.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalency,
    evidence: [
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalency, relationType: 'SUPPORTS' },
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan, relationType: 'SUPPORTS' },
    ],
    authoritativeCandidate: true,
  },
  {
    key: K.eqIntakeYearRound,
    statement:
      'استقبال طلبات معادلة الشهادات الثانوية غير السورية مستمر على مدار العام، ولا يتوقف خلال فترة التقدم للقبول الجامعي.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    authoritativeCandidate: true,
  },
  {
    key: K.eqAttestationChain,
    statement:
      'تصديق الشهادة وكشف المواد يتم وفق تسلسل: الجهة التعليمية المانحة للشهادة، ثم وزارة خارجية الدولة المانحة، ثم وزارة الخارجية والمغتربين السورية.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    authoritativeCandidate: true,
  },
  {
    key: K.eqDocsBase,
    statement:
      'الوثائق الأساسية للطلب: الشهادة الثانوية الأصلية، وكشف المواد (الدرجات)، وإثبات شخصية لصاحب الشهادة (هوية أو جواز سفر أو إخراج قيد مدني)، وملف إلكتروني PDF يجمع هذه الوثائق — على أن تكون الشهادة وكشف المواد مصدّقين وفق التسلسل المعتمد.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    evidence: [
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan, relationType: 'SUPPORTS' },
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalency, relationType: 'SUPPORTS' },
    ],
    authoritativeCandidate: true,
  },
  {
    key: K.eqDocsNonArab,
    statement:
      'إذا كانت الشهادة صادرة عن دولة غير عربية فتُرفق ترجمة عربية من مترجم محلّف، إضافة إلى تصديق الوثائق أصولاً.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    authoritativeCandidate: true,
  },
  {
    key: K.eqProxySubmitter,
    statement:
      'لا يُشترط حضور صاحب الشهادة شخصياً؛ يستطيع أي شخص تقديم الطلب نيابة عنه ما دامت الأوراق مكتملة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    authoritativeCandidate: true,
  },
  {
    key: K.eqConditionalAccept,
    statement:
      'يمكن قبول الطلب بشكل شرطي قبل استكمال التصديق، على ألا تُمنح وثيقة المعادلة إلا بعد استيفاء التصديقات والتحقق من صحة الوثائق لدى الجهة المانحة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalency,
    evidence: [
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalency, relationType: 'SUPPORTS' },
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan, relationType: 'SUPPORTS' },
    ],
    authoritativeCandidate: true,
  },
  {
    key: K.eqOutcome,
    statement:
      'نتيجة الإجراء وثيقة معادلة للشهادة الثانوية غير السورية تصدر عن وزارة التربية والتعليم بعد اكتمال التصديق والتحقق.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    evidence: [
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan, relationType: 'SUPPORTS' },
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalency, relationType: 'SUPPORTS' },
    ],
    authoritativeCandidate: true,
  },
  {
    key: K.eqSupplementaryExams,
    statement:
      'المصادر المفتوحة متعارضة حول امتحانات الاستكمال: إعلان سابق يذكر احتمال التقدم لامتحانات استكمال عند نقص مواد أساسية في الفرع، بينما يذكر توضيح لاحق إلغاء الامتحانات التكميلية في اللغة العربية والدراسات الاجتماعية لحاملي الشهادات الأجنبية، ويذكر مصدر ثالث تعليق الامتحان التكميلي للطلبة السوريين للعامين 2025-2026 و2026-2027. لا يمكن تأكيد ما ينطبق على حالتك إلا من دائرة الامتحانات.',
    status: 'CONFLICTED',
    publicationPermission: 'PUBLIC_WITH_WARNING',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalency,
    evidence: [
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalency, relationType: 'SUPPORTS' },
      { sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan, relationType: 'CONTRADICTS' },
      { sourceSlug: PHASE12_STABLE.sourceSanaSuppSuspension, relationType: 'CONTRADICTS' },
    ],
    authoritativeCandidate: false,
  },
  {
    key: K.eqArabicSocialCancel,
    statement:
      'وفق التوضيح اللاحق: أُلغيت الامتحانات التكميلية في مادتي اللغة العربية والدراسات الاجتماعية لحاملي الشهادات الأجنبية. هذا البند يتعارض مع إعلان أسبق، فتحقق منه قبل الاعتماد عليه.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC_WITH_WARNING',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    authoritativeCandidate: false,
  },
  {
    key: K.eqSuppSyrianSuspension,
    statement:
      'بند ضيق النطاق: عُلِّق الامتحان التكميلي للطلبة السوريين للعامين الدراسيين 2025-2026 و2026-2027. لا ينطبق خارج هذا النطاق الزمني ولا على غير الطلبة السوريين.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC_WITH_WARNING',
    sourceSlug: PHASE12_STABLE.sourceSanaSuppSuspension,
    authoritativeCandidate: false,
  },
  {
    key: K.eqFeeAmount,
    statement:
      'المصدر يذكر دفع «الرسم المالي المحدد» بعد تسليم الأوراق دون نشر مبلغ أو عملة في النص المقروء.',
    status: 'NEEDS_OFFICIAL_CONFIRMATION',
    publicationPermission: 'PUBLIC_WITH_WARNING',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalency,
    authoritativeCandidate: false,
  },
  {
    key: K.poaChannel,
    statement:
      'تنظيم الوكالات يتم عبر صالة الخدمات القنصلية في مبنى البعثة، مع حجز موعد عبر تطبيق المواعيد MOFA SY.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    authoritativeCandidate: true,
  },
  {
    key: K.poaEligibility,
    statement: 'المستفيدون من الخدمة: السوريون أو من في حكمهم، وكذلك الأجانب.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    authoritativeCandidate: true,
  },
  {
    key: K.poaDocsBase,
    statement:
      'الوثائق الأساسية: هوية أو جواز ساري للموكّل مع صورة، وصورة هوية أو جواز ساري للموكّل إليه. مقدم المعاملة هو صاحب العلاقة. لا يُنظَّم للسوري وكالة بموجب وثائقه الأجنبية إن كان لديه جنسية أخرى.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    authoritativeCandidate: true,
  },
  {
    key: K.poaDocsConditional,
    statement:
      'تُضاف وثائق حسب موضوع الوكالة: بيان قيد عقاري أو وكالة بيع قطعي للعقار، وصورة هوية الزوج/الزوجة للزواج، وبيان قيد مركبة للمركبة، وشهادة تسجيل شركة للشركات، ووصاية شرعية لوكالات القاصرين، وقوامة شرعية للمحجور عليه.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    authoritativeCandidate: true,
  },
  {
    key: K.poaValidity,
    statement:
      'صلاحية الوكالات الخارجية لقبولها في سورية وتصديقها من الخارجية: سنة ميلادية من تاريخ تنظيمها لدى البعثة؛ وبعد التصديق تُحفظ لدى الكاتب بالعدل بالسرعة الممكنة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    authoritativeCandidate: true,
  },
  {
    key: K.poaDuration,
    statement: 'صفحة الخدمة تذكر إنجاز تنظيم الوكالة في نفس اليوم.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    authoritativeCandidate: true,
  },
  {
    key: K.poaOutcome,
    statement: 'نتيجة الخدمة: نسخة من الوكالة ممهورة بلصاقة الطابع الإلكتروني تُسلَّم لصاحب العلاقة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    authoritativeCandidate: true,
  },
  {
    key: K.poaFeeAmount,
    statement: 'صفحة الخدمة تحيل إلى «دليل الرسوم» دون عرض مبلغ رقمي في نص الصفحة المقروء.',
    status: 'NEEDS_OFFICIAL_CONFIRMATION',
    publicationPermission: 'PUBLIC_WITH_WARNING',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    authoritativeCandidate: false,
  },
  {
    key: K.marChannel,
    statement:
      'تسجيل الزواج يتم عبر صالة التصديقات في البعثة مع حجز موعد عبر تطبيق MOFA SY، والتسليم مباشرة عبر الصالة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    authoritativeCandidate: true,
  },
  {
    key: K.marEligibility,
    statement: 'المستفيدون: السوريون ومن في حكمهم.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    authoritativeCandidate: true,
  },
  {
    key: K.marDocs,
    statement:
      'المطلوب: عقد زواج مبرم لدى الدوائر الشرعية المعترف بها في دولة الإقامة ومصدّق من خارجية الدولة المضيفة؛ صورتان عن بيان قيد فردي للزوجة إن كانت سورية (حديث ومصادق من الخارجية السورية، لم يمضِ عليه أكثر من ستة أشهر)؛ صورة عن هوية/جواز/إخراج قيد للزوج؛ صورة عن هوية/جواز الزوجة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    authoritativeCandidate: true,
  },
  {
    key: K.marAttendance,
    statement:
      'يحضر الزوج شخصياً إذا كان سورياً؛ وإذا لم يكن الزوج سورياً تحضر الزوجة السورية شخصياً.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    authoritativeCandidate: true,
  },
  {
    key: K.marInstruction,
    statement:
      'البعثة لا تسجّل الزواج في الدول الأجنبية؛ يلزم توكيل شخصين في سورية لتسجيل الزواج أصولاً داخل سورية.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    authoritativeCandidate: true,
  },
  {
    key: K.marDuration,
    statement:
      'صفحة الخدمة تذكر مدة إنجاز تتراوح بين 15 و25 دقيقة، وقد تطول حسب ضغط العمل في البعثة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    authoritativeCandidate: true,
  },
  {
    key: K.marOutcome,
    statement: 'نتيجة الخدمة: نسخة من بيان الزواج عليها لصاقة التصديق الإلكترونية من البعثة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    authoritativeCandidate: true,
  },
  {
    key: K.marFeeAmount,
    statement: 'الصفحة تذكر تسديد الرسوم وتحيل إلى دليل الرسوم دون مبلغ رقمي ظاهر في النص المقروء.',
    status: 'NEEDS_OFFICIAL_CONFIRMATION',
    publicationPermission: 'PUBLIC_WITH_WARNING',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    authoritativeCandidate: false,
  },
  {
    key: K.civChannel,
    statement:
      'استخراج وثيقة أحوال مدنية يتم عبر صالة التصديقات في البعثة مع حجز موعد عبر تطبيق MOFA SY.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaCivilExtract,
    authoritativeCandidate: true,
  },
  {
    key: K.civEligibility,
    statement: 'المستفيدون: المواطنون السوريون.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaCivilExtract,
    authoritativeCandidate: true,
  },
  {
    key: K.civDocKinds,
    statement:
      'تشمل الخدمة أنواعاً مثل بيان قيد فردي وعائلي وبيان زواج وطلاق وولادة ووفاة لاستخدامها في الخارج.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaCivilExtract,
    authoritativeCandidate: true,
  },
  {
    key: K.civDocs,
    statement:
      'المطلوب: صورة عن البطاقة الشخصية أو جواز السفر أو إخراج قيد مدني لا يتجاوز تاريخه ستة أشهر.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaCivilExtract,
    authoritativeCandidate: true,
  },
  {
    key: K.civDuration,
    statement: 'صفحة الخدمة تذكر إنجاز استخراج الوثيقة في نفس اليوم.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaCivilExtract,
    authoritativeCandidate: true,
  },
  {
    key: K.civOutcome,
    statement: 'نتيجة الخدمة: الوثيقة المدنية المطلوبة ممهورة بلصاقة الطابع الإلكتروني.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaCivilExtract,
    authoritativeCandidate: true,
  },
  {
    key: K.civFeeAmount,
    statement: 'مبلغ الرسم غير منشور في نص صفحة الخدمة المقروءة في هذا التدقيق.',
    status: 'NEEDS_OFFICIAL_CONFIRMATION',
    publicationPermission: 'PUBLIC_WITH_WARNING',
    sourceSlug: PHASE12_STABLE.sourceMofaCivilExtract,
    authoritativeCandidate: false,
  },
  {
    key: K.pasChannel,
    statement:
      'تجديد جواز السفر المنتهي يتم عبر منظومة إصدار الجوازات في البعثة، عبر صالة التصديقات، مع حجز موعد عبر تطبيق MOFA SY.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPassportRenew,
    authoritativeCandidate: true,
  },
  {
    key: K.pasEligibility,
    statement: 'المستفيدون: المواطنون السوريون ومن في حكمهم.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPassportRenew,
    authoritativeCandidate: true,
  },
  {
    key: K.pasDocs,
    statement:
      'المطلوب يشمل: صورة حجز الموعد من تطبيق MOFA SY؛ استمارة جواز مطبوعة بالألوان من التطبيق؛ الجواز المطلوب تجديده؛ صورتان شخصيتان ملونتان بخلفية بيضاء وملابس داكنة قياس 4×4؛ وإن لم يذكر الرقم الوطني على الجواز القديم يطلب صورة هوية سورية أو إخراج قيد؛ وشرط إضافي: نسخة عن الإقامة أو الفيزا لتمكين مدة صلاحية طويلة.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPassportRenew,
    authoritativeCandidate: true,
  },
  {
    key: K.pasMinorRules,
    statement:
      'للقاصر (أقل من 18): حضور الأب أو الجد لأب مع صورة عن جوازه. بصمة الأصابع إلزامية لصاحب الجواز بين 15 و70 عاماً. إذا قدّمت الأم الطلب: وصاية شرعية مصدّقة حديثة (أقل من ثلاثة أشهر) أو موافقة الولي. عند وفاة الأب أو سفره قد يحق للعم أو الأخ استخراج جواز القاصر بعد التدقيق.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPassportRenew,
    authoritativeCandidate: true,
  },
  {
    key: K.pasOutcome,
    statement:
      'نتيجة الخدمة: تجديد الجواز عبر منظومة إصدار الجوازات في البعثة بعد استكمال الإجراءات وتسديد الرسوم.',
    status: 'VERIFIED',
    publicationPermission: 'PUBLIC',
    sourceSlug: PHASE12_STABLE.sourceMofaPassportRenew,
    authoritativeCandidate: true,
  },
  {
    key: K.pasFeeAmount,
    statement: 'الصفحة تذكر تسديد الرسوم دون مبلغ رقمي ظاهر في النص المقروء.',
    status: 'NEEDS_OFFICIAL_CONFIRMATION',
    publicationPermission: 'PUBLIC_WITH_WARNING',
    sourceSlug: PHASE12_STABLE.sourceMofaPassportRenew,
    authoritativeCandidate: false,
  },
]

export const PHASE12_DOCUMENTS: Phase12DocDef[] = [
  {
    slug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-certificate`,
    name: 'الشهادة الثانوية الأصلية',
    documentType: 'certificate',
    description:
      'الشهادة الأصلية مصدّقة من الجهة التعليمية المانحة ثم خارجية الدولة المانحة ثم الخارجية السورية.',
  },
  {
    slug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-transcript`,
    name: 'كشف المواد والدرجات',
    documentType: 'other',
    description: 'يُصدَّق بنفس تسلسل تصديق الشهادة.',
  },
  {
    slug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-id`,
    name: 'إثبات شخصية',
    documentType: 'identity',
    description: 'هوية شخصية أو جواز سفر أو إخراج قيد مدني لصاحب الشهادة.',
  },
  {
    slug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-pdf`,
    name: 'ملف إلكتروني PDF',
    documentType: 'other',
    description: 'ملف PDF يتضمن جميع الوثائق.',
  },
  {
    slug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-translation`,
    name: 'ترجمة عربية من مترجم محلّف',
    documentType: 'other',
    description: 'للشهادات الصادرة عن دول غير عربية — ترجمة إلى العربية من مترجم محلّف.',
  },
  {
    slug: `${PHASE12_STABLE.txPoaMission}-doc-principal-id`,
    name: 'هوية أو جواز الموكّل',
    documentType: 'identity',
  },
  {
    slug: `${PHASE12_STABLE.txPoaMission}-doc-agent-id`,
    name: 'صورة هوية أو جواز الموكّل إليه',
    documentType: 'identity',
  },
  {
    slug: `${PHASE12_STABLE.txPoaMission}-doc-property`,
    name: 'بيان قيد عقاري أو وكالة بيع قطعي',
    documentType: 'other',
    description: 'لوكالات بيع العقار — وفق صفحة الخارجية.',
  },
  {
    slug: `${PHASE12_STABLE.txPoaMission}-doc-marriage-id`,
    name: 'صورة هوية الزوج/الزوجة',
    documentType: 'identity',
    description: 'لوكالات الزواج.',
  },
  {
    slug: `${PHASE12_STABLE.txPoaMission}-doc-vehicle`,
    name: 'بيان قيد مركبة',
    documentType: 'other',
  },
  {
    slug: `${PHASE12_STABLE.txPoaMission}-doc-company`,
    name: 'شهادة تسجيل شركة',
    documentType: 'certificate',
    description: 'لوكالات الشركات — وفق صفحة الخارجية.',
  },
  {
    slug: `${PHASE12_STABLE.txPoaMission}-doc-minor`,
    name: 'وصاية شرعية',
    documentType: 'approval',
    description: 'لوكالات القاصرين — وفق صفحة الخارجية.',
  },
  {
    slug: `${PHASE12_STABLE.txPoaMission}-doc-guardianship`,
    name: 'قوامة شرعية',
    documentType: 'approval',
    description: 'لوكالات المحجور عليه — وفق صفحة الخارجية.',
  },
  {
    slug: `${PHASE12_STABLE.txMarriageMission}-doc-contract`,
    name: 'عقد زواج مصدّق',
    documentType: 'contract',
  },
  {
    slug: `${PHASE12_STABLE.txMarriageMission}-doc-wife-extract`,
    name: 'بيان قيد فردي للزوجة السورية',
    documentType: 'civil_record',
    description: 'حديث ومصادق من الخارجية السورية — لم يمضِ عليه أكثر من ستة أشهر (صورتان).',
  },
  {
    slug: `${PHASE12_STABLE.txMarriageMission}-doc-husband-id`,
    name: 'هوية أو جواز أو إخراج قيد الزوج',
    documentType: 'identity',
  },
  {
    slug: `${PHASE12_STABLE.txMarriageMission}-doc-wife-id`,
    name: 'هوية أو جواز الزوجة',
    documentType: 'identity',
  },
  {
    slug: `${PHASE12_STABLE.txCivilExtractMission}-doc-id`,
    name: 'صورة بطاقة أو جواز أو إخراج قيد',
    documentType: 'identity',
    description: 'إخراج القيد لا يتجاوز تاريخه ستة أشهر.',
  },
  {
    slug: `${PHASE12_STABLE.txPassportRenewMission}-doc-appointment`,
    name: 'صورة حجز الموعد (MOFA SY)',
    documentType: 'other',
  },
  {
    slug: `${PHASE12_STABLE.txPassportRenewMission}-doc-form`,
    name: 'استمارة جواز ملونة من التطبيق',
    documentType: 'form',
  },
  {
    slug: `${PHASE12_STABLE.txPassportRenewMission}-doc-old-passport`,
    name: 'جواز السفر المنتهي',
    documentType: 'identity',
  },
  {
    slug: `${PHASE12_STABLE.txPassportRenewMission}-doc-photos`,
    name: 'صورتان شخصيتان 4×4',
    documentType: 'photograph',
  },
  {
    slug: `${PHASE12_STABLE.txPassportRenewMission}-doc-national-id`,
    name: 'صورة هوية أو إخراج قيد (إن لزم)',
    documentType: 'identity',
    description: 'عند غياب الرقم الوطني على الجواز القديم.',
  },
  {
    slug: `${PHASE12_STABLE.txPassportRenewMission}-doc-residence`,
    name: 'نسخة إقامة أو فيزا',
    documentType: 'other',
    description: 'شرط إضافي لمدة صلاحية طويلة وفق صفحة الخدمة.',
  },
  {
    slug: `${PHASE12_STABLE.txPassportRenewMission}-doc-guardian`,
    name: 'حضور الولي مع صورة جوازه / وصاية عند الاقتضاء',
    documentType: 'approval',
  },
]

const feeNotice = (key: string, body: string) => ({
  key,
  title: 'الرسوم غير منشورة رقمياً هنا',
  body,
  severity: 'warning' as const,
})

export const PHASE12_PROCEDURES: Phase12ProcedureDef[] = [
  {
    slug: PHASE12_STABLE.txSecondaryEquivalency,
    title: 'معادلة شهادة ثانوية غير سورية',
    aliases: ['معادلة بكالوريا أجنبية', 'معادلة شهادة ثانوية أجنبية'],
    summary:
      'إرشاد تجريبي مبني على إعلانات وزارة التربية والتعليم المنشورة عبر سانا حول معادلة الشهادات الثانوية غير السورية عبر دوائر الامتحانات في المحافظات. ورقة منصة مستقلة وليست جهة رسمية.',
    categorySlug: PHASE12_STABLE.categoryEducation,
    agencySlug: PHASE12_STABLE.agencyMoe,
    audiences: ['citizen', 'student'],
    eligibility:
      'الراغبون بمعادلة شهادة ثانوية غير سورية وفق الضوابط التي أعلنتها وزارة التربية والتعليم (عبر سانا). راجع دائرة الامتحانات في محافظتك لتأكيد ما ينطبق على حالتك.',
    outcome:
      'وثيقة معادلة تصدر بعد استيفاء التصديقات والتحقق؛ قد يُقبل الطلب شرطياً قبل اكتمال التصديق دون منح الوثيقة النهائية.',
    sourceSlug: PHASE12_STABLE.sourceSanaEquivalencyAnan,
    supportingSourceSlugs: [
      PHASE12_STABLE.sourceSanaEquivalency,
      PHASE12_STABLE.sourceSanaSuppSuspension,
    ],
    requiredClaimKeys: [
      K.eqChannel,
      K.eqIntakeYearRound,
      K.eqAttestationChain,
      K.eqDocsBase,
      K.eqDocsNonArab,
      K.eqProxySubmitter,
      K.eqConditionalAccept,
      K.eqOutcome,
    ],
    optionalClaimKeys: [
      K.eqFeeAmount,
      K.eqSupplementaryExams,
      K.eqArabicSocialCancel,
      K.eqSuppSyrianSuspension,
    ],
    // No estimatedDuration: year-round intake is not a processing time.
    documents: [
      {
        key: 'doc_certificate',
        docSlug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-certificate`,
        requirementType: 'required',
      },
      {
        key: 'doc_transcript',
        docSlug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-transcript`,
        requirementType: 'required',
      },
      {
        key: 'doc_id',
        docSlug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-id`,
        requirementType: 'required',
      },
      {
        key: 'doc_pdf',
        docSlug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-pdf`,
        requirementType: 'required',
      },
      {
        key: 'doc_translation',
        docSlug: `${PHASE12_STABLE.txSecondaryEquivalency}-doc-translation`,
        requirementType: 'conditional',
        condition: 'إذا كانت الشهادة صادرة عن دولة غير عربية.',
      },
    ],
    steps: [
      {
        key: 'step_prepare_docs',
        title: 'جهّز الوثائق',
        description:
          'الشهادة الثانوية الأصلية وكشف المواد وإثبات الشخصية، مع ملف PDF يجمع الوثائق كلها.',
      },
      {
        key: 'step_attestation_chain',
        title: 'أكمل تسلسل التصديق',
        description:
          'التصديق من الجهة التعليمية المانحة، ثم وزارة خارجية الدولة المانحة، ثم وزارة الخارجية والمغتربين السورية.',
      },
      {
        key: 'step_translate_if_needed',
        title: 'ترجمة إن لزم',
        description: 'للشهادات من دول غير عربية: ترجمة عربية من مترجم محلّف.',
      },
      {
        key: 'step_submit',
        title: 'قدّم الطلب وادفع الرسم المحدد',
        description:
          'التقديم في دائرة الامتحانات بمديرية التربية، والاستقبال مستمر على مدار العام. يمكن لأي شخص تقديم الملف نيابةً عنك إذا كانت الأوراق مكتملة. المبلغ غير منشور في نص المصدر — اسأل الجهة عن الرسم الحالي.',
      },
    ],
    fees: [],
    channelNote: 'دوائر الامتحانات في مديريات التربية بالمحافظات (وفق إعلانات سانا).',
    notices: [
      feeNotice(
        'notice_fee_unknown',
        'المصدر يذكر رسماً مالياً محدداً دون مبلغ. لا تعتمد أي رقم من منصات غير رسمية.',
      ),
      {
        key: 'notice_intake_year_round',
        title: 'الاستقبال مستمر على مدار العام',
        body: 'وفق التوضيح الأحدث، تقديم طلبات المعادلة متاح طوال العام ولا يتوقف خلال فترة التقدم للقبول الجامعي.',
        severity: 'info',
      },
      {
        key: 'notice_attestation_chain',
        title: 'تسلسل التصديق المطلوب',
        body: 'الجهة التعليمية المانحة ← وزارة خارجية الدولة المانحة ← وزارة الخارجية والمغتربين السورية. أي حلقة ناقصة قد تؤخر منح وثيقة المعادلة.',
        severity: 'info',
      },
      {
        key: 'notice_proxy_submitter',
        title: 'يمكن لغيرك تقديم الملف',
        body: 'لا يُشترط حضورك شخصياً؛ يستطيع أي شخص تقديم الطلب نيابةً عنك ما دامت الأوراق مكتملة.',
        severity: 'info',
      },
      {
        key: 'notice_supplementary_conflict',
        title: 'معلومات متعارضة حول الامتحانات التكميلية',
        body: 'إعلان أسبق يذكر احتمال امتحانات استكمال عند نقص مواد أساسية؛ وتوضيح لاحق يذكر إلغاء التكميلي في اللغة العربية والدراسات الاجتماعية لحاملي الشهادات الأجنبية؛ ومصدر ثالث يذكر تعليق الامتحان التكميلي للطلبة السوريين للعامين 2025-2026 و2026-2027. لا تبنِ قرارك على أي منها قبل تأكيد دائرة الامتحانات.',
        severity: 'warning',
      },
    ],
    guide: {
      questions: [
        {
          key: 'certificate_origin',
          questionType: 'single',
          prompt: 'هل شهادتك صادرة عن دولة عربية أم غير عربية؟',
          helpText: 'يؤثر على شرط الترجمة العربية من مترجم محلّف.',
          required: true,
          options: [
            { key: 'arab', label: 'دولة عربية' },
            { key: 'non_arab', label: 'دولة غير عربية' },
          ],
        },
        {
          key: 'missing_core_subjects',
          questionType: 'boolean',
          prompt: 'هل تعلم بوجود نقص محتمل في المواد الأساسية للفرع؟',
          helpText: 'إن لم تكن متأكداً اترك السؤال دون إجابة ثم راجع دائرة الامتحانات.',
          required: false,
        },
      ],
      variants: [
        {
          key: 'variant_arab',
          title: 'مسار شهادة من دولة عربية',
          explanation: 'بدون شرط الترجمة العربية المذكور للشهادات من دول غير عربية.',
        },
        {
          key: 'variant_non_arab',
          title: 'مسار شهادة من دولة غير عربية',
          explanation: 'يشمل ترجمة عربية من مترجم محلّف إضافة إلى تسلسل التصديق.',
        },
      ],
      decisionRules: [
        {
          key: 'rule_arab',
          priority: 10,
          explanation: 'شهادة من دولة عربية',
          when: { all: [{ questionKey: 'certificate_origin', operator: 'equals', value: 'arab' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_arab' },
            { type: 'excludeDocument', targetKey: 'doc_translation' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_intake_year_round' },
            { type: 'includeNotice', targetKey: 'notice_attestation_chain' },
            { type: 'includeNotice', targetKey: 'notice_proxy_submitter' },
          ],
        },
        {
          key: 'rule_non_arab',
          priority: 10,
          explanation: 'شهادة من دولة غير عربية',
          when: {
            all: [{ questionKey: 'certificate_origin', operator: 'equals', value: 'non_arab' }],
          },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_non_arab' },
            { type: 'includeDocument', targetKey: 'doc_translation' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_intake_year_round' },
            { type: 'includeNotice', targetKey: 'notice_attestation_chain' },
            { type: 'includeNotice', targetKey: 'notice_proxy_submitter' },
          ],
        },
        {
          key: 'rule_missing_subjects',
          priority: 20,
          explanation: 'تنبيه تعارض الامتحانات التكميلية عند نقص المواد',
          when: {
            all: [{ questionKey: 'missing_core_subjects', operator: 'equals', value: 'yes' }],
          },
          effects: [{ type: 'includeNotice', targetKey: 'notice_supplementary_conflict' }],
        },
      ],
    },
    whySelected:
      'Golden Demo: ثلاثة مصادر مقروءة بالكامل تسمح بنمذجة ادعاء متعارض حقيقي (الامتحانات التكميلية) إلى جانب ادعاءات موثّقة للقناة والوثائق وتسلسل التصديق، مع شفافية تامة حول الرسوم.',
    goldenDemo: true,
  },
  {
    slug: PHASE12_STABLE.txPoaMission,
    title: 'تنظيم وكالة في بعثة دبلوماسية سورية',
    aliases: ['وكالة عدلية في السفارة', 'تنظيم وكالة قنصلية'],
    summary:
      'إرشاد تجريبي من صفحة وزارة الخارجية الرسمية لتنظيم الوكالات لدى البعثة لاستخدامها داخل سورية.',
    categorySlug: PHASE12_STABLE.categoryConsular,
    agencySlug: PHASE12_STABLE.agencyMofa,
    audiences: ['citizen', 'resident', 'other'],
    eligibility: 'السوريون أو من في حكمهم، والأجانب — وفق صفحة الخدمة.',
    outcome: 'نسخة من الوكالة ممهورة بلصاقة الطابع الإلكتروني من البعثة.',
    sourceSlug: PHASE12_STABLE.sourceMofaPoa,
    requiredClaimKeys: [
      K.poaChannel,
      K.poaEligibility,
      K.poaDocsBase,
      K.poaDocsConditional,
      K.poaValidity,
      K.poaDuration,
      K.poaOutcome,
    ],
    optionalClaimKeys: [K.poaFeeAmount],
    estimatedDuration: {
      minimum: 0,
      maximum: 1,
      unit: 'calendar_days',
      note: 'عن صفحة الخدمة: إنجاز في نفس اليوم.',
    },
    documents: [
      {
        key: 'doc_principal_id',
        docSlug: `${PHASE12_STABLE.txPoaMission}-doc-principal-id`,
        requirementType: 'required',
      },
      {
        key: 'doc_agent_id',
        docSlug: `${PHASE12_STABLE.txPoaMission}-doc-agent-id`,
        requirementType: 'required',
      },
      {
        key: 'doc_property',
        docSlug: `${PHASE12_STABLE.txPoaMission}-doc-property`,
        requirementType: 'conditional',
        condition: 'إذا كانت الوكالة خاصة ببيع عقار.',
      },
      {
        key: 'doc_marriage_id',
        docSlug: `${PHASE12_STABLE.txPoaMission}-doc-marriage-id`,
        requirementType: 'conditional',
        condition: 'إذا كانت الوكالة خاصة بزواج.',
      },
      {
        key: 'doc_vehicle',
        docSlug: `${PHASE12_STABLE.txPoaMission}-doc-vehicle`,
        requirementType: 'conditional',
        condition: 'إذا كانت الوكالة خاصة بمركبة.',
      },
      {
        key: 'doc_company',
        docSlug: `${PHASE12_STABLE.txPoaMission}-doc-company`,
        requirementType: 'conditional',
        condition: 'إذا كانت الوكالة خاصة بشركة.',
      },
      {
        key: 'doc_minor',
        docSlug: `${PHASE12_STABLE.txPoaMission}-doc-minor`,
        requirementType: 'conditional',
        condition: 'إذا كانت الوكالة تتعلق بقاصر.',
      },
      {
        key: 'doc_guardianship',
        docSlug: `${PHASE12_STABLE.txPoaMission}-doc-guardianship`,
        requirementType: 'conditional',
        condition: 'إذا كانت الوكالة تتعلق بمحجور عليه.',
      },
    ],
    steps: [
      {
        key: 'step_book',
        title: 'احجز موعداً',
        description: 'حجز دور عبر تطبيق المواعيد MOFA SY.',
      },
      {
        key: 'step_attend',
        title: 'قدّم الطلب في الموعد',
        description: 'التقدم بالطلب وتقديم الأوراق الثبوتية في صالة الخدمات القنصلية.',
      },
      {
        key: 'step_pay',
        title: 'ادفع الرسوم',
        description: 'حسب دليل الرسوم لدى البعثة — المبلغ غير منشور في نص صفحة الخدمة هنا.',
      },
      {
        key: 'step_receive',
        title: 'استلم الوكالة',
        description: 'الحصول على نسخة ممهورة بلصاقة الطابع الإلكتروني، والإنجاز في نفس اليوم وفق صفحة الخدمة.',
      },
    ],
    fees: [],
    channelNote: 'صالة الخدمات القنصلية في مبنى البعثة.',
    notices: [
      feeNotice(
        'notice_fee_unknown',
        'الرسوم عبر دليل الرسوم القنصلية. لا يوجد مبلغ رقمي في صفحة الخدمة المقروءة.',
      ),
      {
        key: 'notice_validity',
        title: 'صلاحية سنة للمصادقة داخل سورية',
        body: 'بعد التصديق من الخارجية احفظ الوكالة لدى الكاتب بالعدل بالسرعة الممكنة.',
        severity: 'info',
      },
      {
        key: 'notice_unmodeled_poa',
        title: 'حالتك غير منمذجة هنا — راجع البعثة',
        body: 'صفحة الخدمة تذكر وثائق إضافية تختلف باختلاف موضوع الوكالة. إن لم يكن موضوعك ضمن الحالات المعروضة فاعتبر هذه القائمة غير مكتملة لحالتك، وتأكد من البعثة قبل الحضور.',
        severity: 'warning',
      },
    ],
    guide: {
      questions: [
        {
          key: 'poa_purpose',
          questionType: 'single',
          prompt: 'ما موضوع الوكالة؟',
          helpText: 'الوثائق الإضافية تختلف باختلاف الموضوع وفق صفحة الخدمة.',
          required: true,
          options: [
            { key: 'property', label: 'بيع عقار' },
            { key: 'marriage', label: 'زواج' },
            { key: 'vehicle', label: 'مركبة' },
            { key: 'company', label: 'شركة' },
            { key: 'minor', label: 'تتعلق بقاصر' },
            { key: 'guardianship', label: 'تتعلق بمحجور عليه' },
            { key: 'other_special', label: 'موضوع آخر غير المذكور أعلاه' },
          ],
        },
      ],
      variants: [
        {
          key: 'variant_property',
          title: 'وكالة عقار',
          explanation: 'يتطلب بيان قيد عقاري أو وكالة بيع قطعي حديثة مصدّقة.',
        },
        {
          key: 'variant_marriage',
          title: 'وكالة زواج',
          explanation: 'يتطلب صورة عن هوية الزوج/الزوجة.',
        },
        {
          key: 'variant_vehicle',
          title: 'وكالة مركبة',
          explanation: 'يتطلب بيان قيد مركبة حديثاً مصادقاً من الخارجية.',
        },
        {
          key: 'variant_company',
          title: 'وكالة شركة',
          explanation: 'يتطلب شهادة تسجيل الشركة وفق صفحة الخدمة.',
        },
        {
          key: 'variant_minor',
          title: 'وكالة تتعلق بقاصر',
          explanation: 'يتطلب وصاية شرعية وفق صفحة الخدمة.',
        },
        {
          key: 'variant_guardianship',
          title: 'وكالة تتعلق بمحجور عليه',
          explanation: 'يتطلب قوامة شرعية وفق صفحة الخدمة.',
        },
        {
          key: 'variant_other_special',
          title: 'موضوع غير منمذج — تأكيد رسمي مطلوب',
          explanation:
            'الوثائق الأساسية وحدها قد لا تكفي لموضوعك. صفحة الخدمة تحيل إلى وثائق إضافية حسب نوع الوكالة، لذلك لا نعتبر هذه القائمة مكتملة قبل مراجعة البعثة.',
        },
      ],
      decisionRules: [
        {
          key: 'rule_property',
          priority: 10,
          explanation: 'بيع عقار',
          when: { all: [{ questionKey: 'poa_purpose', operator: 'equals', value: 'property' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_property' },
            { type: 'includeDocument', targetKey: 'doc_property' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_validity' },
          ],
        },
        {
          key: 'rule_marriage',
          priority: 10,
          explanation: 'زواج',
          when: { all: [{ questionKey: 'poa_purpose', operator: 'equals', value: 'marriage' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_marriage' },
            { type: 'includeDocument', targetKey: 'doc_marriage_id' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_validity' },
          ],
        },
        {
          key: 'rule_vehicle',
          priority: 10,
          explanation: 'مركبة',
          when: { all: [{ questionKey: 'poa_purpose', operator: 'equals', value: 'vehicle' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_vehicle' },
            { type: 'includeDocument', targetKey: 'doc_vehicle' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_validity' },
          ],
        },
        {
          key: 'rule_company',
          priority: 10,
          explanation: 'شركة',
          when: { all: [{ questionKey: 'poa_purpose', operator: 'equals', value: 'company' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_company' },
            { type: 'includeDocument', targetKey: 'doc_company' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_validity' },
          ],
        },
        {
          key: 'rule_minor',
          priority: 10,
          explanation: 'تتعلق بقاصر',
          when: { all: [{ questionKey: 'poa_purpose', operator: 'equals', value: 'minor' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_minor' },
            { type: 'includeDocument', targetKey: 'doc_minor' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_validity' },
          ],
        },
        {
          key: 'rule_guardianship',
          priority: 10,
          explanation: 'تتعلق بمحجور عليه',
          when: {
            all: [{ questionKey: 'poa_purpose', operator: 'equals', value: 'guardianship' }],
          },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_guardianship' },
            { type: 'includeDocument', targetKey: 'doc_guardianship' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_validity' },
          ],
        },
        {
          key: 'rule_other_special',
          priority: 10,
          explanation: 'موضوع غير منمذج — لا يمكن تأكيد اكتمال القائمة',
          when: {
            all: [{ questionKey: 'poa_purpose', operator: 'equals', value: 'other_special' }],
          },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_other_special' },
            { type: 'includeNotice', targetKey: 'notice_unmodeled_poa' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_validity' },
          ],
        },
      ],
    },
    whySelected:
      'صفحة وزارة رسمية غنية؛ عائلات وثائق شرطية متعددة (عقار/زواج/مركبة/شركة/قاصر/محجور) مع مسار صريح للحالات غير المنمذجة بدل ادعاء اكتمال زائف.',
  },
  {
    slug: PHASE12_STABLE.txMarriageMission,
    title: 'تسجيل زواج عبر بعثة دبلوماسية سورية',
    aliases: ['تثبيت زواج في السفارة', 'تسجيل واقعة زواج خارج سورية'],
    summary:
      'إرشاد تجريبي من صفحة وزارة الخارجية لتسجيل واقعة زواج لدى البعثة ثم متابعة التسجيل داخل سورية.',
    categorySlug: PHASE12_STABLE.categoryCivil,
    agencySlug: PHASE12_STABLE.agencyMofa,
    audiences: ['citizen', 'resident'],
    eligibility: 'السوريون ومن في حكمهم.',
    outcome: 'نسخة من بيان الزواج عليها لصاقة التصديق الإلكترونية من البعثة.',
    sourceSlug: PHASE12_STABLE.sourceMofaMarriage,
    requiredClaimKeys: [
      K.marChannel,
      K.marEligibility,
      K.marDocs,
      K.marAttendance,
      K.marInstruction,
      K.marDuration,
      K.marOutcome,
    ],
    optionalClaimKeys: [K.marFeeAmount],
    estimatedDuration: {
      minimum: 15,
      maximum: 25,
      unit: 'minutes',
      note: 'عن صفحة الخدمة؛ قد تطول حسب ضغط العمل في البعثة.',
    },
    documents: [
      {
        key: 'doc_contract',
        docSlug: `${PHASE12_STABLE.txMarriageMission}-doc-contract`,
        requirementType: 'required',
      },
      {
        key: 'doc_wife_extract',
        docSlug: `${PHASE12_STABLE.txMarriageMission}-doc-wife-extract`,
        requirementType: 'conditional',
        condition: 'إذا كانت الزوجة سورية.',
      },
      {
        key: 'doc_husband_id',
        docSlug: `${PHASE12_STABLE.txMarriageMission}-doc-husband-id`,
        requirementType: 'required',
      },
      {
        key: 'doc_wife_id',
        docSlug: `${PHASE12_STABLE.txMarriageMission}-doc-wife-id`,
        requirementType: 'required',
      },
    ],
    steps: [
      {
        key: 'step_book',
        title: 'احجز موعداً',
        description: 'حجز دور عبر تطبيق المواعيد MOFA SY.',
      },
      {
        key: 'step_attend',
        title: 'احضر شخصياً وقدّم الأوراق',
        description:
          'يحضر الزوج شخصياً إذا كان سورياً؛ وإذا لم يكن الزوج سورياً تحضر الزوجة السورية شخصياً، مع تقديم الثبوتيات في الموعد.',
      },
      {
        key: 'step_pay',
        title: 'سدّد الرسوم',
        description: 'وفق دليل الرسوم — المبلغ غير معروض رقمياً في صفحة الخدمة هنا.',
      },
      {
        key: 'step_receive',
        title: 'استلم بيان الزواج',
        description:
          'الحصول على نسخة عليها لصاقة التصديق الإلكترونية؛ مدة الإنجاز على الصفحة بين 15 و25 دقيقة وقد تطول حسب ضغط العمل.',
      },
      {
        key: 'step_syria_register',
        title: 'أكمل التسجيل داخل سورية',
        description:
          'البعثة لا تسجّل الزواج في الدولة الأجنبية؛ يلزم توكيل شخصين في سورية للتسجيل أصولاً.',
      },
    ],
    fees: [],
    channelNote: 'صالة التصديقات في البعثة.',
    notices: [
      feeNotice(
        'notice_fee_unknown',
        'تسديد الرسوم مذكور دون مبلغ رقمي في النص المقروء من صفحة الخدمة.',
      ),
      {
        key: 'notice_syria_proxy',
        title: 'تسجيل داخل سورية عبر توكيل',
        body: 'يلزم توكيل شخصين في سورية لإتمام تسجيل الزواج أصولاً داخل الجمهورية.',
        severity: 'warning',
      },
      {
        key: 'notice_attendance_husband',
        title: 'الحضور الشخصي: الزوج',
        body: 'الزوج سوري — عليه الحضور شخصياً إلى البعثة لتسجيل الواقعة.',
        severity: 'info',
      },
      {
        key: 'notice_attendance_wife',
        title: 'الحضور الشخصي: الزوجة السورية',
        body: 'الزوج غير سوري — تحضر الزوجة السورية شخصياً إلى البعثة لتسجيل الواقعة.',
        severity: 'info',
      },
      {
        key: 'notice_no_syrian_party',
        title: 'لا يوجد طرف سوري في الواقعة',
        body: 'المستفيدون من الخدمة هم السوريون ومن في حكمهم. إذا لم يكن أي من الزوجين سورياً فراجع البعثة قبل الحضور، فالحضور الشخصي المذكور يفترض وجود طرف سوري.',
        severity: 'warning',
      },
    ],
    guide: {
      questions: [
        {
          key: 'husband_syrian',
          questionType: 'boolean',
          prompt: 'هل الزوج سوري؟',
          helpText: 'يحدد من يجب أن يحضر شخصياً إلى البعثة.',
          required: true,
        },
        {
          key: 'wife_syrian',
          questionType: 'boolean',
          prompt: 'هل الزوجة سورية؟',
          helpText: 'يؤثر على طلب بيان القيد الفردي المصادق.',
          required: true,
        },
      ],
      variants: [
        {
          key: 'variant_wife_syrian',
          title: 'زوجة سورية',
          explanation: 'يشمل بيان قيد فردي حديثاً مصادقاً (صورتان).',
        },
        {
          key: 'variant_wife_non_syrian',
          title: 'زوجة غير سورية',
          explanation: 'بدون شرط بيان القيد الفردي السوري المذكور للزوجة السورية.',
        },
      ],
      decisionRules: [
        {
          key: 'rule_wife_syrian',
          priority: 10,
          explanation: 'الزوجة سورية',
          when: { all: [{ questionKey: 'wife_syrian', operator: 'equals', value: 'yes' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_wife_syrian' },
            { type: 'includeDocument', targetKey: 'doc_wife_extract' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_syria_proxy' },
          ],
        },
        {
          key: 'rule_wife_non_syrian',
          priority: 10,
          explanation: 'الزوجة غير سورية',
          when: { all: [{ questionKey: 'wife_syrian', operator: 'equals', value: 'no' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_wife_non_syrian' },
            { type: 'excludeDocument', targetKey: 'doc_wife_extract' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_syria_proxy' },
          ],
        },
        {
          key: 'rule_attendance_husband',
          priority: 20,
          explanation: 'الزوج سوري — يحضر الزوج شخصياً',
          when: { all: [{ questionKey: 'husband_syrian', operator: 'equals', value: 'yes' }] },
          effects: [{ type: 'includeNotice', targetKey: 'notice_attendance_husband' }],
        },
        {
          key: 'rule_attendance_wife',
          priority: 20,
          explanation: 'الزوج غير سوري — تحضر الزوجة السورية شخصياً',
          when: { all: [{ questionKey: 'husband_syrian', operator: 'equals', value: 'no' }] },
          effects: [{ type: 'includeNotice', targetKey: 'notice_attendance_wife' }],
        },
        {
          key: 'rule_no_syrian_party',
          priority: 30,
          explanation: 'لا يوجد طرف سوري — راجع البعثة',
          when: {
            all: [
              { questionKey: 'husband_syrian', operator: 'equals', value: 'no' },
              { questionKey: 'wife_syrian', operator: 'equals', value: 'no' },
            ],
          },
          effects: [{ type: 'includeNotice', targetKey: 'notice_no_syrian_party' }],
        },
      ],
    },
    whySelected:
      'صفحة رسمية واضحة؛ قاعدة الحضور الشخصي المرتبطة بجنسية الزوج تعطي تفرعاً حقيقياً إلى جانب شرط بيان قيد الزوجة السورية، مع مدة إنجاز منشورة.',
  },
  {
    slug: PHASE12_STABLE.txCivilExtractMission,
    title: 'استخراج وثيقة أحوال مدنية عبر البعثة',
    aliases: ['بيان قيد من السفارة', 'إخراج قيد عبر البعثة'],
    summary:
      'إرشاد تجريبي من صفحة وزارة الخارجية لاستخراج وثائق الأحوال المدنية عبر البعثة للاستخدام في الخارج.',
    categorySlug: PHASE12_STABLE.categoryCivil,
    agencySlug: PHASE12_STABLE.agencyMofa,
    audiences: ['citizen', 'resident'],
    eligibility: 'المواطنون السوريون.',
    outcome: 'الوثيقة المطلوبة ممهورة بلصاقة الطابع الإلكتروني.',
    sourceSlug: PHASE12_STABLE.sourceMofaCivilExtract,
    requiredClaimKeys: [
      K.civChannel,
      K.civEligibility,
      K.civDocs,
      K.civDocKinds,
      K.civDuration,
      K.civOutcome,
    ],
    optionalClaimKeys: [K.civFeeAmount],
    estimatedDuration: {
      minimum: 0,
      maximum: 1,
      unit: 'calendar_days',
      note: 'عن صفحة الخدمة: إنجاز في نفس اليوم.',
    },
    documents: [
      {
        key: 'doc_id',
        docSlug: `${PHASE12_STABLE.txCivilExtractMission}-doc-id`,
        requirementType: 'required',
      },
    ],
    steps: [
      {
        key: 'step_book',
        title: 'احجز موعداً',
        description: 'حجز دور عبر تطبيق المواعيد MOFA SY.',
      },
      {
        key: 'step_attend',
        title: 'قدّم الثبوتيات',
        description: 'التقدم في الموعد مع صورة البطاقة أو الجواز أو إخراج قيد حديث.',
      },
      {
        key: 'step_receive',
        title: 'استلم الوثيقة',
        description:
          'الحصول على الوثيقة ممهورة بلصاقة الطابع الإلكتروني، والإنجاز في نفس اليوم وفق صفحة الخدمة.',
      },
    ],
    fees: [],
    channelNote: 'صالة التصديقات في البعثة.',
    notices: [
      feeNotice(
        'notice_fee_unknown',
        'مبلغ الرسم غير منشور في نص صفحة الخدمة المقروءة في هذا التدقيق.',
      ),
    ],
    guide: {
      questions: [
        {
          key: 'doc_kind',
          questionType: 'single',
          prompt: 'أي وثيقة أحوال مدنية تحتاج؟',
          helpText: 'الأنواع مذكورة في صفحة الخدمة؛ المتطلب الأساسي للثبوتية واحد.',
          required: true,
          options: [
            { key: 'individual', label: 'بيان قيد فردي' },
            { key: 'family', label: 'بيان عائلي' },
            { key: 'marriage', label: 'بيان زواج' },
            { key: 'divorce', label: 'بيان طلاق' },
            { key: 'birth', label: 'بيان ولادة' },
            { key: 'death', label: 'بيان وفاة' },
          ],
        },
      ],
      variants: [
        {
          key: 'variant_selected_kind',
          title: 'وثيقة أحوال مدنية عبر البعثة',
          explanation: 'نفس قناة التقديم والثبوتية الأساسية؛ يختلف نوع البيان المطلوب فقط.',
        },
      ],
      decisionRules: [
        {
          key: 'rule_individual',
          priority: 10,
          explanation: 'بيان قيد فردي',
          when: { all: [{ questionKey: 'doc_kind', operator: 'equals', value: 'individual' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_selected_kind' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
          ],
        },
        {
          key: 'rule_family',
          priority: 10,
          explanation: 'بيان عائلي',
          when: { all: [{ questionKey: 'doc_kind', operator: 'equals', value: 'family' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_selected_kind' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
          ],
        },
        {
          key: 'rule_marriage_kind',
          priority: 10,
          explanation: 'بيان زواج',
          when: { all: [{ questionKey: 'doc_kind', operator: 'equals', value: 'marriage' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_selected_kind' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
          ],
        },
        {
          key: 'rule_divorce',
          priority: 10,
          explanation: 'بيان طلاق',
          when: { all: [{ questionKey: 'doc_kind', operator: 'equals', value: 'divorce' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_selected_kind' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
          ],
        },
        {
          key: 'rule_birth',
          priority: 10,
          explanation: 'بيان ولادة',
          when: { all: [{ questionKey: 'doc_kind', operator: 'equals', value: 'birth' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_selected_kind' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
          ],
        },
        {
          key: 'rule_death',
          priority: 10,
          explanation: 'بيان وفاة',
          when: { all: [{ questionKey: 'doc_kind', operator: 'equals', value: 'death' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_selected_kind' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
          ],
        },
      ],
    },
    whySelected: 'صفحة رسمية؛ تغطية أنواع الوثائق ومدة إنجاز منشورة؛ دليل بسيط دون تفرعات وهمية للرسوم.',
  },
  {
    slug: PHASE12_STABLE.txPassportRenewMission,
    title: 'تجديد جواز سفر منتهٍ عبر البعثة',
    aliases: ['تجديد جواز بدل منتهي', 'تجديد جواز سفر في السفارة'],
    summary:
      'إرشاد تجريبي من صفحة وزارة الخارجية لتجديد جواز السفر المنتهي الصلاحية عبر البعثة الدبلوماسية.',
    categorySlug: PHASE12_STABLE.categoryTravel,
    agencySlug: PHASE12_STABLE.agencyMofa,
    audiences: ['citizen', 'resident'],
    eligibility: 'المواطنون السوريون ومن في حكمهم.',
    outcome: 'تجديد عبر منظومة إصدار الجوازات في البعثة بعد استكمال الإجراءات والرسوم.',
    sourceSlug: PHASE12_STABLE.sourceMofaPassportRenew,
    requiredClaimKeys: [K.pasChannel, K.pasEligibility, K.pasDocs, K.pasMinorRules, K.pasOutcome],
    optionalClaimKeys: [K.pasFeeAmount],
    // No estimatedDuration: the service page publishes no processing time.
    documents: [
      {
        key: 'doc_appointment',
        docSlug: `${PHASE12_STABLE.txPassportRenewMission}-doc-appointment`,
        requirementType: 'required',
      },
      {
        key: 'doc_form',
        docSlug: `${PHASE12_STABLE.txPassportRenewMission}-doc-form`,
        requirementType: 'required',
      },
      {
        key: 'doc_old_passport',
        docSlug: `${PHASE12_STABLE.txPassportRenewMission}-doc-old-passport`,
        requirementType: 'required',
      },
      {
        key: 'doc_photos',
        docSlug: `${PHASE12_STABLE.txPassportRenewMission}-doc-photos`,
        requirementType: 'required',
      },
      {
        key: 'doc_national_id',
        docSlug: `${PHASE12_STABLE.txPassportRenewMission}-doc-national-id`,
        requirementType: 'conditional',
        condition: 'إذا لم يذكر الرقم الوطني على الجواز القديم.',
      },
      {
        key: 'doc_residence',
        docSlug: `${PHASE12_STABLE.txPassportRenewMission}-doc-residence`,
        requirementType: 'conditional',
        condition: 'لتمكين مدة صلاحية طويلة وفق صفحة الخدمة.',
      },
      {
        key: 'doc_guardian',
        docSlug: `${PHASE12_STABLE.txPassportRenewMission}-doc-guardian`,
        requirementType: 'conditional',
        condition: 'إذا كان صاحب الجواز قاصراً (أقل من 18 عاماً).',
      },
    ],
    steps: [
      {
        key: 'step_book',
        title: 'احجز موعداً وجهّز الاستمارة',
        description: 'حجز عبر تطبيق MOFA SY وطباعة الاستمارة بالألوان.',
      },
      {
        key: 'step_attend',
        title: 'قدّم الطلب',
        description: 'التقدم في الموعد مع الأوراق الثبوتية.',
      },
      {
        key: 'step_biometrics',
        title: 'التوقيع والبصمة',
        description: 'أخذ توقيع وبصمة صاحب العلاقة الإلكترونيين على منظومة الجوازات عند الاقتضاء.',
      },
      {
        key: 'step_pay',
        title: 'سدّد الرسوم',
        description: 'المبلغ غير منشور رقمياً في نص صفحة الخدمة المقروءة.',
      },
    ],
    fees: [],
    channelNote: 'صالة التصديقات في البعثة.',
    notices: [
      feeNotice('notice_fee_unknown', 'تسديد الرسوم مذكور دون مبلغ رقمي في النص المقروء.'),
      {
        key: 'notice_fingerprint',
        title: 'بصمة الأصابع',
        body: 'إلزامية لصاحب الجواز بين 15 و70 عاماً وفق صفحة الخدمة.',
        severity: 'info',
      },
    ],
    guide: {
      questions: [
        {
          key: 'is_minor',
          questionType: 'boolean',
          prompt: 'هل صاحب الجواز قاصر (أقل من 18 عاماً)؟',
          required: true,
        },
        {
          key: 'missing_national_id',
          questionType: 'boolean',
          prompt: 'هل الرقم الوطني غير مذكور على الجواز القديم؟',
          required: true,
        },
        {
          key: 'want_long_validity',
          questionType: 'boolean',
          prompt: 'هل تريد تمكين مدة صلاحية طويلة عبر إبراز إقامة أو فيزا؟',
          helpText: 'الشرط مذكور في صفحة الخدمة كشرط إضافي.',
          required: true,
        },
      ],
      variants: [
        {
          key: 'variant_adult',
          title: 'تجديد لبالغ',
          explanation: 'بدون مسار الولاية الخاص بالقاصر.',
        },
        {
          key: 'variant_minor',
          title: 'تجديد لقاصر',
          explanation: 'يشمل حضور الولي/الوصاية وفق صفحة الخدمة.',
        },
      ],
      decisionRules: [
        {
          key: 'rule_adult',
          priority: 10,
          explanation: 'بالغ',
          when: { all: [{ questionKey: 'is_minor', operator: 'equals', value: 'no' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_adult' },
            { type: 'excludeDocument', targetKey: 'doc_guardian' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_fingerprint' },
          ],
        },
        {
          key: 'rule_minor',
          priority: 10,
          explanation: 'قاصر',
          when: { all: [{ questionKey: 'is_minor', operator: 'equals', value: 'yes' }] },
          effects: [
            { type: 'selectVariant', targetKey: 'variant_minor' },
            { type: 'includeDocument', targetKey: 'doc_guardian' },
            { type: 'includeNotice', targetKey: 'notice_fee_unknown' },
            { type: 'includeNotice', targetKey: 'notice_fingerprint' },
          ],
        },
        {
          key: 'rule_need_id',
          priority: 20,
          explanation: 'غياب الرقم الوطني',
          when: {
            all: [{ questionKey: 'missing_national_id', operator: 'equals', value: 'yes' }],
          },
          effects: [{ type: 'includeDocument', targetKey: 'doc_national_id' }],
        },
        {
          key: 'rule_has_id',
          priority: 20,
          explanation: 'الرقم الوطني موجود',
          when: {
            all: [{ questionKey: 'missing_national_id', operator: 'equals', value: 'no' }],
          },
          effects: [{ type: 'excludeDocument', targetKey: 'doc_national_id' }],
        },
        {
          key: 'rule_long_validity',
          priority: 30,
          explanation: 'مدة صلاحية طويلة',
          when: {
            all: [{ questionKey: 'want_long_validity', operator: 'equals', value: 'yes' }],
          },
          effects: [{ type: 'includeDocument', targetKey: 'doc_residence' }],
        },
        {
          key: 'rule_no_long_validity',
          priority: 30,
          explanation: 'بدون شرط الإقامة الطويل',
          when: {
            all: [{ questionKey: 'want_long_validity', operator: 'equals', value: 'no' }],
          },
          effects: [{ type: 'excludeDocument', targetKey: 'doc_residence' }],
        },
      ],
    },
    whySelected:
      'صفحة رسمية مفصّلة؛ تفرعات قاصر/رقم وطني/إقامة؛ ومثال صريح على إجراء بلا مدة منشورة فلا نخترع واحدة.',
  },
]

/** Deferred/rejected candidates for the audit document. */
export const PHASE12_DEFERRED_CANDIDATES = [
  {
    title: 'إصدار جواز سفر لأول مرة عبر البعثة',
    reason: 'مؤجلة لتفادي تكرار عائلة الجوازات؛ اخترنا تجديد المنتهي كتغطية أوضح للعرض.',
  },
  {
    title: 'تصديق وثائق داخل سورية عبر مكاتب الخارجية',
    reason: 'لم تُفتح صفحة الخدمة بالكامل في جلسة التدقيق بنفس عمق الصفحات الخمس المختارة.',
  },
  {
    title: 'رسوم جواز عبر أنجز / أرقام رسوم ثانوية',
    reason: 'أرقام رسوم من أخبار ثانوية دون جدول رسوم رسمي مفتوح — خطر اختلاق.',
  },
  {
    title: 'قبول جامعي عبر uni.sy',
    reason: 'الوصول محجوب/غير موثوق أثناء التدقيق (Cloudflare).',
  },
  {
    title: 'خدمات عبر ecsc.gov.sy',
    reason: 'انتهاء مهلة الجلب؛ لم تُعتمد كدليل.',
  },
  {
    title: 'تسجيل ولادات عبر البعثة',
    reason: 'مرشّحة جيدة لكن أُرجئت لإبقاء خمسة إجراءات متنوعة دون تكرار أحوال مدنية زائد.',
  },
] as const

export function getPhase12Procedure(slug: string): Phase12ProcedureDef | undefined {
  return PHASE12_PROCEDURES.find((p) => p.slug === slug)
}

export function getPhase12Source(slug: string): Phase12SourceDef | undefined {
  return PHASE12_SOURCES.find((s) => s.slug === slug)
}

export function countClaimsByStatus(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const c of PHASE12_CLAIMS) {
    out[c.status] = (out[c.status] ?? 0) + 1
  }
  return out
}
