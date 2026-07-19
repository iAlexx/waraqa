import type { Metadata } from 'next'

import { ComingSoonPage } from '@/components/layout/coming-soon-page'

export const metadata: Metadata = {
  title: 'عن ورقة',
  description: 'ورقة منصة إرشادية مستقلة — ليست موقعاً حكومياً.',
}

export default function AboutPage() {
  return (
    <ComingSoonPage
      title="عن ورقة"
      description="ورقة منصة إرشادية مستقلة بتساعدك تعرف شو المطلوب لمعاملتك. الصفحة التفصيلية قيد التجهيز."
      phaseNote="محتوى «عن ورقة» الكامل رح يتوسّع لاحقاً — هالنص مؤقت وواضح."
    />
  )
}
