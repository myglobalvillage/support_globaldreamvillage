/** Editable canned replies ("macros") with {{variable}} support, persisted per browser. */

export type Macro = { id: string; title: string; body: string }

const KEY = 'gdv_support_macros'

export const DEFAULT_MACROS: Macro[] = [
  { id: 'payment-review', title: 'Payment under review', body: 'Hi {{customer}}, thanks for reaching out. We are reconciling your payment with our payment partner and will confirm your booking status within a few hours. If the amount was debited but the booking fails, it is refunded automatically within 5-7 business days.\n\n{{agent}}' },
  { id: 'need-details', title: 'Need more details', body: 'Hi {{customer}}, could you please share the booking ID, the email used on the booking and a screenshot of the issue so we can look into it right away?\n\n{{agent}}' },
  { id: 'resolved', title: 'Issue resolved', body: 'Hi {{customer}}, we have fixed this on our side. Please check and let us know if anything still looks wrong. We are happy to help further.\n\n{{agent}}' },
  { id: 'refund-initiated', title: 'Refund initiated', body: 'Hi {{customer}}, we have approved your refund for ticket {{ticket}}. It will reach the original payment method within 5-7 business days depending on your bank.\n\n{{agent}}' },
]

export function loadMacros(): Macro[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch { /* fall back to defaults */ }
  return DEFAULT_MACROS
}

export function saveMacros(macros: Macro[]) {
  localStorage.setItem(KEY, JSON.stringify(macros))
}

/** Replace {{name}} placeholders; unknown variables become empty strings. */
export function renderMacro(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? '')
}
