// Register form validation schema
import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  verify_code: z.string().length(6, 'Verification code must be 6 digits').optional(),
  turnstile_token: z.string().min(1, 'Please complete the captcha'),
  promo_code: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

export type RegisterFormData = z.infer<typeof registerSchema>
