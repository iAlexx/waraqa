import Link from 'next/link'

import type { PublicTransactionDetail } from '@/lib/public/transaction-detail-map'
import { cn } from '@/lib/utils/cn'

export type TransactionDetailViewProps = {
  transaction: PublicTransactionDetail
  className?: string
}

const RAIL = 'mx-auto w-full min-w-0 max-w-5xl'
const PROSE = 'max-w-[40rem] text-[0.975rem] leading-relaxed text-ink-800'

function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2
        id={`${id}-heading`}
        className="font-display text-xl font-bold text-ink-950 md:text-[1.35rem]"
      >
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block max-w-full break-all font-medium text-brand-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40 focus-visible:ring-offset-2"
    >
      {children}
    </a>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-[0.8125rem] border border-border/80 bg-surface px-4 py-4 sm:px-5',
        className,
      )}
    >
      {children}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="min-w-0 break-words text-ink-800">{value}</dd>
    </div>
  )
}

function TransactionDetailView({ transaction: t, className }: TransactionDetailViewProps) {
  return (
    <article
      className={cn('waraqa-container py-8 md:py-12', className)}
      data-transaction-detail
      data-transaction-slug={t.slug}
      data-transaction-id={String(t.id)}
    >
      <div className={RAIL}>
        <nav aria-label="مسار التنقل" className="mb-6 text-sm text-ink-600">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link
                href="/"
                className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
              >
                الرئيسية
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href="/search"
                className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
              >
                البحث
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="min-w-0 max-w-full break-words font-medium text-ink-900" aria-current="page">
              {t.title}
            </li>
          </ol>
        </nav>

        <header className="border-b border-border/60 pb-8">
          {t.demoLabeled ? (
            <span className="mb-3 inline-flex rounded border border-warning/40 bg-warning/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-warning">
              بيانات تجريبية
            </span>
          ) : null}
          <h1
            id="transaction-title"
            className="max-w-[40rem] font-display text-[1.75rem] font-bold leading-snug text-ink-950 md:text-[2.125rem]"
          >
            {t.title}
          </h1>
          <p className="mt-3 max-w-[40rem] text-[1.0625rem] leading-relaxed text-ink-700 md:text-[1.125rem]">
            {t.summary}
          </p>

          <dl className="mt-5 flex flex-wrap gap-2" data-transaction-meta>
            {t.category ? (
              <div>
                <dt className="sr-only">التصنيف</dt>
                <dd className="inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-md border border-border/70 bg-ivory px-2.5 py-1.5 text-xs text-ink-800">
                  <span className="text-ink-500">التصنيف</span>
                  <span className="font-medium break-words">{t.category.name}</span>
                </dd>
              </div>
            ) : null}
            {t.agency ? (
              <div>
                <dt className="sr-only">الجهة</dt>
                <dd className="inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-md border border-border/70 bg-ivory px-2.5 py-1.5 text-xs text-ink-800">
                  <span className="text-ink-500">الجهة</span>
                  <span className="font-medium break-words">
                    {t.agency.shortName || t.agency.name}
                  </span>
                </dd>
              </div>
            ) : null}
            {t.lastReviewedLabel ? (
              <div>
                <dt className="sr-only">آخر مراجعة</dt>
                <dd className="inline-flex max-w-full flex-wrap items-center gap-x-1 rounded-md border border-border/70 bg-ivory px-2.5 py-1.5 text-xs text-ink-800">
                  <span className="text-ink-500">آخر مراجعة</span>
                  <time className="font-medium" dateTime={t.lastReviewedAt ?? undefined}>
                    {t.lastReviewedLabel}
                  </time>
                </dd>
              </div>
            ) : null}
          </dl>

          <p
            className="mt-5 rounded-[0.8125rem] border border-border/80 bg-ivory/80 px-4 py-3 text-sm leading-relaxed text-ink-700"
            data-transaction-disclaimer
          >
            ورقة منصة إرشادية مستقلة وليست موقعاً حكومياً. راجع الجهة الرسمية قبل التقديم — المعلومات
            قد تتغيّر.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-10">
          {t.audiences.length > 0 ? (
            <Section id="audience" title="لمن هالمعاملة؟">
              <ul className="flex flex-wrap gap-2">
                {t.audiences.map((a) => (
                  <li
                    key={a}
                    className="rounded-md border border-border/70 bg-ivory px-2.5 py-1.5 text-sm text-ink-800"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {t.eligibility ? (
            <Section id="eligibility" title="الأهلية">
              <p className={cn(PROSE, 'whitespace-pre-wrap')}>{t.eligibility}</p>
            </Section>
          ) : null}

          {t.prerequisites.length > 0 ? (
            <Section id="prerequisites" title="معاملات سابقة مطلوبة">
              <ul className="flex flex-col gap-2">
                {t.prerequisites.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={p.href}
                      className="inline-flex min-h-11 items-center font-medium text-brand-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {t.requiredDocuments.length > 0 ? (
            <Section id="documents" title="الوثائق المطلوبة">
              <ul className="flex flex-col gap-3" data-section="documents">
                {t.requiredDocuments.map((doc, i) => (
                  <li key={`${doc.name}-${i}`}>
                    <Card>
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <p className="min-w-0 font-semibold text-ink-950">{doc.name}</p>
                        <p className="shrink-0 text-xs font-medium text-ink-600">
                          {doc.requirementTypeLabel}
                        </p>
                      </div>
                      {doc.condition ? (
                        <p className="mt-2 text-sm leading-relaxed text-ink-700">
                          <span className="text-ink-500">الشرط: </span>
                          {doc.condition}
                        </p>
                      ) : null}
                      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/50 pt-3 text-xs text-ink-600">
                        {doc.quantity != null ? <li>الكمية: {doc.quantity}</li> : null}
                        {doc.originalRequired ? <li>الأصل مطلوب</li> : null}
                        {doc.copiesRequired != null && doc.copiesRequired > 0 ? (
                          <li>نسخ: {doc.copiesRequired}</li>
                        ) : null}
                        {doc.certificationRequired ? <li>تصديق مطلوب</li> : null}
                      </ul>
                      {doc.notes ? (
                        <p className="mt-3 text-sm leading-relaxed text-ink-700">{doc.notes}</p>
                      ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section id="steps" title="الخطوات">
            <ol className="flex flex-col gap-3" data-section="steps">
              {t.steps.map((step, index) => (
                <li key={`${step.title}-${index}`}>
                  <Card>
                    <div className="flex gap-3">
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-900"
                        aria-hidden="true"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-snug text-ink-950">
                          <span className="sr-only">الخطوة {index + 1}: </span>
                          {step.title}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                          {step.description}
                        </p>
                        {step.locationNote ? (
                          <p className="mt-2 text-sm text-ink-600">
                            <span className="text-ink-500">المكان: </span>
                            {step.locationNote}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </Section>

          {t.fees.length > 0 ? (
            <Section id="fees" title="الرسوم">
              <ul className="flex flex-col gap-3" data-section="fees">
                {t.fees.map((fee, i) => (
                  <li key={`${fee.label}-${i}`}>
                    <Card>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                        <p className="min-w-0 font-semibold text-ink-950">{fee.label}</p>
                        {fee.amountDisplay ? (
                          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink-900">
                            {fee.amountDisplay}
                          </p>
                        ) : null}
                      </div>
                      {fee.notes ? (
                        <p className="mt-2 border-t border-border/50 pt-2 text-sm leading-relaxed text-ink-700">
                          {fee.notes}
                        </p>
                      ) : null}
                    </Card>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {t.duration ? (
            <Section id="duration" title="المدة المتوقعة">
              <p className={PROSE}>{t.duration}</p>
            </Section>
          ) : null}

          {t.serviceCenters.length > 0 ? (
            <Section id="centers" title="مراكز الخدمة">
              <ul className="flex flex-col gap-3" data-section="centers">
                {t.serviceCenters.map((c) => (
                  <li key={c.slug}>
                    <Card>
                      <p className="font-semibold text-ink-950">{c.name}</p>
                      <dl className="mt-3 flex flex-col gap-2">
                        {c.governorateLabel || c.city ? (
                          <MetaRow
                            label="الموقع"
                            value={[c.governorateLabel, c.city].filter(Boolean).join(' — ')}
                          />
                        ) : null}
                        {c.address ? <MetaRow label="العنوان" value={c.address} /> : null}
                        {c.phones.length > 0 ? (
                          <MetaRow label="الهاتف" value={c.phones.join(' · ')} />
                        ) : null}
                        {c.workingHours ? (
                          <MetaRow label="ساعات العمل" value={c.workingHours} />
                        ) : null}
                      </dl>
                    </Card>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {t.outcome ? (
            <Section id="outcome" title="النتيجة">
              <p className={cn(PROSE, 'whitespace-pre-wrap')}>{t.outcome}</p>
            </Section>
          ) : null}

          {t.sources.length > 0 ? (
            <Section id="sources" title="المصادر الرسمية">
              <ul className="flex flex-col gap-3" data-section="sources">
                {t.sources.map((s, i) => (
                  <li key={`${s.title}-${i}`}>
                    <Card>
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="min-w-0 font-semibold text-ink-950">{s.title}</p>
                        {s.primary ? (
                          <span className="text-xs font-medium text-brand-900">مصدر أساسي</span>
                        ) : null}
                      </div>
                      {(s.referenceNumber || s.lastVerifiedLabel) && (
                        <p className="mt-2 text-xs leading-relaxed text-ink-500">
                          {[
                            s.referenceNumber ? `مرجع: ${s.referenceNumber}` : null,
                            s.lastVerifiedLabel ? `تحقق: ${s.lastVerifiedLabel}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </p>
                      )}
                      {s.citationNote ? (
                        <p className="mt-2 text-sm leading-relaxed text-ink-700">{s.citationNote}</p>
                      ) : null}
                      <div className="mt-3 flex flex-col gap-2 border-t border-border/50 pt-3 text-sm">
                        {s.officialLink ? (
                          <ExternalLink href={s.officialLink.href}>
                            المصدر الرسمي — {s.officialLink.label}
                          </ExternalLink>
                        ) : null}
                        {s.archiveLink ? (
                          <ExternalLink href={s.archiveLink.href}>
                            نسخة مؤرشفة — {s.archiveLink.label}
                          </ExternalLink>
                        ) : null}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-ink-600">راجع الجهة الرسمية قبل التقديم.</p>
            </Section>
          ) : null}
        </div>

        <p className="mt-12 border-t border-border/60 pt-6">
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-brand-900 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-800/40"
            data-back-to-search
          >
            العودة إلى البحث
          </Link>
        </p>
      </div>
    </article>
  )
}

export { TransactionDetailView }
