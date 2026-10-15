/**
 * Polska odmiana po liczebniku: 1 wejście, 2–4 wejścia, 5+ wejść
 * (ale 12–14 wejść, 22–24 wejścia).
 */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return `${n} ${one}`
  const last = n % 10
  const lastTwo = n % 100
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${n} ${few}`
  return `${n} ${many}`
}

export const ascentsLabel = (n: number) => plural(n, 'wejście', 'wejścia', 'wejść')
