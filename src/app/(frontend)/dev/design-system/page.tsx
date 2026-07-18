import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { DesignSystemShowcase } from '@/components/dev/design-system-showcase'

export const metadata: Metadata = {
  title: 'نظام التصميم | ورقة (تطوير فقط)',
  robots: {
    index: false,
    follow: false,
  },
}

/** Request-time gate so local QA can use `pnpm start` + ALLOW_DESIGN_SYSTEM_QA=1. */
export const dynamic = 'force-dynamic'

export default function DesignSystemPage() {
  // Production deploys hide this page. Local QA captures may set
  // ALLOW_DESIGN_SYSTEM_QA=1 with `pnpm start` to avoid the Next.js dev indicator.
  const allowQaCapture =
    process.env.ALLOW_DESIGN_SYSTEM_QA === '1' ||
    process.env.ALLOW_DESIGN_SYSTEM_QA === 'true'

  if (process.env.NODE_ENV === 'production' && !allowQaCapture) {
    notFound()
  }

  return <DesignSystemShowcase />
}
