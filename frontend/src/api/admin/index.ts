/**
 * Admin API barrel export
 * Centralized exports for all admin API modules
 */

import dashboardAPI from './dashboard'
import usersAPI from './users'
import groupsAPI from './groups'
import accountsAPI from './accounts'
import proxiesAPI from './proxies'
import redeemAPI from './redeem'
import promoAPI from './promo'
import settingsAPI from './settings'
import systemAPI from './system'
import subscriptionsAPI from './subscriptions'
import usageAPI from './usage'
import geminiAPI from './gemini'
import openaiAPI from './openai'
import qwenAPI from './qwen'
import antigravityAPI from './antigravity'
import userAttributesAPI from './userAttributes'
import opsAPI from './ops'
import docsAPI from './docs'

/**
 * Unified admin API object for convenient access
 */
export const adminAPI = {
  dashboard: dashboardAPI,
  users: usersAPI,
  groups: groupsAPI,
  accounts: accountsAPI,
  proxies: proxiesAPI,
  redeem: redeemAPI,
  promo: promoAPI,
  settings: settingsAPI,
  docs: docsAPI,
  system: systemAPI,
  subscriptions: subscriptionsAPI,
  usage: usageAPI,
  gemini: geminiAPI,
  openai: openaiAPI,
  qwen: qwenAPI,
  antigravity: antigravityAPI,
  userAttributes: userAttributesAPI,
  ops: opsAPI
}

export {
  dashboardAPI,
  usersAPI,
  groupsAPI,
  accountsAPI,
  proxiesAPI,
  redeemAPI,
  promoAPI,
  settingsAPI,
  docsAPI,
  systemAPI,
  subscriptionsAPI,
  usageAPI,
  geminiAPI,
  openaiAPI,
  qwenAPI,
  antigravityAPI,
  userAttributesAPI,
  opsAPI
}

export default adminAPI
