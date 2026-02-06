// Date utilities
import { format, parseISO, isValid, type Locale } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'

const locales: Record<string, Locale> = {
  zh: zhCN,
  en: enUS
}

/**
 * Format date with locale
 */
export function formatDate(
  date: string | Date | number,
  formatStr = 'yyyy-MM-dd',
  localeKey: string = 'zh'
): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return '-'
  return format(d, formatStr, { locale: locales[localeKey] || locales.zh })
}

/**
 * Format datetime
 */
export function formatDateTime(
  date: string | Date | number,
  localeKey: string = 'zh'
): string {
  return formatDate(date, 'yyyy-MM-dd HH:mm:ss', localeKey)
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | number, localeKey: string = 'zh'): string {
  const d = typeof date === 'string' ? parseISO(date) : new Date(date)
  if (!isValid(d)) return '-'

  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000)

  const rtf = new Intl.RelativeTimeFormat(localeKey, { numeric: 'auto' })

  if (diffInSeconds < 60) return rtf.format(-diffInSeconds, 'second')
  if (diffInSeconds < 3600) return rtf.format(-Math.floor(diffInSeconds / 60), 'minute')
  if (diffInSeconds < 86400) return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour')
  if (diffInSeconds < 2592000) return rtf.format(-Math.floor(diffInSeconds / 86400), 'day')
  if (diffInSeconds < 31536000) return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month')
  return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year')
}

/**
 * Get start of day
 */
export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get end of day
 */
export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Get date range for period
 */
export function getDateRange(period: 'today' | 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'week':
      start.setDate(now.getDate() - 7)
      break
    case 'month':
      start.setMonth(now.getMonth() - 1)
      break
  }

  return { start, end: now }
}
