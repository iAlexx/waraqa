import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'

import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { CheckboxField } from '@/components/ui/checkbox'
import { RadioCardGroup, RadioCardItem } from '@/components/ui/radio-card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Progress } from '@/components/ui/progress'

describe('Button', () => {
  it('renders primary label and supports disabled', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { rerender } = render(
      <Button onClick={onClick}>بلّش من هون</Button>,
    )
    expect(screen.getByRole('button', { name: 'بلّش من هون' })).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'بلّش من هون' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button disabled onClick={onClick}>
        بلّش من هون
      </Button>,
    )
    expect(screen.getByRole('button', { name: 'بلّش من هون' })).toBeDisabled()
  })
})

describe('Field + Input', () => {
  it('links label, helper, and error via aria-describedby', () => {
    render(
      <Field
        id="procedure-name"
        label="اسم المعاملة"
        required
        helperText="اكتب الاسم الرسمي أو الاسم اللي الناس بتستخدمه عادةً."
        error="تأكد من هالحقل قبل ما تكمل."
      >
        <Input />
      </Field>,
    )
    const input = screen.getByLabelText(/اسم المعاملة/)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toContain(
      'procedure-name-helper',
    )
    expect(input.getAttribute('aria-describedby')).toContain(
      'procedure-name-error',
    )
    expect(screen.getByRole('alert').textContent).toContain('تأكد من هالحقل')
  })
})

describe('CheckboxField', () => {
  it('toggles via keyboard Space on the checkbox', async () => {
    const user = userEvent.setup()
    render(
      <CheckboxField
        id="docs"
        label="تأكدت إنو الأوراق اللي عندي كاملة قبل ما كمّل."
      />,
    )
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('data-state', 'unchecked')
    checkbox.focus()
    await user.keyboard(' ')
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })
})

describe('RadioCard', () => {
  it('selects an option via click', async () => {
    const user = userEvent.setup()
    render(
      <RadioCardGroup defaultValue="inside">
        <RadioCardItem value="inside" title="داخل سوريا" />
        <RadioCardItem value="outside" title="خارج سوريا" />
      </RadioCardGroup>,
    )
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('data-state', 'checked')
    await user.click(radios[1])
    expect(radios[1]).toHaveAttribute('data-state', 'checked')
    expect(radios[0]).toHaveAttribute('data-state', 'unchecked')
  })
})

describe('Breadcrumb', () => {
  it('marks the current page and keeps nav semantics', () => {
    render(
      <Breadcrumb
        items={[
          { label: 'الرئيسية', href: '/' },
          { label: 'نظام التصميم' },
        ]}
      />,
    )
    expect(
      screen.getByRole('navigation', { name: 'مسار التنقل' }),
    ).toBeTruthy()
    expect(screen.getByText('نظام التصميم').getAttribute('aria-current')).toBe(
      'page',
    )
  })
})

describe('Progress', () => {
  it('exposes valuemin/valuemax/valuenow', () => {
    render(<Progress value={40} max={100} label="الخطوة ٢ من ٥" />)
    const progress = screen.getByRole('progressbar', { name: 'الخطوة ٢ من ٥' })
    expect(progress.getAttribute('aria-valuemin')).toBe('0')
    expect(progress.getAttribute('aria-valuemax')).toBe('100')
    expect(progress.getAttribute('aria-valuenow')).toBe('40')
  })
})
