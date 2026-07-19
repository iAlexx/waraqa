import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/** Simple brand-tint favicon — interlaced-star motif placeholder mark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a3d37',
          color: '#f7f3ea',
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        و
      </div>
    ),
    { ...size },
  )
}
