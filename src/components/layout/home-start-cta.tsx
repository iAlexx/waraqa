'use client'

import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'

/**
 * Visual CTA for the Phase 2 home shell.
 * No navigation destination yet — shows a calm “coming soon” toast only.
 */
function HomeStartCta() {
  return (
    <div className="w-full max-w-sm md:mx-auto">
      <Button
        type="button"
        className="w-full"
        onClick={() => toast.message('قريباً — الدليل التفاعلي لسا قيد التجهيز.')}
      >
        بلّش من هون
      </Button>
    </div>
  )
}

export { HomeStartCta }
