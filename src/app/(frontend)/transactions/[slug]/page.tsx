import type { Metadata } from 'next'

import { ComingSoonPage } from '@/components/layout/coming-soon-page'
import { getPayload } from 'payload'
import config from '@payload-config'
import { localizedString, type LocalizedLike } from '@/lib/public/localized'

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Phase 5 boundary: no full transaction page (Phase 7).
 * Resolves public-eligible title only for an honest placeholder.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return {
    title: 'معاملة',
    description: `تفاصيل المعاملة «${slug}» قادمة في مرحلة لاحقة.`,
    robots: { index: false, follow: false },
  }
}

export default async function TransactionPlaceholderPage({ params }: Props) {
  const { slug } = await params
  let title = slug
  let summary =
    'صفحة المعاملة التفصيلية والدليل التفاعلي قادمين لاحقاً. هالصفحة placeholder صريح — مو دليل جاهز.'

  try {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'transactions',
      locale: 'ar',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      where: {
        and: [
          { slug: { equals: slug } },
          { _status: { equals: 'published' } },
          { active: { equals: true } },
          { markedOutdated: { not_equals: true } },
          { workflowState: { not_equals: 'archived' } },
        ],
      },
    })
    const doc = result.docs[0]
    if (doc) {
      title = localizedString(doc.title as LocalizedLike) || slug
      const s = localizedString(doc.summary as LocalizedLike)
      if (s) summary = `${s} — صفحة التفاصيل الكاملة قادمة لاحقاً.`
    }
  } catch {
    // keep defaults
  }

  return (
    <ComingSoonPage
      title={title}
      description={summary}
      phaseNote="حدود المرحلة: Phase 7 = صفحة المعاملة الكاملة. Phase 8 = الدليل التفاعلي."
    />
  )
}
