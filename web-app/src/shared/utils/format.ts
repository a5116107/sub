// Format utilities

/**
 * Format number with fixed decimal places
 */
export function formatNumber(value: number, decimals = 2): string {
  return value.toFixed(decimals)
}

/**
 * Format currency (USD)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value)
}

/**
 * Format compact number (K, M, B)
 */
export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value)
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format duration in milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return `${minutes}m ${seconds}s`
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const maskedLocal = local.charAt(0) + '***'
  return `${maskedLocal}@${domain}`
}

/**
 * Mask API key
 */
export function maskApiKey(key: string): string {
  if (key.length <= 8) return key
  return key.slice(0, 4) + '...' + key.slice(-4)
}
