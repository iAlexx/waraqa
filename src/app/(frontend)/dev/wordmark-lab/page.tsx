import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { WordmarkLab } from '@/components/dev/wordmark-lab'

export const metadata: Metadata = {
  title: 'مختبر علامة ورقة | تطوير فقط',
  robots: {
    index: false,
    follow: false,
  },
}

export const dynamic = 'force-dynamic'

export default function WordmarkLabPage() {
  const allowQaCapture =
    process.env.ALLOW_DESIGN_SYSTEM_QA === '1' ||
    process.env.ALLOW_DESIGN_SYSTEM_QA === 'true'

  if (process.env.NODE_ENV === 'production' && !allowQaCapture) {
    notFound()
  }

  return <WordmarkLab />
}
