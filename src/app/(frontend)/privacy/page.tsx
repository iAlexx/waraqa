import type { Metadata } from 'next'

import { ComingSoonPage } from '@/components/layout/coming-soon-page'

export const metadata: Metadata = {
  title: 'الخصوصية',
  description: 'سياسة الخصوصية — ورقة لا تجمع وثائق هوية عبر المنصة.',
}

export default function PrivacyPage() {
  return (
    <ComingSoonPage
      title="الخصوصية"
      description="ورقة ما بتجمع وثائق هوية عبر المنصة. سياسة الخصوصية التفصيلية قيد الإعداد."
      phaseNote="نص قانوني نهائي قادم — هالصفحة placeholder صريح."
    />
  )
}
