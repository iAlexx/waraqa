import type { ReactNode } from 'react'
import {
  Alexandria,
  Aref_Ruqaa_Ink,
  IBM_Plex_Sans_Arabic,
} from 'next/font/google'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Toaster } from '@/components/ui/toast'

import './globals.css'

const alexandria = Alexandria({
  subsets: ['arabic', 'latin'],
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-waraqa-display',
})

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-waraqa-body',
})

const arefRuqaaInk = Aref_Ruqaa_Ink({
  subsets: ['arabic'],
  weight: '700',
  display: 'swap',
  variable: '--font-waraqa-wordmark',
})

export const metadata = {
  title: 'ورقة',
  description:
    'ورقة منصة إرشادية بتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.',
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout(props: { children: ReactNode }) {
  const { children } = props

  return (
    <html
      lang="ar-SY"
      dir="rtl"
      className={`${alexandria.variable} ${ibmPlexSansArabic.variable} ${arefRuqaaInk.variable}`}
    >
      <body className="relative flex flex-col bg-canvas font-sans">
        <a href="#main-content" className="skip-link">
          تخطّى إلى المحتوى
        </a>
        <SiteHeader />
        <main id="main-content" tabIndex={-1} className="relative outline-none">
          {children}
        </main>
        <SiteFooter />
        <Toaster position="bottom-center" closeButton />
      </body>
    </html>
  )
}
