<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      </div>

      <div v-else class="grid gap-6 lg:grid-cols-[280px,1fr]">
        <!-- Desktop Sidebar -->
        <aside class="hidden lg:block">
          <div class="sticky top-24 space-y-4">
            <div class="card p-4">
              <div class="flex items-center gap-2">
                <Icon name="search" size="sm" class="text-gray-400 dark:text-dark-400" />
                <input
                  v-model="sectionQuery"
                  type="text"
                  class="input h-9 flex-1"
                  :placeholder="t('common.search')"
                />
              </div>
            </div>

            <div class="card p-2">
              <nav class="space-y-1">
                <button
                  v-for="item in filteredNavItems"
                  :key="item.id"
                  type="button"
                  class="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors"
                  :class="
                    activeSectionId === item.id
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-200'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-dark-200 dark:hover:bg-dark-900/40'
                  "
                  @click="scrollToSection(item.id)"
                >
                  {{ item.label }}
                </button>
              </nav>
            </div>
          </div>
        </aside>

        <!-- Settings Form -->
        <form @submit.prevent="saveSettings" class="space-y-6">
          <!-- Sticky Header -->
          <div
            class="sticky top-20 z-20 rounded-2xl border border-gray-200 bg-white/80 p-4 backdrop-blur dark:border-dark-700 dark:bg-dark-950/50 md:top-24 md:p-6"
          >
            <div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <Icon name="cog" size="md" class="text-primary-600 dark:text-primary-400" />
                  <h1 class="text-xl font-semibold text-gray-900 dark:text-white">
                    {{ t('admin.settings.title') }}
                  </h1>
                </div>
                <p class="mt-1 text-sm text-gray-500 dark:text-dark-400">
                  {{ t('admin.settings.description') }}
                </p>
              </div>

              <button type="submit" :disabled="savingAny || !hasUnsavedChanges" class="btn btn-primary">
                <svg v-if="savingAny" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{ savingAny ? t('admin.settings.saving') : t('admin.settings.saveSettings') }}
              </button>
            </div>
          </div>

          <!-- Mobile Jump -->
          <div class="card p-4 lg:hidden">
            <label class="input-label">{{ t('admin.settings.jumpToSection') }}</label>
            <select v-model="mobileSectionJump" class="input" @change="scrollToSection(mobileSectionJump)">
              <option v-for="item in navItems" :key="item.id" :value="item.id">{{ item.label }}</option>
            </select>
          </div>

          <!-- Admin API Key Settings -->
          <section
            :id="SECTION_IDS.adminApiKey"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.adminApiKey)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.adminApiKey.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.adminApiKey.description') }}
            </p>
          </div>
          <div class="space-y-4 p-6">
            <!-- Security Warning -->
            <div
              class="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
            >
              <div class="flex items-start">
                <Icon
                  name="exclamationTriangle"
                  size="md"
                  class="mt-0.5 flex-shrink-0 text-amber-500"
                />
                <p class="ml-3 text-sm text-amber-700 dark:text-amber-300">
                  {{ t('admin.settings.adminApiKey.securityWarning') }}
                </p>
              </div>
            </div>

            <!-- Loading State -->
            <div v-if="adminApiKeyLoading" class="flex items-center gap-2 text-gray-500">
              <div class="h-4 w-4 animate-spin rounded-full border-b-2 border-primary-600"></div>
              {{ t('common.loading') }}
            </div>

            <!-- No Key Configured -->
            <div v-else-if="!adminApiKeyExists" class="flex items-center justify-between">
              <span class="text-gray-500 dark:text-gray-400">
                {{ t('admin.settings.adminApiKey.notConfigured') }}
              </span>
              <button
                type="button"
                @click="createAdminApiKey"
                :disabled="adminApiKeyOperating"
                class="btn btn-primary btn-sm"
              >
                <svg
                  v-if="adminApiKeyOperating"
                  class="mr-1 h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{
                  adminApiKeyOperating
                    ? t('admin.settings.adminApiKey.creating')
                    : t('admin.settings.adminApiKey.create')
                }}
              </button>
            </div>

            <!-- Key Exists -->
            <div v-else class="space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.adminApiKey.currentKey') }}
                  </label>
                  <code
                    class="rounded bg-gray-100 px-2 py-1 font-mono text-sm text-gray-900 dark:bg-dark-700 dark:text-gray-100"
                  >
                    {{ adminApiKeyMasked }}
                  </code>
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    @click="regenerateAdminApiKey"
                    :disabled="adminApiKeyOperating"
                    class="btn btn-secondary btn-sm"
                  >
                    {{
                      adminApiKeyOperating
                        ? t('admin.settings.adminApiKey.regenerating')
                        : t('admin.settings.adminApiKey.regenerate')
                    }}
                  </button>
                  <button
                    type="button"
                    @click="deleteAdminApiKey"
                    :disabled="adminApiKeyOperating"
                    class="btn btn-secondary btn-sm text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    {{ t('admin.settings.adminApiKey.delete') }}
                  </button>
                </div>
              </div>

              <!-- Newly Generated Key Display -->
              <div
                v-if="newAdminApiKey"
                class="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20"
              >
                <p class="text-sm font-medium text-green-700 dark:text-green-300">
                  {{ t('admin.settings.adminApiKey.keyWarning') }}
                </p>
                <div class="flex items-center gap-2">
                  <code
                    class="flex-1 select-all break-all rounded border border-green-300 bg-white px-3 py-2 font-mono text-sm dark:border-green-700 dark:bg-dark-800"
                  >
                    {{ newAdminApiKey }}
                  </code>
                  <button
                    type="button"
                    @click="copyNewKey"
                    class="btn btn-primary btn-sm flex-shrink-0"
                  >
                    {{ t('admin.settings.adminApiKey.copyKey') }}
                  </button>
                </div>
                <p class="text-xs text-green-600 dark:text-green-400">
                  {{ t('admin.settings.adminApiKey.usage') }}
                </p>
              </div>
            </div>
          </div>
        </div>
          </section>

          <!-- Stream Timeout Settings -->
          <section
            :id="SECTION_IDS.streamTimeout"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.streamTimeout)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.streamTimeout.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.streamTimeout.description') }}
            </p>
          </div>
          <div class="space-y-5 p-6">
            <!-- Loading State -->
            <div v-if="streamTimeoutLoading" class="flex items-center gap-2 text-gray-500">
              <div class="h-4 w-4 animate-spin rounded-full border-b-2 border-primary-600"></div>
              {{ t('common.loading') }}
            </div>

            <template v-else>
              <!-- Enable Stream Timeout -->
              <div class="flex items-center justify-between">
                <div>
                  <label class="font-medium text-gray-900 dark:text-white">{{
                    t('admin.settings.streamTimeout.enabled')
                  }}</label>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.streamTimeout.enabledHint') }}
                  </p>
                </div>
                <Toggle v-model="streamTimeoutForm.enabled" />
              </div>

              <!-- Settings - Only show when enabled -->
              <div
                v-if="streamTimeoutForm.enabled"
                class="space-y-4 border-t border-gray-100 pt-4 dark:border-dark-700"
              >
                <!-- Action -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.streamTimeout.action') }}
                  </label>
                  <select v-model="streamTimeoutForm.action" class="input w-64">
                    <option value="temp_unsched">{{ t('admin.settings.streamTimeout.actionTempUnsched') }}</option>
                    <option value="error">{{ t('admin.settings.streamTimeout.actionError') }}</option>
                    <option value="none">{{ t('admin.settings.streamTimeout.actionNone') }}</option>
                  </select>
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.streamTimeout.actionHint') }}
                  </p>
                </div>

                <!-- Temp Unsched Minutes (only show when action is temp_unsched) -->
                <div v-if="streamTimeoutForm.action === 'temp_unsched'">
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.streamTimeout.tempUnschedMinutes') }}
                  </label>
                  <input
                    v-model.number="streamTimeoutForm.temp_unsched_minutes"
                    type="number"
                    min="1"
                    max="60"
                    class="input w-32"
                  />
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.streamTimeout.tempUnschedMinutesHint') }}
                  </p>
                </div>

                <!-- Threshold Count -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.streamTimeout.thresholdCount') }}
                  </label>
                  <input
                    v-model.number="streamTimeoutForm.threshold_count"
                    type="number"
                    min="1"
                    max="10"
                    class="input w-32"
                  />
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.streamTimeout.thresholdCountHint') }}
                  </p>
                </div>

                <!-- Threshold Window Minutes -->
                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.streamTimeout.thresholdWindowMinutes') }}
                  </label>
                  <input
                    v-model.number="streamTimeoutForm.threshold_window_minutes"
                    type="number"
                    min="1"
                    max="60"
                    class="input w-32"
                  />
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.streamTimeout.thresholdWindowMinutesHint') }}
                  </p>
                </div>
              </div>

            </template>
          </div>
        </div>
          </section>

          <!-- Gateway Settings -->
          <section
            :id="SECTION_IDS.gateway"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.gateway)"
          >
            <div class="card">
              <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ t('admin.settings.gateway.title') }}
                </h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.gateway.description') }}
                </p>
              </div>
              <div class="space-y-5 p-6">
                <div class="flex items-center justify-between">
                  <div>
                    <label class="font-medium text-gray-900 dark:text-white">{{
                      t('admin.settings.gateway.fixOrphanedToolResults')
                    }}</label>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ t('admin.settings.gateway.fixOrphanedToolResultsHint') }}
                    </p>
                  </div>
                  <Toggle v-model="form.gateway_fix_orphaned_tool_results" />
                </div>

                <div class="space-y-2 border-t border-gray-100 pt-4 dark:border-dark-700">
                  <div class="flex justify-end">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      @click="resetGatewayFailoverKeywordsToDefault"
                    >
                      {{ t('admin.settings.gateway.restoreDefaults') }}
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.gateway.defaultKeywordCount', gatewayDefaultKeywordCounts) }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.gateway.currentKeywordCount', gatewayCurrentKeywordCounts) }}
                  </p>
                  <div ref="gatewayStatusHelpRef" class="space-y-1">
                    <div class="flex items-center gap-2">
                      <p
                        class="flex items-center gap-1.5 text-xs font-medium"
                        :class="{
                          'text-green-600 dark:text-green-400': gatewayKeywordStatus.tone === 'green',
                          'text-amber-600 dark:text-amber-400': gatewayKeywordStatus.tone === 'yellow',
                          'text-gray-500 dark:text-gray-300': gatewayKeywordStatus.tone === 'gray'
                        }"
                      >
                        <span
                          class="h-2 w-2 rounded-full"
                          :class="{
                            'bg-green-500 dark:bg-green-400': gatewayKeywordStatus.tone === 'green',
                            'bg-amber-500 dark:bg-amber-400': gatewayKeywordStatus.tone === 'yellow',
                            'bg-gray-400 dark:bg-gray-500': gatewayKeywordStatus.tone === 'gray'
                          }"
                        ></span>
                        {{ gatewayKeywordStatus.text }}
                      </p>
                      <button
                        type="button"
                        class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 text-[11px] font-semibold text-gray-500 transition-colors hover:bg-gray-100 dark:border-dark-600 dark:text-gray-300 dark:hover:bg-dark-700"
                        :aria-expanded="gatewayStatusHelpOpen"
                        :aria-controls="gatewayStatusHelpId"
                        :aria-label="gatewayKeywordStatus.tooltip"
                        @click="toggleGatewayStatusHelp"
                      >
                        ?
                      </button>
                    </div>
                    <p
                      v-if="gatewayStatusHelpOpen"
                      :id="gatewayStatusHelpId"
                      class="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300"
                    >
                      {{ gatewayKeywordStatus.tooltip }}
                    </p>
                  </div>
                </div>

                <div class="border-t border-gray-100 pt-4 dark:border-dark-700">
                  <label class="mb-2 block font-medium text-gray-900 dark:text-white">
                    {{ t('admin.settings.gateway.failoverSensitive400Keywords') }}
                  </label>
                  <textarea
                    :value="keywordListToTextarea(form.gateway_failover_sensitive_400_keywords)"
                    rows="4"
                    class="input font-mono text-sm"
                    :placeholder="t('admin.settings.gateway.keywordsPlaceholder')"
                    @input="onGatewayKeywordInput('gateway_failover_sensitive_400_keywords', $event)"
                  ></textarea>
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.gateway.failoverSensitive400KeywordsHint') }}
                  </p>
                </div>

                <div class="border-t border-gray-100 pt-4 dark:border-dark-700">
                  <label class="mb-2 block font-medium text-gray-900 dark:text-white">
                    {{ t('admin.settings.gateway.failoverTemporary400Keywords') }}
                  </label>
                  <textarea
                    :value="keywordListToTextarea(form.gateway_failover_temporary_400_keywords)"
                    rows="4"
                    class="input font-mono text-sm"
                    :placeholder="t('admin.settings.gateway.keywordsPlaceholder')"
                    @input="onGatewayKeywordInput('gateway_failover_temporary_400_keywords', $event)"
                  ></textarea>
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.gateway.failoverTemporary400KeywordsHint') }}
                  </p>
                </div>

                <div class="border-t border-gray-100 pt-4 dark:border-dark-700">
                  <label class="mb-2 block font-medium text-gray-900 dark:text-white">
                    {{ t('admin.settings.gateway.failoverRequestErrorKeywords') }}
                  </label>
                  <textarea
                    :value="keywordListToTextarea(form.gateway_failover_request_error_keywords)"
                    rows="4"
                    class="input font-mono text-sm"
                    :placeholder="t('admin.settings.gateway.keywordsPlaceholder')"
                    @input="onGatewayKeywordInput('gateway_failover_request_error_keywords', $event)"
                  ></textarea>
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.gateway.failoverRequestErrorKeywordsHint') }}
                  </p>
                </div>

                <div class="border-t border-gray-100 pt-4 dark:border-dark-700">
                  <label class="mb-2 block font-medium text-gray-900 dark:text-white">
                    {{ t('admin.settings.gateway.codexModelAliases') }}
                  </label>
                  <textarea
                    :value="gatewayCodexAliasesRaw"
                    rows="6"
                    class="input font-mono text-sm"
                    :placeholder="t('admin.settings.gateway.codexModelAliasesPlaceholder')"
                    @input="onGatewayCodexAliasesInput($event)"
                  ></textarea>
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.gateway.codexModelAliasesHint', { count: gatewayCodexAliasCount }) }}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <!-- Registration Settings -->
          <section
            :id="SECTION_IDS.registration"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.registration)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.registration.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.registration.description') }}
            </p>
          </div>
          <div class="space-y-5 p-6">
            <!-- Enable Registration -->
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.registration.enableRegistration')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.registration.enableRegistrationHint') }}
                </p>
              </div>
              <Toggle v-model="form.registration_enabled" />
            </div>

            <!-- Email Verification -->
            <div
              class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-700"
            >
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.registration.emailVerification')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.registration.emailVerificationHint') }}
                </p>
              </div>
              <Toggle v-model="form.email_verify_enabled" />
            </div>

            <!-- Promo Code -->
            <div
              class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-700"
            >
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.registration.promoCode')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.registration.promoCodeHint') }}
                </p>
              </div>
              <Toggle v-model="form.promo_code_enabled" />
            </div>

            <!-- Password Reset - Only show when email verification is enabled -->
            <div
              v-if="form.email_verify_enabled"
              class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-700"
            >
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.registration.passwordReset')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.registration.passwordResetHint') }}
                </p>
              </div>
              <Toggle v-model="form.password_reset_enabled" />
            </div>

            <!-- TOTP 2FA -->
            <div
              class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-700"
            >
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.registration.totp')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.registration.totpHint') }}
                </p>
                <!-- Warning when encryption key not configured -->
                <p
                  v-if="!form.totp_encryption_key_configured"
                  class="mt-2 text-sm text-amber-600 dark:text-amber-400"
                >
                  {{ t('admin.settings.registration.totpKeyNotConfigured') }}
                </p>
              </div>
              <Toggle
                v-model="form.totp_enabled"
                :disabled="!form.totp_encryption_key_configured"
              />
            </div>
          </div>
        </div>
          </section>

          <!-- Referral Settings -->
          <section
            :id="SECTION_IDS.referral"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.referral)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.referral.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.referral.description') }}
            </p>
          </div>
          <div class="space-y-5 p-6">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.referral.inviterBonus') }}
                </label>
                <input
                  v-model.number="form.referral_inviter_bonus"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input font-mono text-sm"
                  placeholder="0"
                />
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.referral.inviterBonusHint') }}
                </p>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.referral.inviteeBonus') }}
                </label>
                <input
                  v-model.number="form.referral_invitee_bonus"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input font-mono text-sm"
                  placeholder="0"
                />
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.referral.inviteeBonusHint') }}
                </p>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.referral.commissionRate') }}
                </label>
                <input
                  v-model.number="form.referral_commission_rate"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  class="input font-mono text-sm"
                  placeholder="0"
                />
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.referral.commissionRateHint') }}
                </p>
              </div>
            </div>
          </div>
        </div>
          </section>

          <!-- Cloudflare Turnstile Settings -->
          <section
            :id="SECTION_IDS.turnstile"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.turnstile)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.turnstile.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.turnstile.description') }}
            </p>
          </div>
          <div class="space-y-5 p-6">
            <!-- Enable Turnstile -->
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.turnstile.enableTurnstile')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.turnstile.enableTurnstileHint') }}
                </p>
              </div>
              <Toggle v-model="form.turnstile_enabled" />
            </div>

            <!-- Turnstile Keys - Only show when enabled -->
            <div
              v-if="form.turnstile_enabled"
              class="border-t border-gray-100 pt-4 dark:border-dark-700"
            >
              <div class="grid grid-cols-1 gap-6">
                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.turnstile.siteKey') }}
                  </label>
                  <input
                    v-model="form.turnstile_site_key"
                    type="text"
                    class="input font-mono text-sm"
                    placeholder="0x4AAAAAAA..."
                  />
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.turnstile.siteKeyHint') }}
                    <a
                      href="https://dash.cloudflare.com/"
                      target="_blank"
                      class="text-primary-600 hover:text-primary-500"
                      >{{ t('admin.settings.turnstile.cloudflareDashboard') }}</a
                    >
                  </p>
                </div>
                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.turnstile.secretKey') }}
                  </label>
                  <input
                    v-model="form.turnstile_secret_key"
                    type="password"
                    class="input font-mono text-sm"
                    placeholder="0x4AAAAAAA..."
                  />
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{
                      form.turnstile_secret_key_configured
                        ? t('admin.settings.turnstile.secretKeyConfiguredHint')
                        : t('admin.settings.turnstile.secretKeyHint')
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- LinuxDo Connect OAuth 登录 -->
          </section>

          <!-- LinuxDo Connect OAuth -->
          <section
            :id="SECTION_IDS.linuxdo"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.linuxdo)"
          >
            <div class="card">
              <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ t('admin.settings.linuxdo.title') }}
                </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.linuxdo.description') }}
            </p>
          </div>
          <div class="space-y-5 p-6">
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.linuxdo.enable')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.linuxdo.enableHint') }}
                </p>
              </div>
              <Toggle v-model="form.linuxdo_connect_enabled" />
            </div>

            <div
              v-if="form.linuxdo_connect_enabled"
              class="border-t border-gray-100 pt-4 dark:border-dark-700"
            >
              <div class="grid grid-cols-1 gap-6">
                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.linuxdo.clientId') }}
                  </label>
                  <input
                    v-model="form.linuxdo_connect_client_id"
                    type="text"
                    class="input font-mono text-sm"
                    :placeholder="t('admin.settings.linuxdo.clientIdPlaceholder')"
                  />
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.linuxdo.clientIdHint') }}
                  </p>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.linuxdo.clientSecret') }}
                  </label>
                  <input
                    v-model="form.linuxdo_connect_client_secret"
                    type="password"
                    class="input font-mono text-sm"
                    :placeholder="
                      form.linuxdo_connect_client_secret_configured
                        ? t('admin.settings.linuxdo.clientSecretConfiguredPlaceholder')
                        : t('admin.settings.linuxdo.clientSecretPlaceholder')
                    "
                  />
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{
                      form.linuxdo_connect_client_secret_configured
                        ? t('admin.settings.linuxdo.clientSecretConfiguredHint')
                        : t('admin.settings.linuxdo.clientSecretHint')
                    }}
                  </p>
                </div>

                <div>
                  <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.linuxdo.redirectUrl') }}
                  </label>
                  <input
                    v-model="form.linuxdo_connect_redirect_url"
                    type="url"
                    class="input font-mono text-sm"
                    :placeholder="t('admin.settings.linuxdo.redirectUrlPlaceholder')"
                  />
                  <div class="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm w-fit"
                      @click="setAndCopyLinuxdoRedirectUrl"
                    >
                      {{ t('admin.settings.linuxdo.quickSetCopy') }}
                    </button>
                    <code
                      v-if="linuxdoRedirectUrlSuggestion"
                      class="select-all break-all rounded bg-gray-50 px-2 py-1 font-mono text-xs text-gray-600 dark:bg-dark-800 dark:text-gray-300"
                    >
                      {{ linuxdoRedirectUrlSuggestion }}
                    </code>
                  </div>
                  <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.linuxdo.redirectUrlHint') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
          </section>

          <!-- Default Settings -->
          <section
            :id="SECTION_IDS.defaults"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.defaults)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.defaults.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.defaults.description') }}
            </p>
          </div>
          <div class="p-6">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.defaults.defaultBalance') }}
                </label>
                <input
                  v-model.number="form.default_balance"
                  type="number"
                  step="0.01"
                  min="0"
                  class="input"
                  placeholder="0.00"
                />
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.defaults.defaultBalanceHint') }}
                </p>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.defaults.defaultConcurrency') }}
                </label>
                <input
                  v-model.number="form.default_concurrency"
                  type="number"
                  min="1"
                  class="input"
                  placeholder="1"
                />
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.defaults.defaultConcurrencyHint') }}
                </p>
              </div>
            </div>
          </div>
        </div>
          </section>

          <!-- Site Settings -->
          <section
            :id="SECTION_IDS.site"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.site)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.site.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.site.description') }}
            </p>
          </div>
          <div class="p-6">
            <div class="tabs">
              <button
                type="button"
                class="tab"
                :class="{ 'tab-active': siteSettingsTab === 'general' }"
                @click="siteSettingsTab = 'general'"
              >
                {{ t('admin.settings.site.tabs.general') }}
              </button>
              <button
                type="button"
                class="tab"
                :class="{ 'tab-active': siteSettingsTab === 'home' }"
                @click="siteSettingsTab = 'home'"
              >
                {{ t('admin.settings.site.tabs.home') }}
              </button>
              <button
                type="button"
                class="tab"
                :class="{ 'tab-active': siteSettingsTab === 'subscriptions' }"
                @click="siteSettingsTab = 'subscriptions'"
              >
                {{ t('admin.settings.site.tabs.subscriptions') }}
              </button>
            </div>

            <div v-show="siteSettingsTab === 'general'" class="mt-6 space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.site.siteName') }}
                </label>
                <input
                  v-model="form.site_name"
                  type="text"
                  class="input"
                  :placeholder="t('admin.settings.site.siteNamePlaceholder')"
                />
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.site.siteNameHint') }}
                </p>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.site.siteSubtitle') }}
                </label>
                <input
                  v-model="form.site_subtitle"
                  type="text"
                  class="input"
                  :placeholder="t('admin.settings.site.siteSubtitlePlaceholder')"
                />
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.site.siteSubtitleHint') }}
                </p>
              </div>
            </div>

            <!-- API Base URL -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('admin.settings.site.apiBaseUrl') }}
              </label>
              <input
                v-model="form.api_base_url"
                type="text"
                class="input font-mono text-sm"
                :placeholder="t('admin.settings.site.apiBaseUrlPlaceholder')"
              />
              <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {{ t('admin.settings.site.apiBaseUrlHint') }}
              </p>
            </div>

            <!-- Contact Info -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('admin.settings.site.contactInfo') }}
              </label>
              <input
                v-model="form.contact_info"
                type="text"
                class="input"
                :placeholder="t('admin.settings.site.contactInfoPlaceholder')"
              />
              <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {{ t('admin.settings.site.contactInfoHint') }}
              </p>
            </div>

            <!-- Doc URL -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('admin.settings.site.docUrl') }}
              </label>
              <input
                v-model="form.doc_url"
                type="url"
                class="input font-mono text-sm"
                :placeholder="t('admin.settings.site.docUrlPlaceholder')"
              />
              <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {{ t('admin.settings.site.docUrlHint') }}
              </p>
            </div>

            <!-- Site Logo Upload -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('admin.settings.site.siteLogo') }}
              </label>
              <div class="flex items-start gap-6">
                <!-- Logo Preview -->
                <div class="flex-shrink-0">
                  <div
                    class="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 dark:border-dark-600 dark:bg-dark-800"
                    :class="{ 'border-solid': form.site_logo }"
                  >
                    <img
                      v-if="form.site_logo"
                      :src="form.site_logo"
                      alt="Site Logo"
                      class="h-full w-full object-contain"
                    />
                    <svg
                      v-else
                      class="h-8 w-8 text-gray-400 dark:text-dark-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
                <!-- Upload Controls -->
                <div class="flex-1 space-y-3">
                  <div class="flex items-center gap-3">
                    <label class="btn btn-secondary btn-sm cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        class="hidden"
                        @change="handleLogoUpload"
                      />
                      <Icon name="upload" size="sm" class="mr-1.5" :stroke-width="2" />
                      {{ t('admin.settings.site.uploadImage') }}
                    </label>
                    <button
                      v-if="form.site_logo"
                      type="button"
                      @click="form.site_logo = ''"
                      class="btn btn-secondary btn-sm text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Icon name="trash" size="sm" class="mr-1.5" :stroke-width="2" />
                      {{ t('admin.settings.site.remove') }}
                    </button>
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.site.logoHint') }}
                  </p>
                  <p v-if="logoError" class="text-xs text-red-500">{{ logoError }}</p>
                </div>
              </div>
            </div>

            </div>

            <div v-show="siteSettingsTab === 'home'" class="mt-6 space-y-6">
              <!-- Home Content -->
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.site.homeContent') }}
                </label>
                <textarea
                  v-model="form.home_content"
                  rows="6"
                  class="input font-mono text-sm"
                  :placeholder="t('admin.settings.site.homeContentPlaceholder')"
                ></textarea>
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.site.homeContentHint') }}
                </p>
                <!-- iframe CSP Warning -->
                <p class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  {{ t('admin.settings.site.homeContentIframeWarning') }}
                </p>
              </div>
            </div>

            <div v-show="siteSettingsTab === 'subscriptions'" class="mt-6 space-y-6">
              <div class="rounded-xl border border-gray-200/70 bg-white/50 dark:border-dark-700/60 dark:bg-dark-900/20">
                <!-- Subscriptions Feature Toggle -->
                <div class="flex items-center justify-between p-4">
                  <div>
                    <label class="font-medium text-gray-900 dark:text-white">{{
                      t('admin.settings.site.subscriptionsEnabled')
                    }}</label>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ t('admin.settings.site.subscriptionsEnabledHint') }}
                    </p>
                  </div>
                  <Toggle v-model="form.subscriptions_enabled" />
                </div>

                <!-- Landing Pricing Toggle -->
                <div class="flex items-center justify-between border-t border-gray-200/70 p-4 dark:border-dark-700/60">
                  <div>
                    <label class="font-medium text-gray-900 dark:text-white">{{
                      t('admin.settings.site.landingPricingEnabled')
                    }}</label>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ t('admin.settings.site.landingPricingEnabledHint') }}
                    </p>
                  </div>
                  <Toggle v-model="form.landing_pricing_enabled" />
                </div>
              </div>

              <div
                v-if="!form.landing_pricing_enabled"
                class="rounded-xl border border-gray-200/70 bg-gray-50 p-4 text-sm text-gray-700 dark:border-dark-700/60 dark:bg-dark-900/20 dark:text-dark-200"
              >
                {{ t('admin.settings.site.landingPricingDisabledHint') }}
              </div>

              <!-- Landing Pricing Config -->
              <div
                v-show="form.landing_pricing_enabled"
                class="rounded-xl border border-gray-200/70 bg-white/50 p-4 dark:border-dark-700/60 dark:bg-dark-900/20"
              >
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ t('admin.settings.site.landingPricingConfig') }}
                  </label>
                <div class="flex flex-wrap items-center gap-2">
                  <div class="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 dark:border-dark-600 dark:bg-dark-900/30">
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="landingPricingEditorMode === 'ui' ? 'btn-primary' : 'btn-secondary'"
                      @click="landingPricingEditorMode = 'ui'"
                    >
                      {{ t('admin.settings.site.landingPricingEditor.ui') }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm"
                      :class="landingPricingEditorMode === 'json' ? 'btn-primary' : 'btn-secondary'"
                      @click="landingPricingEditorMode = 'json'"
                    >
                      JSON
                    </button>
                  </div>

                  <button
                    v-if="landingPricingEditorMode === 'json'"
                    type="button"
                    class="btn btn-secondary btn-sm"
                    @click="formatLandingPricingConfig"
                  >
                    <Icon name="sparkles" size="sm" class="mr-1.5" :stroke-width="2" />
                    {{ t('common.format') }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    @click="resetLandingPricingConfig"
                  >
                    <Icon name="refresh" size="sm" class="mr-1.5" :stroke-width="2" />
                    {{ t('common.reset') }}
                  </button>
                  <router-link to="/home#pricing" class="btn btn-secondary btn-sm">
                    <Icon name="eye" size="sm" class="mr-1.5" :stroke-width="2" />
                    {{ t('common.preview') }}
                  </router-link>
                </div>
              </div>

              <!-- UI editor -->
              <div v-if="landingPricingEditorMode === 'ui'" class="mt-3 space-y-6">
                <!-- Basic -->
                <div class="grid gap-4 md:grid-cols-2">
                  <div>
                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.defaultTab') }}</label>
                    <select v-model="landingPricingDraft.default_tab" class="input">
                      <option value="subscription">{{ t('admin.settings.site.landingPricingEditor.tab.subscription') }}</option>
                      <option value="payg">{{ t('admin.settings.site.landingPricingEditor.tab.payg') }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.currency') }}</label>
                    <input class="input" value="CNY" disabled />
                  </div>
                </div>

                <!-- Subscription header -->
                <div class="grid gap-4 md:grid-cols-2">
                  <div>
                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.subscriptionTitle') }}</label>
                    <input v-model="landingPricingDraft.subscription.title" type="text" class="input" />
                  </div>
                  <div>
                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.subscriptionSubtitle') }}</label>
                    <input v-model="landingPricingDraft.subscription.subtitle" type="text" class="input" />
                  </div>
                </div>

                <div class="grid gap-4 md:grid-cols-2">
                  <div>
                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.defaultPeriod') }}</label>
                    <select v-model="landingPricingDraft.subscription.default_period" class="input">
                      <option value="week">{{ t('admin.settings.site.landingPricingEditor.period.week') }}</option>
                      <option value="month">{{ t('admin.settings.site.landingPricingEditor.period.month') }}</option>
                      <option value="custom">{{ t('admin.settings.site.landingPricingEditor.period.custom') }}</option>
                    </select>
                  </div>
                </div>

                <!-- Period options -->
                <div>
                  <div class="flex items-center justify-between gap-3">
                    <label class="input-label mb-0">{{ t('admin.settings.site.landingPricingEditor.periodOptions') }}</label>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      @click="landingPricingDraft.subscription.periods.push({ key: 'month', label: '' })"
                    >
                      <Icon name="plus" size="sm" class="mr-1.5" :stroke-width="2" />
                      {{ t('admin.settings.site.landingPricingEditor.add') }}
                    </button>
                  </div>
                  <div class="mt-2 space-y-2">
                    <div
                      v-for="(p, idx) in landingPricingDraft.subscription.periods"
                      :key="idx"
                      class="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-dark-600 md:flex-row md:items-center"
                    >
                      <select v-model="p.key" class="input md:w-40">
                        <option value="week">{{ t('admin.settings.site.landingPricingEditor.period.week') }}</option>
                        <option value="month">{{ t('admin.settings.site.landingPricingEditor.period.month') }}</option>
                        <option value="custom">{{ t('admin.settings.site.landingPricingEditor.period.custom') }}</option>
                      </select>
                      <input
                        v-model="p.label"
                        type="text"
                        class="input flex-1"
                        :placeholder="t('admin.settings.site.landingPricingEditor.periodLabelPlaceholder')"
                      />
                      <button
                        type="button"
                        class="btn btn-ghost btn-sm text-red-500"
                        @click="landingPricingDraft.subscription.periods.splice(idx, 1)"
                      >
                        <Icon name="trash" size="sm" :stroke-width="2" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Plans -->
                <div>
                  <div class="flex items-center justify-between gap-3">
                    <label class="input-label mb-0">{{ t('admin.settings.site.landingPricingEditor.plans') }}</label>
                    <button type="button" class="btn btn-secondary btn-sm" @click="addLandingPricingPlan">
                      <Icon name="plus" size="sm" class="mr-1.5" :stroke-width="2" />
                      {{ t('admin.settings.site.landingPricingEditor.addPlan') }}
                    </button>
                  </div>

                  <div v-if="!landingPricingDraft.subscription.plans.length" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.site.landingPricingEditor.noPlans') }}
                  </div>

                  <div v-else class="mt-2 space-y-3">
                    <div
                      v-for="(plan, idx) in landingPricingDraft.subscription.plans"
                      :key="idx"
                      class="rounded-xl border border-gray-200 p-4 dark:border-dark-600"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div class="text-sm font-medium text-gray-900 dark:text-white">
                          {{ plan.name || t('admin.settings.site.landingPricingEditor.unnamedPlan') }}
                        </div>
                        <button type="button" class="btn btn-ghost btn-sm text-red-500" @click="removeLandingPricingPlan(idx)">
                          <Icon name="trash" size="sm" :stroke-width="2" />
                        </button>
                      </div>

                      <div class="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.planId') }}</label>
                          <input v-model="plan.id" type="text" class="input" placeholder="starter / pro / enterprise" />
                        </div>
                        <div>
                          <label class="input-label">{{ t('common.name') }}</label>
                          <input v-model="plan.name" type="text" class="input" />
                        </div>
                      </div>

                      <div class="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.planBadge') }}</label>
                          <input v-model="plan.badge" type="text" class="input" />
                        </div>
                        <div class="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 dark:border-dark-600">
                          <div>
                            <div class="text-sm font-medium text-gray-900 dark:text-white">
                              {{ t('admin.settings.site.landingPricingEditor.planHighlighted') }}
                            </div>
                            <div class="text-xs text-gray-500 dark:text-gray-400">
                              {{ t('admin.settings.site.landingPricingEditor.planHighlightedHint') }}
                            </div>
                          </div>
                          <Toggle v-model="plan.highlighted" />
                        </div>
                      </div>

                      <div class="mt-3">
                        <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.planDescription') }}</label>
                        <input v-model="plan.description" type="text" class="input" />
                      </div>

                      <!-- Backend binding -->
                      <div class="mt-3 grid gap-4 md:grid-cols-2">
                        <div>
                          <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.planGroup') }}</label>
                          <select v-model.number="plan.group_id" class="input">
                            <option :value="0">{{ t('admin.settings.site.landingPricingEditor.planGroupNone') }}</option>
                            <option v-for="g in subscriptionGroupOptions" :key="g.id" :value="g.id">
                              {{ g.name }} (#{{ g.id }})
                            </option>
                          </select>
                          <p v-if="pricingGroupsLoading" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {{ t('common.loading') }}
                          </p>
                          <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {{ t('admin.settings.site.landingPricingEditor.planGroupHint') }}
                          </p>
                        </div>
                        <div v-if="plan.group_id && plan.group_id > 0">
                          <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.validityDays') }}</label>
                          <div class="grid grid-cols-3 gap-2">
                            <input v-model.number="plan.validity_days.week" type="number" min="0" class="input" :placeholder="t('admin.settings.site.landingPricingEditor.period.week')" />
                            <input v-model.number="plan.validity_days.month" type="number" min="0" class="input" :placeholder="t('admin.settings.site.landingPricingEditor.period.month')" />
                            <input v-model.number="plan.validity_days.custom" type="number" min="0" class="input" :placeholder="t('admin.settings.site.landingPricingEditor.period.custom')" />
                          </div>
                          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {{ t('admin.settings.site.landingPricingEditor.validityDaysHint') }}
                          </p>
                        </div>
                      </div>

                      <div v-if="plan.group_id && plan.group_id > 0" class="mt-3">
                        <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.groupFields') }}</label>
                        <div class="flex flex-wrap gap-2">
                          <button
                            v-for="f in pricingGroupFieldOptions"
                            :key="f.key"
                            type="button"
                            class="btn btn-secondary btn-sm"
                            :class="plan.group_fields?.includes(f.key) ? 'btn-primary' : 'btn-secondary'"
                            @click="togglePlanGroupField(plan, f.key)"
                          >
                            {{ f.label }}
                          </button>
                        </div>
                      </div>

                      <!-- Pricing -->
                      <div class="mt-3 grid gap-4 md:grid-cols-3">
                        <div>
                          <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.priceWeek') }}</label>
                          <input v-model.number="plan.price.week" type="number" min="0" class="input" />
                        </div>
                        <div>
                          <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.priceMonth') }}</label>
                          <input v-model.number="plan.price.month" type="number" min="0" class="input" />
                        </div>
                        <div>
                          <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.priceCustom') }}</label>
                          <input v-model="plan.price.custom" type="text" class="input" />
                        </div>
                      </div>

                      <!-- Widgets -->
                      <div class="mt-3">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <label class="input-label mb-0">{{ t('admin.settings.site.landingPricingEditor.widgets') }}</label>
                          <div class="flex flex-wrap gap-2">
                            <button
                              v-for="opt in planWidgetTypeOptions"
                              :key="opt.type"
                              type="button"
                              class="btn btn-secondary btn-sm"
                              :disabled="opt.type === 'group_field' && (!plan.group_id || plan.group_id <= 0)"
                              @click="addPlanWidget(plan, opt.type)"
                            >
                              <Icon name="plus" size="sm" class="mr-1.5" :stroke-width="2" />
                              {{ opt.label }}
                            </button>
                          </div>
                        </div>

                        <p v-if="!plan.meta.widgets.length" class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          {{ t('admin.settings.site.landingPricingEditor.noWidgets') }}
                        </p>

                        <div v-else class="mt-2 space-y-2">
                          <div
                            v-for="(w, wIdx) in plan.meta.widgets"
                            :key="wIdx"
                            class="rounded-lg border border-gray-200 p-3 dark:border-dark-600"
                          >
                            <div class="flex items-center justify-between gap-2">
                              <div class="text-xs font-medium text-gray-900 dark:text-white">
                                {{ t(`admin.settings.site.landingPricingEditor.widgetType.${w.type === 'group_field' ? 'groupField' : w.type}`) }}
                              </div>
                              <div class="flex items-center gap-1">
                                <button
                                  type="button"
                                  class="btn btn-ghost btn-sm"
                                  :disabled="wIdx === 0"
                                  @click="movePlanWidget(plan, wIdx, -1)"
                                >
                                  <Icon name="chevronUp" size="sm" :stroke-width="2" />
                                </button>
                                <button
                                  type="button"
                                  class="btn btn-ghost btn-sm"
                                  :disabled="wIdx === plan.meta.widgets.length - 1"
                                  @click="movePlanWidget(plan, wIdx, 1)"
                                >
                                  <Icon name="chevronDown" size="sm" :stroke-width="2" />
                                </button>
                                <button type="button" class="btn btn-ghost btn-sm text-red-500" @click="removePlanWidget(plan, wIdx)">
                                  <Icon name="trash" size="sm" :stroke-width="2" />
                                </button>
                              </div>
                            </div>

                            <div class="mt-2">
                              <div class="mb-3 flex flex-wrap items-center gap-2">
                                <div class="text-xs text-gray-500 dark:text-gray-400">
                                  {{ t('admin.settings.site.landingPricingEditor.widgetWhen') }}
                                </div>
                                <button
                                  type="button"
                                  class="btn btn-sm"
                                  :class="isWidgetPeriodSelected(w, 'week') ? 'btn-primary' : 'btn-secondary'"
                                  @click="toggleWidgetPeriod(w, 'week')"
                                >
                                  {{ t('admin.settings.site.landingPricingEditor.period.week') }}
                                </button>
                                <button
                                  type="button"
                                  class="btn btn-sm"
                                  :class="isWidgetPeriodSelected(w, 'month') ? 'btn-primary' : 'btn-secondary'"
                                  @click="toggleWidgetPeriod(w, 'month')"
                                >
                                  {{ t('admin.settings.site.landingPricingEditor.period.month') }}
                                </button>
                                <button
                                  type="button"
                                  class="btn btn-sm"
                                  :class="isWidgetPeriodSelected(w, 'custom') ? 'btn-primary' : 'btn-secondary'"
                                  @click="toggleWidgetPeriod(w, 'custom')"
                                >
                                  {{ t('admin.settings.site.landingPricingEditor.period.custom') }}
                                </button>
                                <span
                                  v-if="!w.when?.periods?.length"
                                  class="text-xs text-gray-500 dark:text-gray-400"
                                >
                                  {{ t('admin.settings.site.landingPricingEditor.widgetWhenAll') }}
                                </span>
                              </div>

                              <template v-if="w.type === 'text'">
                                <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.text') }}</label>
                                <input v-model="w.text" type="text" class="input" />
                              </template>

                              <template v-else-if="w.type === 'kv'">
                                <div class="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.label') }}</label>
                                    <input v-model="w.label" type="text" class="input" />
                                  </div>
                                  <div>
                                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.value') }}</label>
                                    <input v-model="w.value" type="text" class="input" />
                                  </div>
                                </div>
                              </template>

                              <template v-else-if="w.type === 'group_field'">
                                <div class="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.groupFieldKey') }}</label>
                                    <select v-model="w.key" class="input">
                                      <option v-for="f in pricingGroupFieldOptions" :key="f.key" :value="f.key">
                                        {{ f.label }}
                                      </option>
                                    </select>
                                  </div>
                                  <div>
                                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.groupFieldLabel') }}</label>
                                    <input v-model="w.label" type="text" class="input" />
                                  </div>
                                </div>
                                <p v-if="!plan.group_id || plan.group_id <= 0" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
                                  {{ t('admin.settings.site.landingPricingEditor.widgetGroupFieldRequiresGroup') }}
                                </p>
                              </template>

                              <template v-else-if="w.type === 'list'">
                                <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.listTitle') }}</label>
                                <input v-model="w.title" type="text" class="input" />
                                <div class="mt-2">
                                  <div class="flex items-center justify-between gap-3">
                                    <label class="input-label mb-0">{{ t('admin.settings.site.landingPricingEditor.widgetField.listItems') }}</label>
                                    <button type="button" class="btn btn-secondary btn-sm" @click="addWidgetListItem(w)">
                                      <Icon name="plus" size="sm" class="mr-1.5" :stroke-width="2" />
                                      {{ t('admin.settings.site.landingPricingEditor.add') }}
                                    </button>
                                  </div>
                                  <div class="mt-2 space-y-2">
                                    <div v-for="(_, itemIdx) in w.items" :key="itemIdx" class="flex items-center gap-2">
                                      <input v-model="w.items[itemIdx]" type="text" class="input flex-1" />
                                      <button type="button" class="btn btn-ghost btn-sm text-red-500" @click="removeWidgetListItem(w, itemIdx)">
                                        <Icon name="trash" size="sm" :stroke-width="2" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </template>

                              <template v-else-if="w.type === 'tags'">
                                <div class="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.tagsTone') }}</label>
                                    <select v-model="w.tone" class="input">
                                      <option value="gray">{{ t('admin.settings.site.landingPricingEditor.widgetTone.gray') }}</option>
                                      <option value="primary">{{ t('admin.settings.site.landingPricingEditor.widgetTone.primary') }}</option>
                                      <option value="gold">{{ t('admin.settings.site.landingPricingEditor.widgetTone.gold') }}</option>
                                    </select>
                                  </div>
                                </div>
                                <div class="mt-2">
                                  <div class="flex items-center justify-between gap-3">
                                    <label class="input-label mb-0">{{ t('admin.settings.site.landingPricingEditor.widgetField.tags') }}</label>
                                    <button type="button" class="btn btn-secondary btn-sm" @click="w.tags.push('')">
                                      <Icon name="plus" size="sm" class="mr-1.5" :stroke-width="2" />
                                      {{ t('admin.settings.site.landingPricingEditor.add') }}
                                    </button>
                                  </div>
                                  <div class="mt-2 space-y-2">
                                    <div v-for="(_, tagIdx) in w.tags" :key="tagIdx" class="flex items-center gap-2">
                                      <input v-model="w.tags[tagIdx]" type="text" class="input flex-1" />
                                      <button type="button" class="btn btn-ghost btn-sm text-red-500" @click="w.tags.splice(tagIdx, 1)">
                                        <Icon name="trash" size="sm" :stroke-width="2" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </template>

                              <template v-else-if="w.type === 'divider'">
                                <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.dividerLabel') }}</label>
                                <input v-model="w.label" type="text" class="input" />
                              </template>

                              <template v-else-if="w.type === 'metric'">
                                <div class="grid gap-3 md:grid-cols-2">
                                  <div>
                                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.metricLabel') }}</label>
                                    <input v-model="w.label" type="text" class="input" />
                                  </div>
                                  <div>
                                    <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.metricValue') }}</label>
                                    <input v-model="w.value" type="text" class="input" />
                                  </div>
                                </div>
                                <div class="mt-2">
                                  <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.widgetField.metricHint') }}</label>
                                  <input v-model="w.hint" type="text" class="input" />
                                </div>
                              </template>
                            </div>
                          </div>
                        </div>

                        <div v-if="planPreviewDisplayLines(plan).length" class="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-700 dark:bg-dark-900/20">
                          <div class="text-xs font-medium text-gray-900 dark:text-white">{{ t('common.preview') }}</div>
                          <ul class="mt-2 space-y-1 text-xs text-gray-700 dark:text-dark-200">
                            <li v-for="(line, pIdx) in planPreviewDisplayLines(plan)" :key="pIdx">{{ line }}</li>
                          </ul>
                        </div>
                      </div>

                      <!-- Features -->
                      <div class="mt-3">
                        <div class="flex items-center justify-between gap-3">
                          <label class="input-label mb-0">{{ t('admin.settings.site.landingPricingEditor.features') }}</label>
                          <button type="button" class="btn btn-secondary btn-sm" @click="addPlanFeature(plan)">
                            <Icon name="plus" size="sm" class="mr-1.5" :stroke-width="2" />
                            {{ t('admin.settings.site.landingPricingEditor.add') }}
                          </button>
                        </div>
                        <div class="mt-2 space-y-2">
                          <div v-for="(_, fIdx) in plan.features" :key="fIdx" class="flex items-center gap-2">
                            <input v-model="plan.features[fIdx]" type="text" class="input flex-1" />
                            <button type="button" class="btn btn-ghost btn-sm text-red-500" @click="removePlanFeature(plan, fIdx)">
                              <Icon name="trash" size="sm" :stroke-width="2" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Pay-as-you-go -->
                <div class="rounded-xl border border-gray-200 p-4 dark:border-dark-600">
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ t('admin.settings.site.landingPricingEditor.payg') }}
                  </div>
                  <div class="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.paygTitle') }}</label>
                      <input v-model="landingPricingDraft.payg.title" type="text" class="input" />
                    </div>
                    <div>
                      <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.paygSubtitle') }}</label>
                      <input v-model="landingPricingDraft.payg.subtitle" type="text" class="input" />
                    </div>
                  </div>
                  <div class="mt-3 grid gap-4 md:grid-cols-2">
                    <div>
                      <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.paygCtaLabel') }}</label>
                      <input v-model="landingPricingDraft.payg.cta_label" type="text" class="input" />
                    </div>
                    <div>
                      <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.paygNote') }}</label>
                      <input v-model="landingPricingDraft.payg.note" type="text" class="input" />
                    </div>
                  </div>
                  <div class="mt-3">
                    <div class="flex items-center justify-between gap-3">
                      <label class="input-label mb-0">{{ t('admin.settings.site.landingPricingEditor.features') }}</label>
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        @click="landingPricingDraft.payg.features.push('')"
                      >
                        <Icon name="plus" size="sm" class="mr-1.5" :stroke-width="2" />
                        {{ t('admin.settings.site.landingPricingEditor.add') }}
                      </button>
                    </div>
                    <div class="mt-2 space-y-2">
                      <div v-for="(_, idx) in landingPricingDraft.payg.features" :key="idx" class="flex items-center gap-2">
                        <input v-model="landingPricingDraft.payg.features[idx]" type="text" class="input flex-1" />
                        <button type="button" class="btn btn-ghost btn-sm text-red-500" @click="landingPricingDraft.payg.features.splice(idx, 1)">
                          <Icon name="trash" size="sm" :stroke-width="2" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Note -->
                <div>
                  <label class="input-label">{{ t('admin.settings.site.landingPricingEditor.note') }}</label>
                  <input v-model="landingPricingDraft.note" type="text" class="input" />
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.site.landingPricingConfigHint') }}
                  </p>
                </div>

                <p v-if="landingPricingConfigError" class="text-xs text-red-500">
                  {{ landingPricingConfigError }}
                </p>
              </div>

              <!-- JSON editor -->
              <div v-else class="mt-2">
                <textarea
                  v-model="form.landing_pricing_config"
                  rows="12"
                  class="input mt-2 font-mono text-xs"
                  :placeholder="t('admin.settings.site.landingPricingConfigPlaceholder')"
                ></textarea>
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.site.landingPricingConfigHint') }}
                </p>
                <p v-if="landingPricingConfigError" class="mt-1 text-xs text-red-500">
                  {{ landingPricingConfigError }}
                </p>
              </div>
            </div>

              <!-- Hide CCS Import Button -->
              <div class="flex items-center justify-between rounded-xl border border-gray-200/70 bg-white/50 p-4 dark:border-dark-700/60 dark:bg-dark-900/20">
                <div>
                  <label class="font-medium text-gray-900 dark:text-white">{{
                    t('admin.settings.site.hideCcsImportButton')
                  }}</label>
                  <p class="text-sm text-gray-500 dark:text-gray-400">
                    {{ t('admin.settings.site.hideCcsImportButtonHint') }}
                  </p>
                </div>
                <Toggle v-model="form.hide_ccs_import_button" />
              </div>
            </div>
          </div>
        </div>
          </section>

          <!-- SMTP Settings - Only show when email verification is enabled -->
          <section
            v-if="form.email_verify_enabled"
            :id="SECTION_IDS.smtp"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.smtp)"
          >
            <div class="card">
          <div
            class="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-dark-700"
          >
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t('admin.settings.smtp.title') }}
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ t('admin.settings.smtp.description') }}
              </p>
            </div>
            <button
              type="button"
              @click="testSmtpConnection"
              :disabled="testingSmtp"
              class="btn btn-secondary btn-sm"
            >
              <svg v-if="testingSmtp" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {{
                testingSmtp
                  ? t('admin.settings.smtp.testing')
                  : t('admin.settings.smtp.testConnection')
              }}
            </button>
          </div>
          <div class="space-y-6 p-6">
            <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.smtp.host') }}
                </label>
                <input
                  v-model="form.smtp_host"
                  type="text"
                  class="input"
                  :placeholder="t('admin.settings.smtp.hostPlaceholder')"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.smtp.port') }}
                </label>
                <input
                  v-model.number="form.smtp_port"
                  type="number"
                  min="1"
                  max="65535"
                  class="input"
                  :placeholder="t('admin.settings.smtp.portPlaceholder')"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.smtp.username') }}
                </label>
                <input
                  v-model="form.smtp_username"
                  type="text"
                  class="input"
                  :placeholder="t('admin.settings.smtp.usernamePlaceholder')"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.smtp.password') }}
                </label>
                <input
                  v-model="form.smtp_password"
                  type="password"
                  class="input"
                  :placeholder="
                    form.smtp_password_configured
                      ? t('admin.settings.smtp.passwordConfiguredPlaceholder')
                      : t('admin.settings.smtp.passwordPlaceholder')
                  "
                />
                <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                  {{
                    form.smtp_password_configured
                      ? t('admin.settings.smtp.passwordConfiguredHint')
                      : t('admin.settings.smtp.passwordHint')
                  }}
                </p>
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.smtp.fromEmail') }}
                </label>
                <input
                  v-model="form.smtp_from_email"
                  type="email"
                  class="input"
                  :placeholder="t('admin.settings.smtp.fromEmailPlaceholder')"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.smtp.fromName') }}
                </label>
                <input
                  v-model="form.smtp_from_name"
                  type="text"
                  class="input"
                  :placeholder="t('admin.settings.smtp.fromNamePlaceholder')"
                />
              </div>
            </div>

            <!-- Use TLS Toggle -->
            <div
              class="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-700"
            >
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.smtp.useTls')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.smtp.useTlsHint') }}
                </p>
              </div>
              <Toggle v-model="form.smtp_use_tls" />
            </div>
          </div>
        </div>
          </section>

          <!-- Purchase Subscription Page -->
          <section
            :id="SECTION_IDS.purchase"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.purchase)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.purchase.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.purchase.description') }}
            </p>
          </div>
          <div class="space-y-6 p-6">
            <!-- Enable Toggle -->
            <div class="flex items-center justify-between">
              <div>
                <label class="font-medium text-gray-900 dark:text-white">{{
                  t('admin.settings.purchase.enabled')
                }}</label>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ t('admin.settings.purchase.enabledHint') }}
                </p>
              </div>
              <Toggle v-model="form.purchase_subscription_enabled" />
            </div>

            <!-- URL -->
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ t('admin.settings.purchase.url') }}
              </label>
              <input
                v-model="form.purchase_subscription_url"
                type="url"
                class="input font-mono text-sm"
                :placeholder="t('admin.settings.purchase.urlPlaceholder')"
              />
              <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                {{ t('admin.settings.purchase.urlHint') }}
              </p>
              <p class="mt-2 text-xs text-amber-600 dark:text-amber-400">
                {{ t('admin.settings.purchase.iframeWarning') }}
              </p>
            </div>
          </div>
        </div>
          </section>

          <!-- Send Test Email - Only show when email verification is enabled -->
          <section
            v-if="form.email_verify_enabled"
            :id="SECTION_IDS.testEmail"
            class="scroll-mt-28"
            v-show="isSectionVisible(SECTION_IDS.testEmail)"
          >
            <div class="card">
          <div class="border-b border-gray-100 px-6 py-4 dark:border-dark-700">
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('admin.settings.testEmail.title') }}
            </h2>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {{ t('admin.settings.testEmail.description') }}
            </p>
          </div>
          <div class="p-6">
            <div class="flex items-end gap-4">
              <div class="flex-1">
                <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('admin.settings.testEmail.recipientEmail') }}
                </label>
                <input
                  v-model="testEmailAddress"
                  type="email"
                  class="input"
                  :placeholder="t('admin.settings.testEmail.recipientEmailPlaceholder')"
                />
              </div>
              <button
                type="button"
                @click="sendTestEmail"
                :disabled="sendingTestEmail || !testEmailAddress"
                class="btn btn-secondary"
              >
                <svg
                  v-if="sendingTestEmail"
                  class="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    class="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    stroke-width="4"
                  ></circle>
                  <path
                    class="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                {{
                  sendingTestEmail
                    ? t('admin.settings.testEmail.sending')
                    : t('admin.settings.testEmail.sendTestEmail')
                }}
              </button>
            </div>
          </div>
        </div>
          </section>
        </form>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api'
import type { SystemSettings, UpdateSettingsRequest } from '@/api/admin/settings'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import Toggle from '@/components/common/Toggle.vue'
import { useClipboard } from '@/composables/useClipboard'
import { useAppStore } from '@/stores'
import {
  DEFAULT_LANDING_PRICING_CONFIG_V1_JSON,
  DEFAULT_LANDING_PRICING_CONFIG_V1,
  parseLandingPricingConfig,
  type PricingGroupFieldKey,
  type PricingPlanWidgetType,
  type PricingPlanWidgetTone,
  type PricingPeriod,
  type PricingTab
} from '@/utils/landingPricing'
import type { AdminGroup } from '@/types'

const { t } = useI18n()
const appStore = useAppStore()
const { copyToClipboard } = useClipboard()

const SECTION_IDS = {
  adminApiKey: 'admin-api-key',
  streamTimeout: 'stream-timeout',
  gateway: 'gateway',
  registration: 'registration',
  referral: 'referral',
  turnstile: 'turnstile',
  linuxdo: 'linuxdo',
  defaults: 'defaults',
  site: 'site',
  smtp: 'smtp',
  purchase: 'purchase',
  testEmail: 'test-email'
} as const

type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS]

const loading = ref(true)
const saving = ref(false)
const testingSmtp = ref(false)
const sendingTestEmail = ref(false)
const testEmailAddress = ref('')
const logoError = ref('')
const landingPricingConfigError = ref('')
const landingPricingEditorMode = ref<'ui' | 'json'>('ui')
const siteSettingsTab = ref<'general' | 'home' | 'subscriptions'>('general')
const sectionQuery = ref('')
const activeSectionId = ref<SectionId>(SECTION_IDS.adminApiKey)
const mobileSectionJump = ref<SectionId>(SECTION_IDS.adminApiKey)
const gatewayStatusHelpOpen = ref(false)
const gatewayStatusHelpId = 'gateway-keyword-status-help'
const gatewayStatusHelpRef = ref<HTMLElement | null>(null)

type EditableLandingPricingPlan = {
  id: string
  name: string
  badge?: string
  description?: string
  highlighted: boolean
  group_id?: number
  group_fields?: PricingGroupFieldKey[]
  validity_days: Partial<Record<PricingPeriod, number>>
  meta: {
    widgets: EditableLandingPricingWidget[]
  }
  price: {
    week?: number
    month?: number
    custom?: string
  }
  features: string[]
}

type EditableLandingPricingWidget =
  {
    when?: {
      periods?: PricingPeriod[]
    }
  } & (
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
        items: string[]
      }
    | {
        type: 'tags'
        tags: string[]
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

type EditableLandingPricingConfigV1 = {
  version: 1
  currency: 'CNY'
  default_tab: PricingTab
  subscription: {
    title: string
    subtitle?: string
    default_period: PricingPeriod
    periods: Array<{ key: PricingPeriod; label: string }>
    plans: EditableLandingPricingPlan[]
  }
  payg: {
    title: string
    subtitle?: string
    cta_label?: string
    features: string[]
    note?: string
  }
  note?: string
}

const landingPricingDraft = ref<EditableLandingPricingConfigV1>(createLandingPricingDraft())
const pricingGroupsLoading = ref(false)
const pricingGroups = ref<AdminGroup[]>([])

const subscriptionGroupOptions = computed(() => {
  return pricingGroups.value
    .filter((g) => g.subscription_type === 'subscription' && g.status === 'active')
    .map((g) => ({ id: g.id, name: g.name, description: g.description || '' }))
})

const pricingGroupFieldOptions = computed(() => {
  return [
    { key: 'daily_limit_usd' as PricingGroupFieldKey, label: t('admin.settings.site.landingPricingGroupFields.daily') },
    { key: 'weekly_limit_usd' as PricingGroupFieldKey, label: t('admin.settings.site.landingPricingGroupFields.weekly') },
    { key: 'monthly_limit_usd' as PricingGroupFieldKey, label: t('admin.settings.site.landingPricingGroupFields.monthly') },
    { key: 'user_concurrency' as PricingGroupFieldKey, label: t('admin.settings.site.landingPricingGroupFields.concurrency') },
    { key: 'rate_multiplier' as PricingGroupFieldKey, label: t('admin.settings.site.landingPricingGroupFields.rate') }
  ]
})

const pricingGroupsById = computed(() => {
  const m = new Map<number, AdminGroup>()
  for (const g of pricingGroups.value) m.set(g.id, g)
  return m
})

const planWidgetTypeOptions = computed(() => {
  return [
    { type: 'text' as PricingPlanWidgetType, label: t('admin.settings.site.landingPricingEditor.widgetType.text') },
    { type: 'kv' as PricingPlanWidgetType, label: t('admin.settings.site.landingPricingEditor.widgetType.kv') },
    { type: 'group_field' as PricingPlanWidgetType, label: t('admin.settings.site.landingPricingEditor.widgetType.groupField') },
    { type: 'list' as PricingPlanWidgetType, label: t('admin.settings.site.landingPricingEditor.widgetType.list') },
    { type: 'tags' as PricingPlanWidgetType, label: t('admin.settings.site.landingPricingEditor.widgetType.tags') },
    { type: 'divider' as PricingPlanWidgetType, label: t('admin.settings.site.landingPricingEditor.widgetType.divider') },
    { type: 'metric' as PricingPlanWidgetType, label: t('admin.settings.site.landingPricingEditor.widgetType.metric') }
  ]
})

function pricingGroupFieldLabel(key: PricingGroupFieldKey): string {
  const found = pricingGroupFieldOptions.value.find((x) => x.key === key)
  return found?.label || key
}

function pricingGroupFieldValue(key: PricingGroupFieldKey, g: AdminGroup): string | null {
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

function pricingGroupFieldLine(key: PricingGroupFieldKey, g: AdminGroup, overrideLabel?: string): string | null {
  const value = pricingGroupFieldValue(key, g)
  if (!value) return null
  const label = overrideLabel && overrideLabel.trim() ? overrideLabel.trim() : pricingGroupFieldLabel(key)
  return `${label}: ${value}`
}

function planPreviewDisplayLines(plan: EditableLandingPricingPlan): string[] {
  const g = plan.group_id ? pricingGroupsById.value.get(plan.group_id) : undefined
  const previewPeriod: PricingPeriod = landingPricingDraft.value.subscription.default_period

  const lines: string[] = []

  // legacy group_fields
  if (g && plan.group_fields?.length) {
    for (const key of plan.group_fields) {
      const line = pricingGroupFieldLine(key, g)
      if (line) lines.push(line)
    }
  }

  // widgets
  for (const w of plan.meta.widgets) {
    const whenPeriods = w.when?.periods
    if (whenPeriods && whenPeriods.length && !whenPeriods.includes(previewPeriod)) {
      continue
    }

    if (w.type === 'text') {
      if (w.text.trim()) lines.push(w.text.trim())
      continue
    }
    if (w.type === 'kv') {
      const label = w.label.trim()
      const value = w.value.trim()
      if (label && value) lines.push(`${label}: ${value}`)
      continue
    }
    if (w.type === 'group_field') {
      if (!g) continue
      const line = pricingGroupFieldLine(w.key, g, w.label)
      if (line) lines.push(line)
      continue
    }
    if (w.type === 'list') {
      const title = (w.title || '').trim()
      for (const item of w.items) {
        if (!item.trim()) continue
        lines.push(title ? `${title}: ${item.trim()}` : item.trim())
      }
      continue
    }
    if (w.type === 'tags') {
      const tags = (w.tags || []).map((x) => (typeof x === 'string' ? x.trim() : '')).filter((x) => !!x)
      if (tags.length) lines.push(`Tags: ${tags.join(', ')}`)
      continue
    }
    if (w.type === 'divider') {
      const label = (w.label || '').trim()
      lines.push(label ? `--- ${label} ---` : '---')
      continue
    }
    if (w.type === 'metric') {
      const label = (w.label || '').trim()
      const value = (w.value || '').trim()
      if (label && value) lines.push(`${label}: ${value}`)
      const hint = (w.hint || '').trim()
      if (hint) lines.push(hint)
      continue
    }
  }

  // legacy features
  for (const f of plan.features) {
    if (typeof f === 'string' && f.trim()) lines.push(f.trim())
  }

  return lines
}

// Admin API Key 状态
const adminApiKeyLoading = ref(true)
const adminApiKeyExists = ref(false)
const adminApiKeyMasked = ref('')
const adminApiKeyOperating = ref(false)
const newAdminApiKey = ref('')

// Stream Timeout 状态
const streamTimeoutLoading = ref(true)
const streamTimeoutSaving = ref(false)
const streamTimeoutForm = reactive({
  enabled: true,
  action: 'temp_unsched' as 'temp_unsched' | 'error' | 'none',
  temp_unsched_minutes: 5,
  threshold_count: 3,
  threshold_window_minutes: 10
})
const initialStreamTimeoutState = ref<string | null>(null)

function streamTimeoutStateSnapshot(): string {
  return JSON.stringify({
    enabled: streamTimeoutForm.enabled,
    action: streamTimeoutForm.action,
    temp_unsched_minutes: streamTimeoutForm.temp_unsched_minutes,
    threshold_count: streamTimeoutForm.threshold_count,
    threshold_window_minutes: streamTimeoutForm.threshold_window_minutes
  })
}

const streamTimeoutDirty = computed(() => {
  if (initialStreamTimeoutState.value == null) return false
  return streamTimeoutStateSnapshot() !== initialStreamTimeoutState.value
})

type SettingsForm = SystemSettings & {
  smtp_password: string
  turnstile_secret_key: string
  linuxdo_connect_client_secret: string
}

type GatewayKeywordField =
  | 'gateway_failover_sensitive_400_keywords'
  | 'gateway_failover_temporary_400_keywords'
  | 'gateway_failover_request_error_keywords'

type GatewayKeywordSnapshot = {
  sensitive: string[]
  temporary: string[]
  request: string[]
}

const DEFAULT_GATEWAY_FAILOVER_SENSITIVE_400_KEYWORDS = [
  'insufficient balance',
  'insufficient credit',
  'insufficient credits',
  'credit balance',
  'out of quota',
  'quota exceeded',
  'payment required',
  'billing issue',
  '余额不足',
  '积分不足',
  '额度不足',
  '配额不足'
]

const DEFAULT_GATEWAY_FAILOVER_TEMPORARY_400_KEYWORDS = [
  'temporarily unavailable',
  'service unavailable',
  'under maintenance',
  'maintenance',
  'try again later',
  'server overloaded',
  'overloaded',
  '服务暂时不可用',
  '服务不可用',
  '维护中',
  '稍后重试',
  '暂时不可用'
]

const DEFAULT_GATEWAY_FAILOVER_REQUEST_ERROR_KEYWORDS = [
  'eof',
  ': eof',
  'connection reset by peer',
  'broken pipe',
  'tls:',
  'handshake failure',
  'http2: client connection lost',
  'dial tcp',
  'no such host',
  'i/o timeout',
  'timeout awaiting response headers',
  'server misbehaving'
]

const gatewayDefaultKeywordCounts = {
  sensitive: DEFAULT_GATEWAY_FAILOVER_SENSITIVE_400_KEYWORDS.length,
  temporary: DEFAULT_GATEWAY_FAILOVER_TEMPORARY_400_KEYWORDS.length,
  request: DEFAULT_GATEWAY_FAILOVER_REQUEST_ERROR_KEYWORDS.length
}

const form = reactive<SettingsForm>({
  registration_enabled: true,
  email_verify_enabled: false,
  promo_code_enabled: true,
  password_reset_enabled: false,
  totp_enabled: false,
  totp_encryption_key_configured: false,
  referral_inviter_bonus: 0,
  referral_invitee_bonus: 0,
  referral_commission_rate: 0,
  default_balance: 0,
  default_concurrency: 1,
  site_name: 'Sub2API',
  site_logo: '',
  site_subtitle: 'Subscription to API Conversion Platform',
  api_base_url: '',
  contact_info: '',
  doc_url: '',
  home_content: '',
  landing_pricing_enabled: true,
  landing_pricing_config: '',
  subscriptions_enabled: true,
  hide_ccs_import_button: false,
  purchase_subscription_enabled: false,
  purchase_subscription_url: '',
  smtp_host: '',
  smtp_port: 587,
  smtp_username: '',
  smtp_password: '',
  smtp_password_configured: false,
  smtp_from_email: '',
  smtp_from_name: '',
  smtp_use_tls: true,
  // Cloudflare Turnstile
  turnstile_enabled: false,
  turnstile_site_key: '',
  turnstile_secret_key: '',
  turnstile_secret_key_configured: false,
  // LinuxDo Connect OAuth 登录
  linuxdo_connect_enabled: false,
  linuxdo_connect_client_id: '',
  linuxdo_connect_client_secret: '',
  linuxdo_connect_client_secret_configured: false,
  linuxdo_connect_redirect_url: '',
  // Model fallback
  enable_model_fallback: false,
  fallback_model_anthropic: 'claude-3-5-sonnet-20241022',
  fallback_model_openai: 'gpt-4o',
  fallback_model_gemini: 'gemini-2.5-pro',
  fallback_model_antigravity: 'gemini-2.5-pro',
  // Identity patch (Claude -> Gemini)
  enable_identity_patch: true,
  identity_patch_prompt: '',
  // Gateway runtime toggles
  gateway_fix_orphaned_tool_results: true,
  gateway_failover_sensitive_400_keywords: [],
  gateway_failover_temporary_400_keywords: [],
  gateway_failover_request_error_keywords: [],
  gateway_codex_model_aliases: {},
  // Ops monitoring (vNext)
  ops_monitoring_enabled: true,
  ops_realtime_monitoring_enabled: true,
  ops_query_mode_default: 'auto',
  ops_metrics_interval_seconds: 60
})

const savingAny = computed(() => saving.value || streamTimeoutSaving.value)

const navItems = computed(() => {
  const items: Array<{ id: SectionId; label: string }> = [
    { id: SECTION_IDS.adminApiKey, label: t('admin.settings.adminApiKey.title') },
    { id: SECTION_IDS.streamTimeout, label: t('admin.settings.streamTimeout.title') },
    { id: SECTION_IDS.gateway, label: t('admin.settings.gateway.title') },
    { id: SECTION_IDS.registration, label: t('admin.settings.registration.title') },
    { id: SECTION_IDS.referral, label: t('admin.settings.referral.title') },
    { id: SECTION_IDS.turnstile, label: t('admin.settings.turnstile.title') },
    { id: SECTION_IDS.linuxdo, label: t('admin.settings.linuxdo.title') },
    { id: SECTION_IDS.defaults, label: t('admin.settings.defaults.title') },
    { id: SECTION_IDS.site, label: t('admin.settings.site.title') }
  ]

  if (form.email_verify_enabled) {
    items.push({ id: SECTION_IDS.smtp, label: t('admin.settings.smtp.title') })
  }

  items.push({ id: SECTION_IDS.purchase, label: t('admin.settings.purchase.title') })

  if (form.email_verify_enabled) {
    items.push({ id: SECTION_IDS.testEmail, label: t('admin.settings.testEmail.title') })
  }

  return items
})

const filteredNavItems = computed(() => {
  const q = sectionQuery.value.trim().toLowerCase()
  if (!q) return navItems.value
  return navItems.value.filter((item) => item.label.toLowerCase().includes(q))
})

const visibleSectionIds = computed(() => new Set(filteredNavItems.value.map((x) => x.id)))

function isSectionVisible(id: SectionId): boolean {
  return visibleSectionIds.value.has(id)
}

function scrollToSection(id: SectionId) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeSectionId.value = id
}

watch(activeSectionId, (id) => {
  mobileSectionJump.value = id
})

let sectionObserver: IntersectionObserver | null = null

function refreshSectionObserver() {
  sectionObserver?.disconnect()
  if (typeof window === 'undefined') return

  sectionObserver = new IntersectionObserver(
    (entries) => {
      const candidates = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (!candidates.length) return
      activeSectionId.value = (candidates[0].target as HTMLElement).id as SectionId
    },
    { root: null, rootMargin: '-20% 0px -70% 0px', threshold: [0.01, 0.1, 0.25] }
  )

  for (const item of filteredNavItems.value) {
    const el = document.getElementById(item.id)
    if (el) sectionObserver.observe(el)
  }
}

watch(
  () => loading.value,
  (isLoading) => {
    if (!isLoading) nextTick(refreshSectionObserver)
  },
  { immediate: true }
)

watch(
  () => filteredNavItems.value.map((x) => x.id).join('|'),
  () => nextTick(refreshSectionObserver)
)

onBeforeUnmount(() => {
  sectionObserver?.disconnect()
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onWindowKeydown)
    window.removeEventListener('click', onWindowClickCapture, true)
  }
})

function onWindowKeydown(event: KeyboardEvent) {
  if (!gatewayStatusHelpOpen.value) return
  if (event.key === 'Escape') {
    closeGatewayStatusHelp()
  }
}

function onWindowClickCapture(event: MouseEvent) {
  if (!gatewayStatusHelpOpen.value) return
  const root = gatewayStatusHelpRef.value
  if (!root) return
  if (root.contains(event.target as Node | null)) return
  closeGatewayStatusHelp()
}

const initialSettingsState = ref<string | null>(null)
const initialGatewayKeywordSnapshot = ref<GatewayKeywordSnapshot | null>(null)
const gatewayCodexAliasesRaw = ref('')

function stableJsonStringify(value: any): string {
  if (value === undefined) return 'null'
  if (value === null) return 'null'
  if (typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJsonStringify).join(',')}]`

  const keys = Object.keys(value).sort()
  const entries = keys
    .filter((k) => value[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${stableJsonStringify(value[k])}`)
  return `{${entries.join(',')}}`
}

function normalizeLandingPricingConfigSnapshot(raw: string): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) return ''
  try {
    return stableJsonStringify(JSON.parse(trimmed))
  } catch {
    return trimmed
  }
}

function normalizeKeywordList(raw: string): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const entry of raw.split(/\r?\n/)) {
    const trimmed = entry.trim()
    if (!trimmed) continue
    const dedupeKey = trimmed.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    normalized.push(trimmed)
  }
  return normalized
}

function keywordListToTextarea(keywords: string[] | undefined): string {
  if (!Array.isArray(keywords) || keywords.length === 0) return ''
  return keywords.join('\n')
}

function onGatewayKeywordInput(field: GatewayKeywordField, event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  const raw = target?.value ?? ''
  const normalized = normalizeKeywordList(raw)
  form[field] = normalized
}

function codexAliasesToTextarea(aliases: Record<string, string> | undefined): string {
  if (!aliases || typeof aliases !== 'object') return ''
  const entries = Object.entries(aliases)
    .map(([key, value]) => [key.trim(), value.trim()] as const)
    .filter(([key, value]) => !!key && !!value)
    .sort(([a], [b]) => a.localeCompare(b))
  if (!entries.length) return ''
  return entries.map(([key, value]) => `${key}=${value}`).join('\n')
}

function normalizeCodexAliasMap(raw: string): Record<string, string> {
  const normalized: Record<string, string> = {}
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue

    let sepIndex = trimmed.indexOf('->')
    let sepLen = 2
    if (sepIndex < 0) {
      sepIndex = trimmed.indexOf('=')
      sepLen = 1
    }
    if (sepIndex < 0) {
      sepIndex = trimmed.indexOf(':')
      sepLen = 1
    }
    if (sepIndex <= 0) continue

    const key = trimmed.slice(0, sepIndex).trim().toLowerCase()
    const value = trimmed.slice(sepIndex + sepLen).trim()
    if (!key || !value) continue

    normalized[key] = value
  }
  return normalized
}

function onGatewayCodexAliasesInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null
  const raw = target?.value ?? ''
  gatewayCodexAliasesRaw.value = raw
  form.gateway_codex_model_aliases = normalizeCodexAliasMap(raw)
}

const gatewayCodexAliasCount = computed(() => {
  const aliases = form.gateway_codex_model_aliases
  if (!aliases || typeof aliases !== 'object') return 0
  return Object.keys(aliases).length
})

const gatewayCurrentKeywordCounts = computed(() => ({
  sensitive: form.gateway_failover_sensitive_400_keywords.length,
  temporary: form.gateway_failover_temporary_400_keywords.length,
  request: form.gateway_failover_request_error_keywords.length
}))

function currentGatewayKeywordSnapshot(): GatewayKeywordSnapshot {
  return {
    sensitive: [...form.gateway_failover_sensitive_400_keywords],
    temporary: [...form.gateway_failover_temporary_400_keywords],
    request: [...form.gateway_failover_request_error_keywords]
  }
}

function markGatewayKeywordSnapshotSaved() {
  initialGatewayKeywordSnapshot.value = currentGatewayKeywordSnapshot()
}

function keywordSet(values: string[]): Set<string> {
  return new Set(values.map((item) => item.trim().toLowerCase()).filter((item) => !!item))
}

function keywordListsEquivalent(left: string[], right: string[]): boolean {
  const leftSet = keywordSet(left)
  const rightSet = keywordSet(right)
  if (leftSet.size !== rightSet.size) {
    return false
  }
  for (const item of rightSet) {
    if (!leftSet.has(item)) {
      return false
    }
  }
  return true
}

function keywordListMatchesDefault(current: string[], defaults: string[]): boolean {
  return keywordListsEquivalent(current, defaults)
}

const gatewayKeywordsMatchDefaults = computed(() => {
  return (
    keywordListMatchesDefault(
      form.gateway_failover_sensitive_400_keywords,
      DEFAULT_GATEWAY_FAILOVER_SENSITIVE_400_KEYWORDS
    ) &&
    keywordListMatchesDefault(
      form.gateway_failover_temporary_400_keywords,
      DEFAULT_GATEWAY_FAILOVER_TEMPORARY_400_KEYWORDS
    ) &&
    keywordListMatchesDefault(
      form.gateway_failover_request_error_keywords,
      DEFAULT_GATEWAY_FAILOVER_REQUEST_ERROR_KEYWORDS
    )
  )
})

const gatewayKeywordsDirty = computed(() => {
  const initial = initialGatewayKeywordSnapshot.value
  if (!initial) {
    return false
  }
  const current = currentGatewayKeywordSnapshot()
  return !(
    keywordListsEquivalent(current.sensitive, initial.sensitive) &&
    keywordListsEquivalent(current.temporary, initial.temporary) &&
    keywordListsEquivalent(current.request, initial.request)
  )
})

const gatewayKeywordStatus = computed(() => {
  if (gatewayKeywordsMatchDefaults.value) {
    return {
      tone: 'green' as const,
      text: t('admin.settings.gateway.matchesDefaults'),
      tooltip: t('admin.settings.gateway.matchesDefaultsTooltip')
    }
  }
  if (gatewayKeywordsDirty.value) {
    return {
      tone: 'yellow' as const,
      text: t('admin.settings.gateway.modifiedUnsaved'),
      tooltip: t('admin.settings.gateway.modifiedUnsavedTooltip')
    }
  }
  return {
    tone: 'gray' as const,
    text: t('admin.settings.gateway.savedCustom'),
    tooltip: t('admin.settings.gateway.savedCustomTooltip')
  }
})

function toggleGatewayStatusHelp() {
  gatewayStatusHelpOpen.value = !gatewayStatusHelpOpen.value
}

function closeGatewayStatusHelp() {
  gatewayStatusHelpOpen.value = false
}

function resetGatewayFailoverKeywordsToDefault() {
  form.gateway_failover_sensitive_400_keywords = [...DEFAULT_GATEWAY_FAILOVER_SENSITIVE_400_KEYWORDS]
  form.gateway_failover_temporary_400_keywords = [...DEFAULT_GATEWAY_FAILOVER_TEMPORARY_400_KEYWORDS]
  form.gateway_failover_request_error_keywords = [...DEFAULT_GATEWAY_FAILOVER_REQUEST_ERROR_KEYWORDS]
  appStore.showSuccess(t('admin.settings.gateway.defaultsApplied'))
}

function buildUpdateSettingsPayload(): UpdateSettingsRequest {
  const landingPricingConfig =
    landingPricingEditorMode.value === 'ui'
      ? buildLandingPricingJsonFromDraft()
      : form.landing_pricing_config

  return {
    registration_enabled: form.registration_enabled,
    email_verify_enabled: form.email_verify_enabled,
    promo_code_enabled: form.promo_code_enabled,
    password_reset_enabled: form.password_reset_enabled,
    totp_enabled: form.totp_enabled,
    referral_inviter_bonus: form.referral_inviter_bonus,
    referral_invitee_bonus: form.referral_invitee_bonus,
    referral_commission_rate: form.referral_commission_rate,
    default_balance: form.default_balance,
    default_concurrency: form.default_concurrency,
    site_name: form.site_name,
    site_logo: form.site_logo,
    site_subtitle: form.site_subtitle,
    api_base_url: form.api_base_url,
    contact_info: form.contact_info,
    doc_url: form.doc_url,
    home_content: form.home_content,
    landing_pricing_enabled: form.landing_pricing_enabled,
    landing_pricing_config: landingPricingConfig,
    subscriptions_enabled: form.subscriptions_enabled,
    hide_ccs_import_button: form.hide_ccs_import_button,
    purchase_subscription_enabled: form.purchase_subscription_enabled,
    purchase_subscription_url: form.purchase_subscription_url,
    smtp_host: form.smtp_host,
    smtp_port: form.smtp_port,
    smtp_username: form.smtp_username,
    smtp_password: form.smtp_password || undefined,
    smtp_from_email: form.smtp_from_email,
    smtp_from_name: form.smtp_from_name,
    smtp_use_tls: form.smtp_use_tls,
    turnstile_enabled: form.turnstile_enabled,
    turnstile_site_key: form.turnstile_site_key,
    turnstile_secret_key: form.turnstile_secret_key || undefined,
    linuxdo_connect_enabled: form.linuxdo_connect_enabled,
    linuxdo_connect_client_id: form.linuxdo_connect_client_id,
    linuxdo_connect_client_secret: form.linuxdo_connect_client_secret || undefined,
    linuxdo_connect_redirect_url: form.linuxdo_connect_redirect_url,
    enable_model_fallback: form.enable_model_fallback,
    fallback_model_anthropic: form.fallback_model_anthropic,
    fallback_model_openai: form.fallback_model_openai,
    fallback_model_gemini: form.fallback_model_gemini,
    fallback_model_antigravity: form.fallback_model_antigravity,
    enable_identity_patch: form.enable_identity_patch,
    identity_patch_prompt: form.identity_patch_prompt,
    gateway_fix_orphaned_tool_results: form.gateway_fix_orphaned_tool_results,
    gateway_failover_sensitive_400_keywords: form.gateway_failover_sensitive_400_keywords,
    gateway_failover_temporary_400_keywords: form.gateway_failover_temporary_400_keywords,
    gateway_failover_request_error_keywords: form.gateway_failover_request_error_keywords,
    gateway_codex_model_aliases: form.gateway_codex_model_aliases
  }
}

function settingsPayloadSnapshot(): string {
  const payload = buildUpdateSettingsPayload()
  return JSON.stringify({
    ...payload,
    landing_pricing_config: normalizeLandingPricingConfigSnapshot(payload.landing_pricing_config ?? '')
  })
}

const settingsDirty = computed(() => {
  if (initialSettingsState.value == null) return false
  return settingsPayloadSnapshot() !== initialSettingsState.value
})

const hasUnsavedChanges = computed(() => settingsDirty.value || streamTimeoutDirty.value)

// LinuxDo OAuth redirect URL suggestion
const linuxdoRedirectUrlSuggestion = computed(() => {
  if (typeof window === 'undefined') return ''
  const origin =
    window.location.origin || `${window.location.protocol}//${window.location.host}`
  return `${origin}/api/v1/auth/oauth/linuxdo/callback`
})

async function setAndCopyLinuxdoRedirectUrl() {
  const url = linuxdoRedirectUrlSuggestion.value
  if (!url) return

  form.linuxdo_connect_redirect_url = url
  await copyToClipboard(url, t('admin.settings.linuxdo.redirectUrlSetAndCopied'))
}

function handleLogoUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  logoError.value = ''

  if (!file) return

  // Check file size (300KB = 307200 bytes)
  const maxSize = 300 * 1024
  if (file.size > maxSize) {
    logoError.value = t('admin.settings.site.logoSizeError', {
      size: (file.size / 1024).toFixed(1)
    })
    input.value = ''
    return
  }

  // Check file type
  if (!file.type.startsWith('image/')) {
    logoError.value = t('admin.settings.site.logoTypeError')
    input.value = ''
    return
  }

  // Convert to base64
  const reader = new FileReader()
  reader.onload = (e) => {
    form.site_logo = e.target?.result as string
  }
  reader.onerror = () => {
    logoError.value = t('admin.settings.site.logoReadError')
  }
  reader.readAsDataURL(file)

  // Reset input
  input.value = ''
}

function deepCloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

function createLandingPricingDraft(): EditableLandingPricingConfigV1 {
  const draft = deepCloneJson(DEFAULT_LANDING_PRICING_CONFIG_V1) as EditableLandingPricingConfigV1
  return hydrateLandingPricingDraftForUI(draft)
}

function syncLandingPricingDraftFromJson() {
  const { config, error } = parseLandingPricingConfig(form.landing_pricing_config)
  // In UI mode we tolerate JSON errors by falling back to default, but keep the error message visible.
  landingPricingConfigError.value = error || ''
  landingPricingDraft.value = hydrateLandingPricingDraftForUI(
    deepCloneJson(config) as EditableLandingPricingConfigV1
  )
}

function hydrateLandingPricingDraftForUI(draft: EditableLandingPricingConfigV1): EditableLandingPricingConfigV1 {
  // Ensure required containers exist
  if (!draft.subscription) {
    draft.subscription = { title: '', default_period: 'month', periods: [], plans: [] } as any
  }
  if (!Array.isArray(draft.subscription.periods)) draft.subscription.periods = []
  if (!Array.isArray(draft.subscription.plans)) draft.subscription.plans = []
  if (!draft.payg) {
    draft.payg = { title: '', features: [] } as any
  }
  if (!Array.isArray(draft.payg.features)) draft.payg.features = []

  for (const plan of draft.subscription.plans as any[]) {
    if (!plan || typeof plan !== 'object') continue
    if (!plan.price || typeof plan.price !== 'object') plan.price = {}
    if (!Array.isArray(plan.features)) plan.features = []
    if (!plan.validity_days || typeof plan.validity_days !== 'object') plan.validity_days = {}
    if (!plan.meta || typeof plan.meta !== 'object') plan.meta = {}
    if (!Array.isArray(plan.meta.widgets)) plan.meta.widgets = []
    if (typeof plan.highlighted !== 'boolean') plan.highlighted = false
    if (typeof plan.group_id !== 'number' || !Number.isInteger(plan.group_id) || plan.group_id <= 0) {
      plan.group_id = 0
    }
    if (!Array.isArray(plan.group_fields)) {
      delete plan.group_fields
    }

    // Sanitize widgets for UI editing
    plan.meta.widgets = (plan.meta.widgets as any[]).filter(
      (w) =>
        w &&
        typeof w === 'object' &&
        typeof w.type === 'string' &&
        ['text', 'kv', 'group_field', 'list', 'tags', 'divider', 'metric'].includes(w.type)
    )
    for (const w of plan.meta.widgets as any[]) {
      // Normalize widget conditions
      if ('when' in w && w.when != null) {
        if (!w.when || typeof w.when !== 'object') {
          delete w.when
        } else if ('periods' in w.when && w.when.periods != null) {
          if (!Array.isArray(w.when.periods)) {
            delete w.when.periods
          } else {
            const allowed: PricingPeriod[] = ['week', 'month', 'custom']
            const uniq = new Set<PricingPeriod>()
            for (const p of w.when.periods as any[]) {
              if (allowed.includes(p)) uniq.add(p)
            }
            const nextPeriods = allowed.filter((p) => uniq.has(p))
            if (nextPeriods.length) w.when.periods = nextPeriods
            else delete w.when.periods
          }
        }
        if (!w.when || (typeof w.when === 'object' && !('periods' in w.when))) {
          delete w.when
        }
      }

      if (w.type === 'text') {
        if (typeof w.text !== 'string') w.text = ''
      } else if (w.type === 'kv') {
        if (typeof w.label !== 'string') w.label = ''
        if (typeof w.value !== 'string') w.value = ''
      } else if (w.type === 'group_field') {
        if (typeof w.key !== 'string') w.key = 'monthly_limit_usd'
        if (typeof w.label !== 'string') delete w.label
      } else if (w.type === 'list') {
        if (!Array.isArray(w.items)) w.items = []
        w.items = (w.items as any[]).map((x) => (typeof x === 'string' ? x : ''))
        if (typeof w.title !== 'string') delete w.title
      } else if (w.type === 'tags') {
        if (!Array.isArray(w.tags)) w.tags = []
        w.tags = (w.tags as any[]).map((x) => (typeof x === 'string' ? x : ''))
        const tone = typeof w.tone === 'string' ? w.tone : 'gray'
        w.tone = (tone === 'primary' || tone === 'gray' || tone === 'gold') ? tone : 'gray'
      } else if (w.type === 'divider') {
        if (typeof w.label !== 'string') delete w.label
      } else if (w.type === 'metric') {
        if (typeof w.label !== 'string') w.label = ''
        if (typeof w.value !== 'string') w.value = ''
        if (typeof w.hint !== 'string') delete w.hint
      }
    }
  }

  return draft
}

function normalizeLandingPricingDraftForSave(draft: EditableLandingPricingConfigV1): EditableLandingPricingConfigV1 {
  const next = deepCloneJson(draft) as EditableLandingPricingConfigV1

  // Ensure required containers exist
  if (!next.subscription) next.subscription = { title: '', default_period: 'month', periods: [], plans: [] } as any
  if (!next.subscription.periods) next.subscription.periods = []
  if (!next.subscription.plans) next.subscription.plans = []
  if (!next.payg) next.payg = { title: '', features: [] } as any
  if (!next.payg.features) next.payg.features = []

  // Trim optional strings
  next.subscription.title = (next.subscription.title || '').trim()
  if (typeof next.subscription.subtitle === 'string') {
    const v = next.subscription.subtitle.trim()
    if (v) next.subscription.subtitle = v
    else delete (next.subscription as any).subtitle
  }
  if (typeof next.note === 'string') {
    const v = next.note.trim()
    if (v) next.note = v
    else delete (next as any).note
  }

  next.subscription.periods = next.subscription.periods
    .map((p) => ({ key: p.key, label: (p.label || '').trim() }))
    .filter((p) => p.label)

  next.subscription.plans = next.subscription.plans.map((p) => {
    const plan: any = p
    plan.id = (plan.id || '').trim()
    plan.name = (plan.name || '').trim()

    // Required fields
    if (!plan.price || typeof plan.price !== 'object') plan.price = {}
    if (!Array.isArray(plan.features)) plan.features = []

    if (typeof plan.badge === 'string') {
      const v = plan.badge.trim()
      if (v) plan.badge = v
      else delete plan.badge
    }
    if (typeof plan.description === 'string') {
      const v = plan.description.trim()
      if (v) plan.description = v
      else delete plan.description
    }

    // group_id: only keep positive integers
    if (typeof plan.group_id !== 'number' || !Number.isInteger(plan.group_id) || plan.group_id <= 0) {
      delete plan.group_id
      delete plan.group_fields
    }

    if (Array.isArray(plan.group_fields)) {
      plan.group_fields = plan.group_fields.filter((k: any) => typeof k === 'string')
      if (!plan.group_fields.length) delete plan.group_fields
    }

    if (plan.validity_days && typeof plan.validity_days === 'object') {
      const cleaned: any = {}
      for (const [k, v] of Object.entries(plan.validity_days)) {
        if (typeof v === 'number' && Number.isInteger(v) && v > 0) {
          cleaned[k] = v
        }
      }
      if (Object.keys(cleaned).length) plan.validity_days = cleaned
      else delete plan.validity_days
    } else {
      delete plan.validity_days
    }

    if (plan.meta && typeof plan.meta === 'object' && Array.isArray(plan.meta.widgets)) {
      const cleaned: any[] = []
      for (const w of plan.meta.widgets as any[]) {
        if (!w || typeof w !== 'object' || typeof w.type !== 'string') continue

        const cleanedWhen = (() => {
          if (!w.when || typeof w.when !== 'object') return undefined
          const periodsRaw = (w.when as any).periods
          if (!Array.isArray(periodsRaw) || periodsRaw.length === 0) return undefined
          const allowed: PricingPeriod[] = ['week', 'month', 'custom']
          const uniq = new Set<PricingPeriod>()
          for (const p of periodsRaw as any[]) {
            if (allowed.includes(p)) uniq.add(p)
          }
          const periods = allowed.filter((p) => uniq.has(p))
          if (!periods.length) return undefined
          return { periods }
        })()

        if (w.type === 'text') {
          const text = typeof w.text === 'string' ? w.text.trim() : ''
          if (!text) continue
          const out: any = { type: 'text', text }
          if (cleanedWhen) out.when = cleanedWhen
          cleaned.push(out)
          continue
        }

        if (w.type === 'kv') {
          const label = typeof w.label === 'string' ? w.label.trim() : ''
          const value = typeof w.value === 'string' ? w.value.trim() : ''
          if (!label || !value) continue
          const out: any = { type: 'kv', label, value }
          if (cleanedWhen) out.when = cleanedWhen
          cleaned.push(out)
          continue
        }

        if (w.type === 'group_field') {
          // Requires group_id to keep backend validation happy.
          if (typeof plan.group_id !== 'number' || !Number.isInteger(plan.group_id) || plan.group_id <= 0) {
            continue
          }
          const key = typeof w.key === 'string' ? (w.key as PricingGroupFieldKey) : undefined
          if (!key) continue
          const out: any = { type: 'group_field', key }
          if (typeof w.label === 'string') {
            const v = w.label.trim()
            if (v) out.label = v
          }
          if (cleanedWhen) out.when = cleanedWhen
          cleaned.push(out)
          continue
        }

        if (w.type === 'list') {
          const items = Array.isArray(w.items) ? w.items : []
          const trimmedItems = items
            .map((x: any) => (typeof x === 'string' ? x.trim() : ''))
            .filter((x: string) => !!x)
          if (!trimmedItems.length) continue
          const out: any = { type: 'list', items: trimmedItems }
          if (typeof w.title === 'string') {
            const v = w.title.trim()
            if (v) out.title = v
          }
          if (cleanedWhen) out.when = cleanedWhen
          cleaned.push(out)
          continue
        }

        if (w.type === 'tags') {
          const tags = Array.isArray(w.tags)
            ? w.tags.map((x: any) => (typeof x === 'string' ? x.trim() : '')).filter((x: string) => !!x)
            : []
          if (!tags.length) continue
          const out: any = { type: 'tags', tags }
          if (typeof w.tone === 'string') {
            const tone = w.tone.trim()
            if (tone === 'primary' || tone === 'gray' || tone === 'gold') out.tone = tone
          }
          if (cleanedWhen) out.when = cleanedWhen
          cleaned.push(out)
          continue
        }

        if (w.type === 'divider') {
          const out: any = { type: 'divider' }
          if (typeof w.label === 'string') {
            const v = w.label.trim()
            if (v) out.label = v
          }
          if (cleanedWhen) out.when = cleanedWhen
          cleaned.push(out)
          continue
        }

        if (w.type === 'metric') {
          const label = typeof w.label === 'string' ? w.label.trim() : ''
          const value = typeof w.value === 'string' ? w.value.trim() : ''
          if (!label || !value) continue
          const out: any = { type: 'metric', label, value }
          if (typeof w.hint === 'string') {
            const v = w.hint.trim()
            if (v) out.hint = v
          }
          if (cleanedWhen) out.when = cleanedWhen
          cleaned.push(out)
          continue
        }
      }
      if (cleaned.length) plan.meta = { widgets: cleaned }
      else delete plan.meta
    } else {
      delete plan.meta
    }

    if (plan.highlighted !== true) {
      delete plan.highlighted
    }

    plan.features = plan.features.map((x: any) => (typeof x === 'string' ? x.trim() : '')).filter((x: string) => !!x)

    return plan as EditableLandingPricingPlan
  })

  // payg
  next.payg.title = (next.payg.title || '').trim()
  if (typeof next.payg.subtitle === 'string') {
    const v = next.payg.subtitle.trim()
    if (v) next.payg.subtitle = v
    else delete (next.payg as any).subtitle
  }
  if (typeof next.payg.cta_label === 'string') {
    const v = next.payg.cta_label.trim()
    if (v) next.payg.cta_label = v
    else delete (next.payg as any).cta_label
  }
  if (typeof next.payg.note === 'string') {
    const v = next.payg.note.trim()
    if (v) next.payg.note = v
    else delete (next.payg as any).note
  }
  next.payg.features = next.payg.features.map((x) => (typeof x === 'string' ? x.trim() : '')).filter((x) => !!x)

  return next
}

function buildLandingPricingJsonFromDraft(): string {
  const normalized = normalizeLandingPricingDraftForSave(landingPricingDraft.value)
  return JSON.stringify(normalized, null, 2)
}

function addLandingPricingPlan() {
  const plan: EditableLandingPricingPlan = {
    id: '',
    name: '',
    highlighted: false,
    validity_days: {},
    meta: { widgets: [] },
    price: { week: 0, month: 0 },
    features: []
  }
  landingPricingDraft.value.subscription.plans.push(plan)
}

function removeLandingPricingPlan(index: number) {
  landingPricingDraft.value.subscription.plans.splice(index, 1)
}

function addPlanFeature(plan: EditableLandingPricingPlan) {
  plan.features.push('')
}

function removePlanFeature(plan: EditableLandingPricingPlan, index: number) {
  plan.features.splice(index, 1)
}

function createDefaultPlanWidget(type: PricingPlanWidgetType): EditableLandingPricingWidget {
  if (type === 'text') return { type: 'text', text: '' }
  if (type === 'kv') return { type: 'kv', label: '', value: '' }
  if (type === 'group_field') return { type: 'group_field', key: 'monthly_limit_usd' }
  if (type === 'list') return { type: 'list', title: '', items: [''] }
  if (type === 'tags') return { type: 'tags', tags: [''], tone: 'gray' }
  if (type === 'divider') return { type: 'divider', label: '' }
  return { type: 'metric', label: '', value: '', hint: '' }
}

function addPlanWidget(plan: EditableLandingPricingPlan, type: PricingPlanWidgetType) {
  if (!plan.meta) plan.meta = { widgets: [] }
  if (!Array.isArray(plan.meta.widgets)) plan.meta.widgets = []

  if (type === 'group_field' && (!plan.group_id || plan.group_id <= 0)) {
    return
  }

  plan.meta.widgets.push(createDefaultPlanWidget(type))
}

function removePlanWidget(plan: EditableLandingPricingPlan, index: number) {
  plan.meta.widgets.splice(index, 1)
}

function movePlanWidget(plan: EditableLandingPricingPlan, index: number, delta: number) {
  const nextIndex = index + delta
  if (nextIndex < 0 || nextIndex >= plan.meta.widgets.length) return
  const [item] = plan.meta.widgets.splice(index, 1)
  plan.meta.widgets.splice(nextIndex, 0, item)
}

function addWidgetListItem(widget: EditableLandingPricingWidget) {
  if (widget.type !== 'list') return
  widget.items.push('')
}

function removeWidgetListItem(widget: EditableLandingPricingWidget, index: number) {
  if (widget.type !== 'list') return
  widget.items.splice(index, 1)
}

function isWidgetPeriodSelected(widget: EditableLandingPricingWidget, period: PricingPeriod): boolean {
  const periods = widget.when?.periods
  if (!periods || !periods.length) return false
  return periods.includes(period)
}

function toggleWidgetPeriod(widget: EditableLandingPricingWidget, period: PricingPeriod) {
  if (!widget.when) widget.when = {}
  if (!widget.when.periods) widget.when.periods = []

  const idx = widget.when.periods.indexOf(period)
  if (idx >= 0) {
    widget.when.periods.splice(idx, 1)
  } else {
    widget.when.periods.push(period)
  }

  // Keep stable order
  widget.when.periods = widget.when.periods.filter((p) => p === 'week' || p === 'month' || p === 'custom')
  const order: PricingPeriod[] = ['week', 'month', 'custom']
  widget.when.periods.sort((a, b) => order.indexOf(a) - order.indexOf(b))

  if (!widget.when.periods.length) {
    delete widget.when.periods
  }
  if (!widget.when.periods) {
    delete widget.when
  }
}

function togglePlanGroupField(plan: EditableLandingPricingPlan, key: PricingGroupFieldKey) {
  if (!plan.group_fields) plan.group_fields = []
  const idx = plan.group_fields.indexOf(key)
  if (idx >= 0) {
    plan.group_fields.splice(idx, 1)
    if (!plan.group_fields.length) delete (plan as any).group_fields
    return
  }
  plan.group_fields.push(key)
}

async function loadPricingGroups() {
  pricingGroupsLoading.value = true
  try {
    pricingGroups.value = await adminAPI.groups.getAll()
  } catch {
    pricingGroups.value = []
  } finally {
    pricingGroupsLoading.value = false
  }
}

function resetLandingPricingConfig() {
  form.landing_pricing_config = DEFAULT_LANDING_PRICING_CONFIG_V1_JSON
  landingPricingConfigError.value = ''
  landingPricingDraft.value = createLandingPricingDraft()
}

function formatLandingPricingConfig() {
  if (!form.landing_pricing_config || !form.landing_pricing_config.trim()) {
    resetLandingPricingConfig()
    return
  }

  try {
    const parsed = JSON.parse(form.landing_pricing_config)
    form.landing_pricing_config = JSON.stringify(parsed, null, 2)
    landingPricingConfigError.value = ''
  } catch (e: any) {
    landingPricingConfigError.value = e?.message || t('common.invalidJson')
  }
}

watch(
  () => landingPricingEditorMode.value,
  (mode) => {
    if (mode === 'ui') {
      syncLandingPricingDraftFromJson()
      return
    }
    form.landing_pricing_config = buildLandingPricingJsonFromDraft()
    landingPricingConfigError.value = ''
  }
)

async function loadSettings() {
  loading.value = true
  try {
    const settings = await adminAPI.settings.getSettings()
    Object.assign(form, settings)
    form.smtp_password = ''
    form.turnstile_secret_key = ''
    form.linuxdo_connect_client_secret = ''
    if (!form.landing_pricing_config) {
      form.landing_pricing_config = DEFAULT_LANDING_PRICING_CONFIG_V1_JSON
    }
    syncLandingPricingDraftFromJson()
    initialSettingsState.value = settingsPayloadSnapshot()
    markGatewayKeywordSnapshotSaved()
    gatewayCodexAliasesRaw.value = codexAliasesToTextarea(form.gateway_codex_model_aliases)
  } catch (error: any) {
    appStore.showError(
      t('admin.settings.failedToLoad') + ': ' + (error.message || t('common.unknownError'))
    )
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  try {
    if (landingPricingEditorMode.value === 'ui') {
      form.landing_pricing_config = buildLandingPricingJsonFromDraft()
    }
    const { error: pricingError } = parseLandingPricingConfig(form.landing_pricing_config)
    if (pricingError) {
      landingPricingConfigError.value = pricingError
      appStore.showError(t('admin.settings.site.landingPricingConfigInvalid') + ': ' + pricingError)
      return
    }
    landingPricingConfigError.value = ''

    const updated = await adminAPI.settings.updateSettings(buildUpdateSettingsPayload())
    Object.assign(form, updated)
    form.smtp_password = ''
    form.turnstile_secret_key = ''
    form.linuxdo_connect_client_secret = ''
    syncLandingPricingDraftFromJson()
    initialSettingsState.value = settingsPayloadSnapshot()
    markGatewayKeywordSnapshotSaved()
    gatewayCodexAliasesRaw.value = codexAliasesToTextarea(form.gateway_codex_model_aliases)
    // Refresh cached public settings so sidebar/header update immediately
    await appStore.fetchPublicSettings(true)
    appStore.showSuccess(t('admin.settings.settingsSaved'))

    if (streamTimeoutDirty.value) {
      try {
        await saveStreamTimeoutSettings({ silent: true })
      } catch (error: any) {
        appStore.showError(
          t('admin.settings.streamTimeout.saveFailed') +
            ': ' +
            (error.message || t('common.unknownError'))
        )
      }
    }
  } catch (error: any) {
    appStore.showError(
      t('admin.settings.failedToSave') + ': ' + (error.message || t('common.unknownError'))
    )
  } finally {
    saving.value = false
  }
}

async function testSmtpConnection() {
  testingSmtp.value = true
  try {
    const result = await adminAPI.settings.testSmtpConnection({
      smtp_host: form.smtp_host,
      smtp_port: form.smtp_port,
      smtp_username: form.smtp_username,
      smtp_password: form.smtp_password,
      smtp_use_tls: form.smtp_use_tls
    })
    // API returns { message: "..." } on success, errors are thrown as exceptions
    appStore.showSuccess(result.message || t('admin.settings.smtpConnectionSuccess'))
  } catch (error: any) {
    appStore.showError(
      t('admin.settings.failedToTestSmtp') + ': ' + (error.message || t('common.unknownError'))
    )
  } finally {
    testingSmtp.value = false
  }
}

async function sendTestEmail() {
  if (!testEmailAddress.value) {
    appStore.showError(t('admin.settings.testEmail.enterRecipientHint'))
    return
  }

  sendingTestEmail.value = true
  try {
    const result = await adminAPI.settings.sendTestEmail({
      email: testEmailAddress.value,
      smtp_host: form.smtp_host,
      smtp_port: form.smtp_port,
      smtp_username: form.smtp_username,
      smtp_password: form.smtp_password,
      smtp_from_email: form.smtp_from_email,
      smtp_from_name: form.smtp_from_name,
      smtp_use_tls: form.smtp_use_tls
    })
    // API returns { message: "..." } on success, errors are thrown as exceptions
    appStore.showSuccess(result.message || t('admin.settings.testEmailSent'))
  } catch (error: any) {
    appStore.showError(
      t('admin.settings.failedToSendTestEmail') + ': ' + (error.message || t('common.unknownError'))
    )
  } finally {
    sendingTestEmail.value = false
  }
}

// Admin API Key 方法
async function loadAdminApiKey() {
  adminApiKeyLoading.value = true
  try {
    const status = await adminAPI.settings.getAdminApiKey()
    adminApiKeyExists.value = status.exists
    adminApiKeyMasked.value = status.masked_key
  } catch (error: any) {
    console.error('Failed to load admin API key status:', error)
  } finally {
    adminApiKeyLoading.value = false
  }
}

async function createAdminApiKey() {
  adminApiKeyOperating.value = true
  try {
    const result = await adminAPI.settings.regenerateAdminApiKey()
    newAdminApiKey.value = result.key
    adminApiKeyExists.value = true
    adminApiKeyMasked.value = result.key.substring(0, 10) + '...' + result.key.slice(-4)
    appStore.showSuccess(t('admin.settings.adminApiKey.keyGenerated'))
  } catch (error: any) {
    appStore.showError(error.message || t('common.error'))
  } finally {
    adminApiKeyOperating.value = false
  }
}

async function regenerateAdminApiKey() {
  if (!confirm(t('admin.settings.adminApiKey.regenerateConfirm'))) return
  await createAdminApiKey()
}

async function deleteAdminApiKey() {
  if (!confirm(t('admin.settings.adminApiKey.deleteConfirm'))) return
  adminApiKeyOperating.value = true
  try {
    await adminAPI.settings.deleteAdminApiKey()
    adminApiKeyExists.value = false
    adminApiKeyMasked.value = ''
    newAdminApiKey.value = ''
    appStore.showSuccess(t('admin.settings.adminApiKey.keyDeleted'))
  } catch (error: any) {
    appStore.showError(error.message || t('common.error'))
  } finally {
    adminApiKeyOperating.value = false
  }
}

function copyNewKey() {
  navigator.clipboard
    .writeText(newAdminApiKey.value)
    .then(() => {
      appStore.showSuccess(t('admin.settings.adminApiKey.keyCopied'))
    })
    .catch(() => {
      appStore.showError(t('common.copyFailed'))
    })
}

// Stream Timeout 方法
async function loadStreamTimeoutSettings() {
  streamTimeoutLoading.value = true
  try {
    const settings = await adminAPI.settings.getStreamTimeoutSettings()
    Object.assign(streamTimeoutForm, settings)
    initialStreamTimeoutState.value = streamTimeoutStateSnapshot()
  } catch (error: any) {
    console.error('Failed to load stream timeout settings:', error)
  } finally {
    streamTimeoutLoading.value = false
  }
}

async function saveStreamTimeoutSettings(options?: { silent?: boolean }) {
  streamTimeoutSaving.value = true
  try {
    const updated = await adminAPI.settings.updateStreamTimeoutSettings({
      enabled: streamTimeoutForm.enabled,
      action: streamTimeoutForm.action,
      temp_unsched_minutes: streamTimeoutForm.temp_unsched_minutes,
      threshold_count: streamTimeoutForm.threshold_count,
      threshold_window_minutes: streamTimeoutForm.threshold_window_minutes
    })
    Object.assign(streamTimeoutForm, updated)
    initialStreamTimeoutState.value = streamTimeoutStateSnapshot()
    if (!options?.silent) appStore.showSuccess(t('admin.settings.streamTimeout.saved'))
  } catch (error: any) {
    if (!options?.silent) {
      appStore.showError(
        t('admin.settings.streamTimeout.saveFailed') + ': ' + (error.message || t('common.unknownError'))
      )
    }
    throw error
  } finally {
    streamTimeoutSaving.value = false
  }
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onWindowKeydown)
    window.addEventListener('click', onWindowClickCapture, true)
  }
  loadSettings()
  loadPricingGroups()
  loadAdminApiKey()
  loadStreamTimeoutSettings()
})
</script>
