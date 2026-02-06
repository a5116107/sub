<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useProfileQuery, useTotpStatusQuery } from '~/entities/user'
import { StatusBadge, LoadingState } from '~/widgets'
import { Button, Input } from '~/shared/ui'
import { formatDate } from '~/shared/utils'

const { t } = useI18n()

const { data: profile, isLoading: profileLoading } = useProfileQuery()
const { data: totpStatus } = useTotpStatusQuery()
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-bold text-text-primary">{{ t('profile.title') }}</h1>
      <p class="mt-1 text-text-secondary">Manage your profile and security settings.</p>
    </div>

    <LoadingState v-if="profileLoading" />

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Profile Info -->
      <div class="bg-bg-primary rounded-xl shadow-sm border border-border p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">{{ t('profile.info') }}</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('profile.email') }}</label>
            <p class="text-text-primary">{{ profile?.email }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('profile.username') }}</label>
            <p class="text-text-primary">{{ profile?.username || '-' }}</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('profile.role') }}</label>
            <StatusBadge :status="profile?.role || 'user'" />
          </div>

          <div>
            <label class="block text-sm font-medium text-text-secondary mb-1">{{ t('common.createdAt') }}</label>
            <p class="text-text-primary">{{ formatDate(profile?.created_at || '') }}</p>
          </div>
        </div>
      </div>

      <!-- Security Settings -->
      <div class="bg-bg-primary rounded-xl shadow-sm border border-border p-6">
        <h2 class="text-lg font-semibold text-text-primary mb-4">{{ t('profile.security') }}</h2>

        <div class="space-y-6">
          <!-- 2FA Status -->
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-medium text-text-primary">{{ t('profile.twoFactor') }}</h3>
              <p class="text-sm text-text-secondary">
                {{ totpStatus?.enabled ? t('profile.twoFactorEnabled') : t('profile.twoFactorDisabled') }}
              </p>
            </div>
            <Button :variant="totpStatus?.enabled ? 'secondary' : 'primary'">
              {{ totpStatus?.enabled ? t('profile.disable2FA') : t('profile.enable2FA') }}
            </Button>
          </div>

          <div class="border-t border-border" />

          <!-- Change Password -->
          <div>
            <h3 class="font-medium text-text-primary mb-2">{{ t('profile.changePassword') }}</h3>
            <div class="space-y-3">
              <Input type="password" :label="t('profile.currentPassword')" />
              <Input type="password" :label="t('profile.newPassword')" />
              <Input type="password" :label="t('profile.confirmPassword')" />
              <Button variant="primary">{{ t('common.save') }}</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
