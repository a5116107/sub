// Validation utilities
import { z } from 'zod'

/**
 * Email validation schema
 */
export const emailSchema = z.string().email('Invalid email address')

/**
 * Password validation schema (min 6 chars)
 */
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters')

/**
 * TOTP code validation schema
 */
export const totpCodeSchema = z.string().regex(/^\d{6}$/, 'TOTP code must be 6 digits')

/**
 * Verify code validation schema
 */
export const verifyCodeSchema = z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits')

/**
 * URL validation schema
 */
export const urlSchema = z.string().url('Invalid URL')

/**
 * IP address validation (IPv4 or CIDR)
 */
export function isValidIpOrCidr(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
  if (!ipv4Regex.test(ip)) return false

  const [address, cidr] = ip.split('/')
  const parts = address.split('.')

  for (const part of parts) {
    const num = parseInt(part, 10)
    if (num < 0 || num > 255) return false
  }

  if (cidr) {
    const cidrNum = parseInt(cidr, 10)
    if (cidrNum < 0 || cidrNum > 32) return false
  }

  return true
}

/**
 * Validate IP whitelist/blacklist
 */
export function validateIpList(ips: string[]): { valid: boolean; invalid: string[] } {
  const invalid: string[] = []

  for (const ip of ips) {
    if (!isValidIpOrCidr(ip.trim())) {
      invalid.push(ip)
    }
  }

  return { valid: invalid.length === 0, invalid }
}

/**
 * Check if value is empty (null, undefined, empty string, empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}
