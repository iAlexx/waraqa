import type { Metadata } from 'next'

import { ComingSoonPage } from '@/components/layout/coming-soon-page'

export const metadata: Metadata = {
  title: 'البحث',
  description: 'واجهة إدخال البحث — محرّك البحث العربي الكامل قادم في مرحلة لاحقة.',
  robots: { index: false, follow: false },
}

type SearchPageProps = {
  searchParams: Promise<{ q?: string }>
}

/**
 * Phase 5 search-entry destination only.
 * Does not normalize, rank, filter, or return search results (Phase 6).
 */
export default async function SearchPlaceholderPage({ searchParams }: SearchPageProps) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim() : ''

  return (
    <ComingSoonPage
      title="البحث — قريباً"
      description={
        q
          ? `استلمتا طلب البحث عن «${q}». محرّك البحث العربي والترتيب والنتائج رح يجهزوا لاحقاً — هالصفحة ما بتعرض نتائج وهمية.`
          : 'اكتب اسم المعاملة من الصفحة الرئيسية. محرّك البحث الكامل (تطبيع عربي، ترتيب، فلاتر) قادم في مرحلة لاحقة.'
      }
      phaseNote="حدود المرحلة: Phase 5 = نموذج البحث فقط. Phase 6 = محرّك البحث."
    />
  )
}
