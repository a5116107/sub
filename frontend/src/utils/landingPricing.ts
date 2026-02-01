export type PricingTab = 'subscription' | 'payg'
export type PricingPeriod = 'week' | 'month' | 'custom'

export type PricingGroupFieldKey =
  | 'daily_limit_usd'
  | 'weekly_limit_usd'
  | 'monthly_limit_usd'
  | 'user_concurrency'
  | 'rate_multiplier'

export type PricingPlanWidgetType = 'text' | 'kv' | 'group_field' | 'list' | 'tags' | 'divider' | 'metric'

export type PricingPlanWidgetTone = 'primary' | 'gray' | 'gold'

export type PricingWidgetWhen = Readonly<{
  periods?: ReadonlyArray<PricingPeriod>
}>

export type LandingPricingWidget =
  Readonly<{
    when?: PricingWidgetWhen
  }> &
    (
      | {
          type: 'text'
          text: string
        }
      | {
          type: 'kv'
          label: string
          value: string
        }
      | {
          type: 'group_field'
          key: PricingGroupFieldKey
          label?: string
        }
      | {
          type: 'list'
          title?: string
          items: ReadonlyArray<string>
        }
      | {
          type: 'tags'
          tags: ReadonlyArray<string>
          tone?: PricingPlanWidgetTone
        }
      | {
          type: 'divider'
          label?: string
        }
      | {
          type: 'metric'
          label: string
          value: string
          hint?: string
        }
    )

export type LandingPricingPeriodOption = Readonly<{
  key: PricingPeriod
  label: string
}>

export type LandingPricingPlan = Readonly<{
  id: string
  name: string
  badge?: string
  description?: string
  highlighted?: boolean
  // Optional backend binding: link the display plan to a subscription Group.
  // When set, admins should ensure the referenced group is `subscription_type=subscription`.
  group_id?: number
  // Optional: show selected backend group fields in the plan card.
  // Requires `group_id` to be set.
  group_fields?: ReadonlyArray<PricingGroupFieldKey>
  // Optional validity days per period (used by backend subscription assignment flows).
  validity_days?: Readonly<{
    week?: number
    month?: number
    custom?: number
  }>
  // Optional: typed widgets to display on the plan card (free组合).
  // Designed to cover both arbitrary marketing copy and structured fields.
  meta?: Readonly<{
    widgets?: ReadonlyArray<LandingPricingWidget>
  }>
  price: Readonly<{
    week?: number
    month?: number
    custom?: string
  }>
  features: ReadonlyArray<string>
}>

export type LandingPricingConfigV1 = Readonly<{
  version: 1
  currency: 'CNY'
  default_tab: PricingTab
  subscription: Readonly<{
    title: string
    subtitle?: string
    default_period: PricingPeriod
    periods: ReadonlyArray<LandingPricingPeriodOption>
    plans: ReadonlyArray<LandingPricingPlan>
  }>
  payg: Readonly<{
    title: string
    subtitle?: string
    cta_label?: string
    features: ReadonlyArray<string>
    note?: string
  }>
  note?: string
}>

export const DEFAULT_LANDING_PRICING_CONFIG_V1: LandingPricingConfigV1 = {
  version: 1,
  currency: 'CNY',
  default_tab: 'subscription',
  subscription: {
    title: '订阅套餐',
    subtitle: '周付 / 月付，适配不同团队节奏。企业版支持定制与 SLA。',
    default_period: 'month',
    periods: [
      { key: 'week', label: '周付' },
      { key: 'month', label: '月付' },
      { key: 'custom', label: '自定义' }
    ],
    plans: [
      {
        id: 'trial',
        name: '体验版',
        badge: 'Free',
        description: '快速验证与 PoC',
        price: { week: 0, month: 0 },
        features: ['共享基础算力池', '标准路由与日志', '社区支持']
      },
      {
        id: 'starter',
        name: '入门版',
        badge: 'Starter',
        description: '个人/小项目稳定起步',
        price: { week: 29, month: 79 },
        features: ['更高并发与速率', '基础监控面板', '邮件工单支持']
      },
      {
        id: 'standard',
        name: '标准版',
        badge: 'Standard',
        description: '小团队协作与权限',
        price: { week: 49, month: 129 },
        features: ['多 API Key 管理', '分组/配额策略', '更丰富的审计日志']
      },
      {
        id: 'pro',
        name: '专业版',
        badge: 'Recommended',
        description: '生产环境优先保障',
        highlighted: true,
        price: { week: 79, month: 199 },
        features: ['优先路由与稳定性策略', '更细粒度用量分析', '专属支持通道']
      },
      {
        id: 'team',
        name: '团队版',
        badge: 'Team',
        description: '更强的管理与协同',
        price: { week: 129, month: 329 },
        features: ['团队成员与角色权限', '多环境配置/隔离', '更高并发与限流配额']
      },
      {
        id: 'enterprise',
        name: '企业版',
        badge: 'Enterprise',
        description: '安全合规与定制化',
        price: { custom: '联系销售' },
        features: ['SLA / 专属支持', '专属实例 / 私有部署', 'SSO/审计/合规支持', '定制接入与迁移服务']
      }
    ]
  },
  payg: {
    title: '按量计费',
    subtitle: '按使用量扣费，适合弹性负载与不确定需求。',
    cta_label: '充值 / 兑换码',
    features: ['按实际用量扣费，随用随充', '支持兑换码与管理员充值', '可与订阅模式并存（按后台规则）'],
    note: '此处为展示示例，价格与口径以后台配置与实际扣费规则为准。'
  },
  note: '示例套餐可在后台“系统设置 → Landing / Pricing”中修改。'
}

export const DEFAULT_LANDING_PRICING_CONFIG_V1_JSON = JSON.stringify(
  DEFAULT_LANDING_PRICING_CONFIG_V1,
  null,
  2
)

type ParsedResult = Readonly<{ config: LandingPricingConfigV1; error?: string }>

const isRecord = (v: unknown): v is Record<string, any> => typeof v === 'object' && v !== null

const isPricingTab = (v: any): v is PricingTab => v === 'subscription' || v === 'payg'

const isPricingPeriod = (v: any): v is PricingPeriod => v === 'week' || v === 'month' || v === 'custom'

const isPricingGroupFieldKey = (v: any): v is PricingGroupFieldKey =>
  v === 'daily_limit_usd' ||
  v === 'weekly_limit_usd' ||
  v === 'monthly_limit_usd' ||
  v === 'user_concurrency' ||
  v === 'rate_multiplier'

const isPricingPlanWidgetType = (v: any): v is PricingPlanWidgetType =>
  v === 'text' ||
  v === 'kv' ||
  v === 'group_field' ||
  v === 'list' ||
  v === 'tags' ||
  v === 'divider' ||
  v === 'metric'

const isPricingPlanWidgetTone = (v: any): v is PricingPlanWidgetTone =>
  v === 'primary' || v === 'gray' || v === 'gold'

export function parseLandingPricingConfig(raw: string | null | undefined): ParsedResult {
  if (!raw || typeof raw !== 'string' || raw.trim() === '') {
    return { config: DEFAULT_LANDING_PRICING_CONFIG_V1 }
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Config must be a JSON object' }
    }
    if (parsed.version !== 1) {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Unsupported config version' }
    }
    if (parsed.currency !== 'CNY') {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Unsupported currency' }
    }
    if (!isPricingTab(parsed.default_tab)) {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid default_tab' }
    }
    if (!isRecord(parsed.subscription)) {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Missing subscription section' }
    }
    if (!Array.isArray(parsed.subscription.plans) || parsed.subscription.plans.length === 0) {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Subscription plans must be a non-empty array' }
    }
    if (!isPricingPeriod(parsed.subscription.default_period)) {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid default_period' }
    }
    if (
      !Array.isArray(parsed.subscription.periods) ||
      parsed.subscription.periods.some((p: any) => !isRecord(p) || !isPricingPeriod(p.key) || typeof p.label !== 'string')
    ) {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid period options' }
    }
    if (!isRecord(parsed.payg) || typeof parsed.payg.title !== 'string') {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Missing payg section' }
    }
    if (!Array.isArray(parsed.payg.features)) {
      return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'payg.features must be an array' }
    }

    // Optional backend binding validation (non-breaking)
    for (const plan of parsed.subscription.plans as any[]) {
      if (!isRecord(plan)) continue

      if ('group_id' in plan && plan.group_id != null) {
        if (typeof plan.group_id !== 'number' || !Number.isInteger(plan.group_id) || plan.group_id <= 0) {
          return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid plan.group_id' }
        }
      }

      if ('group_fields' in plan && plan.group_fields != null) {
        if (!Array.isArray(plan.group_fields) || plan.group_fields.some((k: any) => !isPricingGroupFieldKey(k))) {
          return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid plan.group_fields' }
        }
        if (!('group_id' in plan) || plan.group_id == null) {
          return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'plan.group_fields requires plan.group_id' }
        }
      }

      if ('validity_days' in plan && plan.validity_days != null) {
        if (!isRecord(plan.validity_days)) {
          return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid plan.validity_days' }
        }
        for (const [k, v] of Object.entries(plan.validity_days)) {
          if (!isPricingPeriod(k)) {
            return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid plan.validity_days key' }
          }
          if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) {
            return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid plan.validity_days value' }
          }
        }
      }

      if ('meta' in plan && plan.meta != null) {
        if (!isRecord(plan.meta)) {
          return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid plan.meta' }
        }
        const meta = plan.meta as any
        if ('widgets' in meta && meta.widgets != null) {
          if (!Array.isArray(meta.widgets)) {
            return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid plan.meta.widgets' }
          }
          for (const w of meta.widgets as any[]) {
            if (!isRecord(w) || !isPricingPlanWidgetType(w.type)) {
              return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid plan.meta.widgets item' }
            }

            if ('when' in w && w.when != null) {
              if (!isRecord(w.when)) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.when' }
              }
              if ('periods' in w.when && w.when.periods != null) {
                if (
                  !Array.isArray(w.when.periods) ||
                  w.when.periods.length === 0 ||
                  w.when.periods.some((p: any) => !isPricingPeriod(p))
                ) {
                  return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.when.periods' }
                }
              }
            }

            if (w.type === 'text') {
              if (typeof w.text !== 'string' || w.text.trim() === '') {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.text' }
              }
            } else if (w.type === 'kv') {
              if (
                typeof w.label !== 'string' ||
                w.label.trim() === '' ||
                typeof w.value !== 'string' ||
                w.value.trim() === ''
              ) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.kv' }
              }
            } else if (w.type === 'group_field') {
              if (!('group_id' in plan) || plan.group_id == null) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'widget.group_field requires plan.group_id' }
              }
              if (!isPricingGroupFieldKey(w.key)) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.group_field.key' }
              }
              if ('label' in w && w.label != null && typeof w.label !== 'string') {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.group_field.label' }
              }
            } else if (w.type === 'list') {
              if (!Array.isArray(w.items) || w.items.length === 0 || w.items.some((x: any) => typeof x !== 'string')) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.list.items' }
              }
              if (w.items.some((x: any) => typeof x === 'string' && x.trim() === '')) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.list.items' }
              }
              if ('title' in w && w.title != null && typeof w.title !== 'string') {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.list.title' }
              }
            } else if (w.type === 'tags') {
              if (!Array.isArray(w.tags) || w.tags.length === 0 || w.tags.some((x: any) => typeof x !== 'string')) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.tags' }
              }
              if (w.tags.some((x: any) => typeof x === 'string' && x.trim() === '')) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.tags' }
              }
              if ('tone' in w && w.tone != null && !isPricingPlanWidgetTone(w.tone)) {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.tags.tone' }
              }
            } else if (w.type === 'divider') {
              if ('label' in w && w.label != null && typeof w.label !== 'string') {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.divider.label' }
              }
            } else if (w.type === 'metric') {
              if (typeof w.label !== 'string' || w.label.trim() === '' || typeof w.value !== 'string' || w.value.trim() === '') {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.metric' }
              }
              if ('hint' in w && w.hint != null && typeof w.hint !== 'string') {
                return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: 'Invalid widget.metric.hint' }
              }
            }
          }
        }
      }
    }

    return { config: parsed as LandingPricingConfigV1 }
  } catch (e: any) {
    return { config: DEFAULT_LANDING_PRICING_CONFIG_V1, error: e?.message || 'Invalid JSON' }
  }
}

export function formatCny(amount: number): string {
  if (!Number.isFinite(amount)) return '—'
  return `¥${amount.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
}

