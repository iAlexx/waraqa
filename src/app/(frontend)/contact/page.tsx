import type { Metadata } from 'next'

import { ComingSoonPage } from '@/components/layout/coming-soon-page'
import { loadPublicSiteSettings } from '@/lib/public/site-settings'

export const metadata: Metadata = {
  title: 'تواصل',
  description: 'تواصل مع فريق ورقة.',
}

export default async function ContactPage() {
  const settings = await loadPublicSiteSettings()

  const bits: string[] = [
    'تقدر تتواصل معنا عبر القنوات الظاهرة أدناه لما تكون مضبوطة في إعدادات الموقع.',
  ]
  if (settings.contactEmail) bits.push(`البريد: ${settings.contactEmail}`)
  if (settings.supportPhone) bits.push(`الهاتف: ${settings.supportPhone}`)
  if (!settings.contactEmail && !settings.supportPhone) {
    bits.push('ما في بريد أو هاتف مضبوط حالياً في الإعدادات العامة.')
  }

  return (
    <ComingSoonPage
      title="تواصل"
      description={bits.join(' ')}
      phaseNote="نموذج تواصل متقدّم مش مطلوب بهالمرحلة."
    />
  )
}
