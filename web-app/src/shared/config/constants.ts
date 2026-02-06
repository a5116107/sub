// Application constants

export const APP_NAME = 'Sub2API'
export const APP_VERSION = '0.0.1'

// API
export const API_BASE_URL = '/api/v1'
export const API_TIMEOUT = 30000

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// Local storage keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  LOCALE: 'locale',
  THEME: 'theme',
  SIDEBAR_COLLAPSED: 'sidebar_collapsed'
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  OAUTH_CALLBACK: '/oauth/callback',
  DASHBOARD: '/dashboard',
  API_KEYS: '/api-keys',
  USAGE: '/usage',
  PROFILE: '/profile',
  DOCS: '/docs',
  ANNOUNCEMENTS: '/announcements',
  REDEEM: '/redeem',
  PAYMENTS: '/payments',
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    GROUPS: '/admin/groups',
    ACCOUNTS: '/admin/accounts',
    OPS: '/admin/ops',
    SETTINGS: '/admin/settings',
    ANNOUNCEMENTS: '/admin/announcements',
    DOCS: '/admin/docs'
  }
} as const

// Date formats
export const DATE_FORMATS = {
  DATE: 'yyyy-MM-dd',
  DATETIME: 'yyyy-MM-dd HH:mm:ss',
  TIME: 'HH:mm:ss'
} as const
