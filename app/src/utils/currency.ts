const _brlCurrency = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const _brlDecimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2, maximumFractionDigits: 2,
})
const _brlCompact1 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1, maximumFractionDigits: 1,
})

export function formatBRL(value: number): string {
  return _brlCurrency.format(value)
}

// Formats a number in Brazilian decimal format without currency symbol: "9.990,00"
export function formatInputBR(value: number): string {
  return _brlDecimal.format(value)
}

export function formatBRLCompact(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `R$ ${_brlCompact1.format(value / 1_000_000)}M`
  if (abs >= 1_000)     return `R$ ${_brlCompact1.format(value / 1_000)}k`
  return formatBRL(value)
}

export function parseBRLInput(raw: string): number {
  const cleaned = raw.replace(/[R$\s.]/g, '').replace(',', '.')
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function formatCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''
  return _brlDecimal.format(parseInt(digits, 10) / 100)
}
