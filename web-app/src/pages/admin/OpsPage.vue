<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { StatCard } from '~/widgets'

const { t } = useI18n()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-text-primary">{{ t('admin.ops.title') }}</h1>
      <p class="mt-1 text-text-secondary">Monitor system health and performance.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard title="Active Connections" value="123" icon="🔌" />
      <StatCard title="Request Rate" value="45/s" icon="⚡" />
      <StatCard title="Avg Latency" value="234ms" icon="⏱️" />
      <StatCard title="Error Rate" value="0.1%" icon="⚠️" />
    </div>

    <div class="bg-bg-primary rounded-xl shadow-sm border border-border p-6">
      <h2 class="text-lg font-semibold text-text-primary mb-4">System Status</h2>
      <div class="space-y-4">
        <div class="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
          <span class="text-text-primary">API Gateway</span>
          <span class="px-2 py-1 bg-success/10 text-success rounded-full text-sm">Operational</span>
        </div>
        <div class="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
          <span class="text-text-primary">Database</span>
          <span class="px-2 py-1 bg-success/10 text-success rounded-full text-sm">Operational</span>
        </div>
        <div class="flex items-center justify-between p-4 bg-bg-secondary rounded-lg">
          <span class="text-text-primary">Cache</span>
          <span class="px-2 py-1 bg-success/10 text-success rounded-full text-sm">Operational</span>
        </div>
      </div>
    </div>
  </div>
</template>
