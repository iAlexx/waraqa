import React from 'react'
import './styles.css'

export default function HomePage() {
  return (
    <div className="home">
      <h1>ورقة</h1>
      <p>
        عم نجهّز منصة ورقة لتساعدك تعرف شو المطلوب لمعاملتك، خطوة بخطوة.
      </p>
      <p className="disclaimer" role="note">
        ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً.
      </p>
    </div>
  )
}
