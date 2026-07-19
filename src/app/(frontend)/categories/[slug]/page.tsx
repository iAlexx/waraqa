import type { Metadata } from 'next'

import { ComingSoonPage } from '@/components/layout/coming-soon-page'
import { loadPublicCategories } from '@/lib/public/categories'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { categories } = await loadPublicCategories()
  const match = categories.find((c) => c.slug === slug)
  return {
    title: match?.name || 'تصنيف',
    description: match?.description || 'صفحة تصنيف — قائمة المعاملات التفصيلية قادمة لاحقاً.',
  }
}

export default async function CategoryPlaceholderPage({ params }: Props) {
  const { slug } = await params
  const { categories } = await loadPublicCategories()
  const match = categories.find((c) => c.slug === slug)

  if (!match) {
    return (
      <ComingSoonPage
        title="التصنيف غير متاح"
        description="هاد التصنيف مش منشور للعامة أو غير موجود."
      />
    )
  }

  return (
    <ComingSoonPage
      title={match.name}
      description={
        match.description ||
        'قائمة المعاملات ضمن هاد التصنيف رح تظهر لما تكتمل صفحات التصفح والبحث.'
      }
      phaseNote={
        match.demoLabeled
          ? 'بيانات تجريبية / اختبار — مو بيانات رسمية.'
          : 'حدود المرحلة: صفحة التصنيف التفصيلية والفلاتر جزء من مراحل لاحقة (بحث/تصفح).'
      }
    />
  )
}
