import type { Metadata } from 'next'

import { ComingSoonPage } from '@/components/layout/coming-soon-page'

export const metadata: Metadata = {
  title: 'الشروط',
  description: 'شروط الاستخدام لمنصة ورقة الإرشادية.',
}

export default function TermsPage() {
  return (
    <ComingSoonPage
      title="الشروط"
      description="شروط الاستخدام التفصيلية قيد الإعداد. ورقة منصة إرشادية مستقلة — المعلومات للمساعدة وقد تتغير."
      phaseNote="نص قانوني نهائي قادم — هالصفحة placeholder صريح."
    />
  )
}
