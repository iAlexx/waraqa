import React from 'react'
import './styles.css'

export const metadata = {
  title: 'ورقة',
  description:
    'ورقة منصة إرشادية مستقلة بتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.',
}

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="ar-SY" dir="rtl">
      <body>
        <main>{children}</main>
      </body>
    </html>
  )
}
