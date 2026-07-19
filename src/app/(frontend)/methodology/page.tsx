import type { Metadata } from 'next'

import { ComingSoonPage } from '@/components/layout/coming-soon-page'

export const metadata: Metadata = {
  title: 'المنهجية',
  description: 'كيف نجمع ونتحقق من معلومات المعاملات على ورقة.',
}

export default function MethodologyPage() {
  return (
    <ComingSoonPage
      title="المنهجية"
      description="منهجية التحقق والمصادر قيد التوثيق للعامة. المبادئ الأساسية: مصدر لكل ادّعاء مهم، وتاريخ تحقق ظاهر."
      phaseNote="صفحة منهجية موسّعة قادمة — هالنص مؤقت."
    />
  )
}
