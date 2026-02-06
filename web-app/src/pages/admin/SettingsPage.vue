<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button, Input } from '~/shared/ui'

const { t } = useI18n()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">{{ t('admin.settings.title') }}</h1>
      <p class="mt-1 text-text-secondary">Configure system settings.</p>
    </div>

    <div class="bg-bg-primary rounded-xl shadow-sm border border-border p-6">
      <h2 class="text-lg font-semibold text-text-primary mb-4">{{ t('admin.settings.general') }}</h2>

      <div class="space-y-4 max-w-lg">
        <Input label="Site Name" model-value="Sub2API" />
        <Input label="Site Subtitle" model-value="" />
        <Input label="Contact Email" model-value="" />

        <div class="pt-4">
          <Button variant="primary">{{ t('common.save') }}</Button>
        </div>
      </div>
    </div>

    <div class="bg-bg-primary rounded-xl shadow-sm border border-border p-6">
      <h2 class="text-lg font-semibold text-text-primary mb-4">{{ t('admin.settings.security') }}</h2>

      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-text-primary">Registration</h3>
            <p class="text-sm text-text-secondary">Allow new users to register</p>
          </div>
          <input type="checkbox" checked class="w-5 h-5 rounded border-border text-primary-600" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-text-primary">Email Verification</h3>
            <p class="text-sm text-text-secondary">Require email verification for new accounts</p>
          </div>
          <input type="checkbox" checked class="w-5 h-5 rounded border-border text-primary-600" />
        </div>

        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-text-primary">Two-Factor Authentication</h3>
            <p class="text-sm text-text-secondary">Allow users to enable 2FA</p>
          </div>
          <input type="checkbox" checked class="w-5 h-5 rounded border-border text-primary-600" />
        </div>
      </div>
    </div>
  </div>
</template>
