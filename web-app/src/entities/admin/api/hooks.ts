// Admin Vue Query Hooks
import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import {
  ADMIN_KEYS,
  adminDashboardApi,
  adminUsersApi,
  adminGroupsApi,
  adminAccountsApi,
  adminProxiesApi,
  adminRedeemCodesApi,
  adminPromoCodesApi,
  adminAnnouncementsApi,
  adminSettingsApi,
  adminModelPricingApi,
  adminSubscriptionsApi,
  adminOpsApi,
  adminSystemApi
} from './index'
import type {
  CreateUserRequest,
  UpdateUserRequest,
  UpdateBalanceRequest,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateAccountRequest,
  UpdateAccountRequest,
  BulkUpdateAccountsRequest,
  CreateProxyRequest,
  UpdateProxyRequest,
  GenerateRedeemCodesRequest,
  CreatePromoCodeRequest,
  UpdatePromoCodeRequest,
  CreateAnnouncementRequest,
  UpdateAnnouncementRequest,
  UpdateSystemSettingsRequest,
  AssignSubscriptionRequest,
  BulkAssignSubscriptionRequest,
  ExtendSubscriptionRequest,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest
} from '~/shared/api/types'
import type { PaginationParams } from '~/shared/types'

// ============================================
// Dashboard Hooks
// ============================================
export function useAdminDashboardStatsQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard.stats(),
    queryFn: () => adminDashboardApi.getStats(),
    refetchInterval: 30000,
    ...options
  })
}

export function useAdminRealtimeMetricsQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard.realtime(),
    queryFn: () => adminDashboardApi.getRealtime(),
    refetchInterval: 5000,
    ...options
  })
}

export function useAdminTrendQuery(days = 7, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard.trend(days),
    queryFn: () => adminDashboardApi.getTrend(days),
    ...options
  })
}

export function useAdminModelsStatsQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard.models(),
    queryFn: () => adminDashboardApi.getModels(),
    ...options
  })
}

export function useAdminApiKeysTrendQuery(days = 7, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard.apiKeysTrend(days),
    queryFn: () => adminDashboardApi.getApiKeysTrend(days),
    ...options
  })
}

export function useAdminUsersTrendQuery(days = 7, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard.usersTrend(days),
    queryFn: () => adminDashboardApi.getUsersTrend(days),
    ...options
  })
}

// ============================================
// Users Hooks
// ============================================
export function useAdminUsersQuery(params?: Ref<PaginationParams>, options?: UseQueryOptions) {
  const queryParams = computed(() => params?.value)
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.users.list(queryParams.value)),
    queryFn: () => adminUsersApi.list(queryParams.value),
    ...options
  })
}

export function useAdminUserQuery(id: Ref<number | undefined>, options?: UseQueryOptions) {
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.users.detail(id.value!)),
    queryFn: () => adminUsersApi.get(id.value!),
    enabled: computed(() => !!id.value),
    ...options
  })
}

export function useAdminCreateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateUserRequest) => adminUsersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.all })
    }
  })
}

export function useAdminUpdateUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserRequest }) =>
      adminUsersApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.all })
    }
  })
}

export function useAdminDeleteUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminUsersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.all })
    }
  })
}

export function useAdminUpdateBalanceMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateBalanceRequest }) =>
      adminUsersApi.updateBalance(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users.detail(variables.id) })
    }
  })
}

// ============================================
// Groups Hooks
// ============================================
export function useAdminGroupsQuery(params?: Ref<PaginationParams>, options?: UseQueryOptions) {
  const queryParams = computed(() => params?.value)
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.groups.list(queryParams.value)),
    queryFn: () => adminGroupsApi.list(queryParams.value),
    ...options
  })
}

export function useAdminAllGroupsQuery(platform?: string, options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.groups.allGroups(),
    queryFn: () => adminGroupsApi.getAll(platform),
    ...options
  })
}

export function useAdminGroupQuery(id: Ref<number | undefined>, options?: UseQueryOptions) {
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.groups.detail(id.value!)),
    queryFn: () => adminGroupsApi.get(id.value!),
    enabled: computed(() => !!id.value),
    ...options
  })
}

export function useAdminCreateGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupRequest) => adminGroupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.groups.all })
    }
  })
}

export function useAdminUpdateGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateGroupRequest }) =>
      adminGroupsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.groups.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.groups.all })
    }
  })
}

export function useAdminDeleteGroupMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminGroupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.groups.all })
    }
  })
}

// ============================================
// Accounts Hooks
// ============================================
export function useAdminAccountsQuery(params?: Ref<PaginationParams>, options?: UseQueryOptions) {
  const queryParams = computed(() => params?.value)
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.accounts.list(queryParams.value)),
    queryFn: () => adminAccountsApi.list(queryParams.value),
    ...options
  })
}

export function useAdminAccountQuery(id: Ref<number | undefined>, options?: UseQueryOptions) {
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.accounts.detail(id.value!)),
    queryFn: () => adminAccountsApi.get(id.value!),
    enabled: computed(() => !!id.value),
    ...options
  })
}

export function useAdminCreateAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAccountRequest) => adminAccountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.accounts.all })
    }
  })
}

export function useAdminUpdateAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAccountRequest }) =>
      adminAccountsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.accounts.detail(variables.id) })
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.accounts.all })
    }
  })
}

export function useAdminDeleteAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminAccountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.accounts.all })
    }
  })
}

export function useAdminTestAccountMutation() {
  return useMutation({
    mutationFn: (id: number) => adminAccountsApi.test(id)
  })
}

export function useAdminRefreshAccountMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminAccountsApi.refresh(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.accounts.detail(id) })
    }
  })
}

export function useAdminBulkUpdateAccountsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkUpdateAccountsRequest) => adminAccountsApi.bulkUpdate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.accounts.all })
    }
  })
}

// ============================================
// Proxies Hooks
// ============================================
export function useAdminProxiesQuery(params?: Ref<PaginationParams>, options?: UseQueryOptions) {
  const queryParams = computed(() => params?.value)
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.proxies.list(queryParams.value)),
    queryFn: () => adminProxiesApi.list(queryParams.value),
    ...options
  })
}

export function useAdminAllProxiesQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.proxies.list(),
    queryFn: () => adminProxiesApi.getAll(),
    ...options
  })
}

export function useAdminCreateProxyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateProxyRequest) => adminProxiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.proxies.all })
    }
  })
}

export function useAdminUpdateProxyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProxyRequest }) =>
      adminProxiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.proxies.all })
    }
  })
}

export function useAdminDeleteProxyMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminProxiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.proxies.all })
    }
  })
}

// ============================================
// Redeem Codes Hooks
// ============================================
export function useAdminRedeemCodesQuery(params?: Ref<PaginationParams>, options?: UseQueryOptions) {
  const queryParams = computed(() => params?.value)
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.redeemCodes.list(queryParams.value)),
    queryFn: () => adminRedeemCodesApi.list(queryParams.value),
    ...options
  })
}

export function useAdminRedeemCodesStatsQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.redeemCodes.stats(),
    queryFn: () => adminRedeemCodesApi.getStats(),
    ...options
  })
}

export function useAdminGenerateRedeemCodesMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: GenerateRedeemCodesRequest) => adminRedeemCodesApi.generate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.redeemCodes.all })
    }
  })
}

export function useAdminDeleteRedeemCodeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminRedeemCodesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.redeemCodes.all })
    }
  })
}

// ============================================
// Promo Codes Hooks
// ============================================
export function useAdminPromoCodesQuery(params?: Ref<PaginationParams>, options?: UseQueryOptions) {
  const queryParams = computed(() => params?.value)
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.promoCodes.list(queryParams.value)),
    queryFn: () => adminPromoCodesApi.list(queryParams.value),
    ...options
  })
}

export function useAdminCreatePromoCodeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePromoCodeRequest) => adminPromoCodesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.promoCodes.all })
    }
  })
}

export function useAdminUpdatePromoCodeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePromoCodeRequest }) =>
      adminPromoCodesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.promoCodes.all })
    }
  })
}

export function useAdminDeletePromoCodeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminPromoCodesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.promoCodes.all })
    }
  })
}

// ============================================
// Announcements Hooks
// ============================================
export function useAdminAnnouncementsQuery(params?: Ref<PaginationParams>, options?: UseQueryOptions) {
  const queryParams = computed(() => params?.value)
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.announcements.list(queryParams.value)),
    queryFn: () => adminAnnouncementsApi.list(queryParams.value),
    ...options
  })
}

export function useAdminCreateAnnouncementMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAnnouncementRequest) => adminAnnouncementsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.announcements.all })
    }
  })
}

export function useAdminUpdateAnnouncementMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAnnouncementRequest }) =>
      adminAnnouncementsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.announcements.all })
    }
  })
}

export function useAdminDeleteAnnouncementMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminAnnouncementsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.announcements.all })
    }
  })
}

// ============================================
// Settings Hooks
// ============================================
export function useAdminSettingsQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.settings.detail(),
    queryFn: () => adminSettingsApi.get(),
    ...options
  })
}

export function useAdminUpdateSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateSystemSettingsRequest) => adminSettingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.settings.all })
    }
  })
}

export function useAdminTestSmtpMutation() {
  return useMutation({
    mutationFn: () => adminSettingsApi.testSmtp()
  })
}

// ============================================
// Model Pricing Hooks
// ============================================
export function useAdminModelPricingStatusQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.modelPricing.status(),
    queryFn: () => adminModelPricingApi.getStatus(),
    ...options
  })
}

export function useAdminModelPricingQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.modelPricing.list(),
    queryFn: () => adminModelPricingApi.download(),
    ...options
  })
}

export function useAdminSyncModelPricingMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => adminModelPricingApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.modelPricing.all })
    }
  })
}

// ============================================
// Subscriptions Hooks
// ============================================
export function useAdminSubscriptionsQuery(params?: Ref<PaginationParams>, options?: UseQueryOptions) {
  const queryParams = computed(() => params?.value)
  return useQuery({
    queryKey: computed(() => ADMIN_KEYS.subscriptions.list(queryParams.value)),
    queryFn: () => adminSubscriptionsApi.list(queryParams.value),
    ...options
  })
}

export function useAdminAssignSubscriptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AssignSubscriptionRequest) => adminSubscriptionsApi.assign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.subscriptions.all })
    }
  })
}

export function useAdminBulkAssignSubscriptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: BulkAssignSubscriptionRequest) => adminSubscriptionsApi.bulkAssign(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.subscriptions.all })
    }
  })
}

export function useAdminExtendSubscriptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ExtendSubscriptionRequest }) =>
      adminSubscriptionsApi.extend(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.subscriptions.all })
    }
  })
}

export function useAdminRevokeSubscriptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminSubscriptionsApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.subscriptions.all })
    }
  })
}

// ============================================
// Ops Hooks
// ============================================
export function useAdminOpsOverviewQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.ops.dashboard.overview(),
    queryFn: () => adminOpsApi.getDashboardOverview(),
    refetchInterval: 10000,
    ...options
  })
}

export function useAdminOpsConcurrencyQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.ops.concurrency(),
    queryFn: () => adminOpsApi.getConcurrency(),
    refetchInterval: 5000,
    ...options
  })
}

export function useAdminOpsAlertRulesQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.ops.alertRules(),
    queryFn: () => adminOpsApi.getAlertRules(),
    ...options
  })
}

export function useAdminCreateAlertRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAlertRuleRequest) => adminOpsApi.createAlertRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.ops.alertRules() })
    }
  })
}

export function useAdminUpdateAlertRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateAlertRuleRequest }) =>
      adminOpsApi.updateAlertRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.ops.alertRules() })
    }
  })
}

export function useAdminDeleteAlertRuleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => adminOpsApi.deleteAlertRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.ops.alertRules() })
    }
  })
}

// ============================================
// System Hooks
// ============================================
export function useAdminSystemVersionQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.system.version(),
    queryFn: () => adminSystemApi.getVersion(),
    ...options
  })
}

export function useAdminCheckUpdatesQuery(options?: UseQueryOptions) {
  return useQuery({
    queryKey: ADMIN_KEYS.system.updates(),
    queryFn: () => adminSystemApi.checkUpdates(),
    ...options
  })
}

export function useAdminSystemUpdateMutation() {
  return useMutation({
    mutationFn: () => adminSystemApi.update()
  })
}

export function useAdminSystemRestartMutation() {
  return useMutation({
    mutationFn: () => adminSystemApi.restart()
  })
}
