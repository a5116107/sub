<template>
  <ul class="space-y-2 text-sm text-gray-700 dark:text-dark-200">
    <template v-for="(item, idx) in items" :key="idx">
      <li v-if="item.kind === 'divider'" class="pt-1">
        <div class="flex items-center gap-2">
          <div class="h-px flex-1 bg-gray-200/80 dark:bg-dark-700/70"></div>
          <div v-if="item.label" class="text-xs text-gray-500 dark:text-dark-400">{{ item.label }}</div>
          <div v-if="item.label" class="h-px flex-1 bg-gray-200/80 dark:bg-dark-700/70"></div>
        </div>
      </li>

      <li v-else-if="item.kind === 'tags'" class="flex flex-wrap gap-2">
        <span v-for="(tag, tIdx) in item.tags" :key="tIdx" class="badge" :class="tagToneClass(item.tone)">
          {{ tag }}
        </span>
      </li>

      <li v-else-if="item.kind === 'metric'" class="rounded-lg border border-gray-200/70 bg-white/40 p-3 dark:border-dark-700/60 dark:bg-dark-900/20">
        <div class="flex items-center justify-between gap-3">
          <div class="text-xs text-gray-500 dark:text-dark-400">{{ item.label }}</div>
          <div class="text-base font-semibold text-gray-900 dark:text-white">{{ item.value }}</div>
        </div>
        <div v-if="item.hint" class="mt-1 text-xs text-gray-500 dark:text-dark-400">{{ item.hint }}</div>
      </li>

      <li v-else-if="item.kind === 'kv'" class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-start gap-2">
          <Icon name="check" size="sm" class="mt-0.5 flex-shrink-0 text-primary-500" :stroke-width="2" />
          <span class="min-w-0 break-words">{{ item.label }}</span>
        </div>
        <span class="flex-shrink-0 font-medium text-gray-900 dark:text-white">{{ item.value }}</span>
      </li>

      <li v-else class="flex items-start gap-2">
        <Icon name="check" size="sm" class="mt-0.5 text-primary-500" :stroke-width="2" />
        <span>{{ item.text }}</span>
      </li>
    </template>
  </ul>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import type { Group } from '@/types'
import type {
  LandingPricingPlan,
  PricingGroupFieldKey,
  PricingPeriod,
  PricingPlanWidgetTone
} from '@/utils/landingPricing'

type WidgetWhen = {
  periods?: PricingPeriod[]
} | undefined

type PerkItem =
  | { kind: 'line'; text: string }
  | { kind: 'kv'; label: string; value: string }
  | { kind: 'tags'; tags: string[]; tone?: PricingPlanWidgetTone }
  | { kind: 'divider'; label?: string }
  | { kind: 'metric'; label: string; value: string; hint?: string }

const props = defineProps<{
  plan: LandingPricingPlan
  groups: Group[]
  period: PricingPeriod
}>()

const { t } = useI18n()

const groupsById = computed(() => {
  const m = new Map<number, Group>()
  for (const g of props.groups) m.set(g.id, g)
  return m
})

function groupFieldLabel(key: PricingGroupFieldKey): string {
  switch (key) {
    case 'daily_limit_usd':
      return t('home.pricing.groupFields.daily')
    case 'weekly_limit_usd':
      return t('home.pricing.groupFields.weekly')
    case 'monthly_limit_usd':
      return t('home.pricing.groupFields.monthly')
    case 'user_concurrency':
      return t('home.pricing.groupFields.concurrency')
    case 'rate_multiplier':
      return t('home.pricing.groupFields.rate')
    default:
      return key
  }
}

function groupFieldValue(key: PricingGroupFieldKey, g: Group): string | null {
  const unlimited = t('admin.subscriptions.unlimited')
  switch (key) {
    case 'daily_limit_usd':
      return g.daily_limit_usd == null ? unlimited : `$${g.daily_limit_usd}`
    case 'weekly_limit_usd':
      return g.weekly_limit_usd == null ? unlimited : `$${g.weekly_limit_usd}`
    case 'monthly_limit_usd':
      return g.monthly_limit_usd == null ? unlimited : `$${g.monthly_limit_usd}`
    case 'user_concurrency':
      return g.user_concurrency <= 0 ? unlimited : String(g.user_concurrency)
    case 'rate_multiplier':
      return `x${g.rate_multiplier}`
    default:
      return null
  }
}

function widgetApplies(when: WidgetWhen): boolean {
  const periods = when?.periods
  if (!periods || periods.length === 0) return true
  return periods.includes(props.period)
}

function tagToneClass(tone?: PricingPlanWidgetTone): string {
  if (tone === 'primary') return 'badge-primary'
  if (tone === 'gold') return 'badge-gold'
  return 'badge-gray'
}

const items = computed<PerkItem[]>(() => {
  const out: PerkItem[] = []
  const plan = props.plan
  const g = plan.group_id ? groupsById.value.get(plan.group_id) : undefined

  // Legacy: group_fields
  if (g && plan.group_fields?.length) {
    for (const key of plan.group_fields) {
      const value = groupFieldValue(key, g)
      if (!value) continue
      out.push({ kind: 'kv', label: groupFieldLabel(key), value })
    }
  }

  // New: meta.widgets
  const widgets = plan.meta?.widgets || []
  for (const w of widgets as any[]) {
    if (!w || typeof w !== 'object' || typeof w.type !== 'string') continue
    if (!widgetApplies(w.when as WidgetWhen)) continue

    if (w.type === 'text') {
      const text = typeof w.text === 'string' ? w.text.trim() : ''
      if (text) out.push({ kind: 'line', text })
      continue
    }
    if (w.type === 'kv') {
      const label = typeof w.label === 'string' ? w.label.trim() : ''
      const value = typeof w.value === 'string' ? w.value.trim() : ''
      if (label && value) out.push({ kind: 'kv', label, value })
      continue
    }
    if (w.type === 'group_field') {
      if (!g) continue
      const key = typeof w.key === 'string' ? (w.key as PricingGroupFieldKey) : undefined
      if (!key) continue
      const value = groupFieldValue(key, g)
      if (!value) continue
      const label =
        typeof w.label === 'string' && w.label.trim()
          ? w.label.trim()
          : groupFieldLabel(key)
      out.push({ kind: 'kv', label, value })
      continue
    }
    if (w.type === 'list') {
      const title = typeof w.title === 'string' ? w.title.trim() : ''
      const items = Array.isArray(w.items) ? w.items : []
      for (const item of items) {
        const text = typeof item === 'string' ? item.trim() : ''
        if (!text) continue
        out.push({ kind: 'line', text: title ? `${title}: ${text}` : text })
      }
      continue
    }
    if (w.type === 'tags') {
      const tags = Array.isArray(w.tags)
        ? w.tags.map((x: any) => (typeof x === 'string' ? x.trim() : '')).filter((x: string) => !!x)
        : []
      if (!tags.length) continue
      const tone = typeof w.tone === 'string' ? (w.tone as PricingPlanWidgetTone) : undefined
      out.push({ kind: 'tags', tags, tone })
      continue
    }
    if (w.type === 'divider') {
      const label = typeof w.label === 'string' ? w.label.trim() : ''
      out.push({ kind: 'divider', label: label || undefined })
      continue
    }
    if (w.type === 'metric') {
      const label = typeof w.label === 'string' ? w.label.trim() : ''
      const value = typeof w.value === 'string' ? w.value.trim() : ''
      const hint = typeof w.hint === 'string' ? w.hint.trim() : ''
      if (!label || !value) continue
      out.push({ kind: 'metric', label, value, hint: hint || undefined })
      continue
    }
  }

  // Legacy: features
  for (const f of plan.features) {
    const text = typeof f === 'string' ? f.trim() : ''
    if (text) out.push({ kind: 'line', text })
  }

  return out
})
</script>
