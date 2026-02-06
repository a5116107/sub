/**
 * Admin API barrel export
 * Centralized exports for all admin API modules
 */

import accountsAPI from './accounts'
import announcementsAPI from './announcements'
import antigravityAPI from './antigravity'
import dashboardAPI from './dashboard'
import docsAPI from './docs'
import geminiAPI from './gemini'
import groupsAPI from './groups'
import openaiAPI from './openai'
import opsAPI from './ops'
import promoAPI from './promo'
import proxiesAPI from './proxies'
import qwenAPI from './qwen'
import redeemAPI from './redeem'
import settingsAPI from './settings'
import subscriptionsAPI from './subscriptions'
import systemAPI from './system'
import usageAPI from './usage'
import userAttributesAPI from './userAttributes'
import usersAPI from './users'
import modelPricingAPI from './modelPricing'
import errorPassthroughAPI from './errorPassthrough'

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
	announcements: announcementsAPI,
	settings: settingsAPI,
	docs: docsAPI,
	modelPricing: modelPricingAPI,
	system: systemAPI,
	subscriptions: subscriptionsAPI,
	usage: usageAPI,
	gemini: geminiAPI,
	openai: openaiAPI,
	qwen: qwenAPI,
	antigravity: antigravityAPI,
	userAttributes: userAttributesAPI,
	ops: opsAPI,
	errorPassthrough: errorPassthroughAPI
}

export {
	dashboardAPI,
	usersAPI,
	groupsAPI,
	accountsAPI,
	proxiesAPI,
	redeemAPI,
	promoAPI,
	announcementsAPI,
	settingsAPI,
	docsAPI,
	modelPricingAPI,
	systemAPI,
	subscriptionsAPI,
	usageAPI,
	geminiAPI,
	openaiAPI,
	qwenAPI,
	antigravityAPI,
	userAttributesAPI,
	opsAPI,
	errorPassthroughAPI
}

export default adminAPI

export type { ErrorPassthroughRule, CreateRuleRequest, UpdateRuleRequest } from './errorPassthrough'
