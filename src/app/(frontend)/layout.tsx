import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import {
  Alexandria,
  Aref_Ruqaa_Ink,
  IBM_Plex_Sans_Arabic,
} from 'next/font/google'

import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import { Toaster } from '@/components/ui/toast'
import { loadPublicSiteSettings } from '@/lib/public/site-settings'

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

export async function generateMetadata(): Promise<Metadata> {
  const settings = await loadPublicSiteSettings()
  const title = settings.siteName || 'ورقة'
  const description =
    settings.tagline ||
    'ورقة منصة إرشادية بتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.'

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
    openGraph: {
      title,
      description,
      locale: 'ar_SY',
      type: 'website',
      siteName: title,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

export default async function RootLayout(props: { children: ReactNode }) {
  const { children } = props
  const settings = await loadPublicSiteSettings()

  return (
    <html
      lang="ar-SY"
      dir="rtl"
      className={`${alexandria.variable} ${ibmPlexSansArabic.variable} ${arefRuqaaInk.variable}`}
    >
      <body className="relative flex min-h-dvh flex-col overflow-x-hidden bg-canvas font-sans">
        <a href="#main-content" className="skip-link">
          تخطّى إلى المحتوى
        </a>
        <SiteHeader settings={settings} />
        <main id="main-content" tabIndex={-1} className="relative flex-1 outline-none">
          {children}
        </main>
        <SiteFooter settings={settings} />
        <Toaster position="bottom-center" closeButton />
      </body>
    </html>
  )
}
