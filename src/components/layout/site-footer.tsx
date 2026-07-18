import { BrandMark } from '@/components/brand/brand-mark'
import { cn } from '@/lib/utils/cn'

function SiteFooter({ className }: { className?: string }) {
  const year = new Date().getFullYear()

  return (
    <footer className={cn('border-t border-border bg-ivory/90', className)}>
      <div className="waraqa-container flex flex-col gap-3 py-5 md:py-6">
        <BrandMark size="footer" variant="primary" />
        <p className="max-w-3xl text-sm leading-relaxed text-ink-700">
          © {year} ورقة — منصة إرشادية مستقلة — ليست موقعاً حكومياً
        </p>
      </div>
    </footer>
  )
}

export { SiteFooter }
