<template>
  <!-- Custom Home Content: Full Page Mode -->
  <div v-if="homeContent" class="min-h-screen">
    <!-- iframe mode -->
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <!-- HTML mode (sanitized) -->
    <div v-else v-html="sanitizedHomeContent"></div>
  </div>

  <!-- Default Home Page -->
  <div
    v-else
    class="relative flex min-h-screen flex-col overflow-hidden"
  >
    <!-- Background Decorations -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        class="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary-400/20 blur-3xl"
      ></div>
      <div
        class="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary-500/15 blur-3xl"
      ></div>
      <div
        class="absolute left-1/3 top-1/4 h-72 w-72 rounded-full bg-primary-300/10 blur-3xl"
      ></div>
      <div
        class="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-primary-400/10 blur-3xl"
      ></div>
      <div class="absolute right-1/3 top-2/3 h-72 w-72 rounded-full bg-gold-500/8 blur-3xl"></div>
      <div
        class="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
      ></div>
    </div>

    <!-- Header -->
    <header class="relative z-20 px-6 pt-6">
      <nav
        class="neo-surface neo-border-animated mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 py-3 shadow-glass-sm"
      >
        <!-- Brand -->
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 overflow-hidden rounded-xl shadow-glow">
            <img :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
          </div>
          <div class="hidden flex-col leading-tight sm:flex">
            <span class="text-sm font-semibold text-gray-900 dark:text-white">{{ siteName }}</span>
            <span class="text-xs text-gray-500 dark:text-dark-400">{{ t('home.nav.enterprise') }}</span>
          </div>
        </div>

        <!-- Nav -->
        <div class="hidden items-center gap-1 sm:flex">
          <a
            href="#features"
            class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100/70 hover:text-gray-900 dark:text-dark-300 dark:hover:bg-dark-900/50 dark:hover:text-white"
          >
            {{ t('home.nav.features') }}
          </a>
          <a
            href="#providers"
            class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100/70 hover:text-gray-900 dark:text-dark-300 dark:hover:bg-dark-900/50 dark:hover:text-white"
          >
            {{ t('home.nav.providers') }}
          </a>
          <a
            v-if="landingPricingEnabled"
            href="#pricing"
            class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100/70 hover:text-gray-900 dark:text-dark-300 dark:hover:bg-dark-900/50 dark:hover:text-white"
          >
            {{ t('home.pricing.nav') }}
          </a>

          <router-link
            v-if="docUrl && docUrlIsInternal"
            :to="docUrl"
            class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100/70 hover:text-gray-900 dark:text-dark-300 dark:hover:bg-dark-900/50 dark:hover:text-white"
          >
            {{ t('home.docs') }}
          </router-link>
          <a
            v-else-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100/70 hover:text-gray-900 dark:text-dark-300 dark:hover:bg-dark-900/50 dark:hover:text-white"
          >
            {{ t('home.docs') }}
          </a>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2">
          <LocaleSwitcher />

          <router-link
            v-if="docUrl && docUrlIsInternal"
            :to="docUrl"
            class="btn btn-ghost btn-icon"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </router-link>
          <a
            v-else-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-ghost btn-icon"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </a>

          <button
            @click="toggleTheme"
            class="btn btn-ghost btn-icon"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          >
            <Icon v-if="isDark" name="sun" size="md" />
            <Icon v-else name="moon" size="md" />
          </button>

          <router-link v-if="isAuthenticated" :to="dashboardPath" class="btn btn-secondary btn-sm">
            <span
              class="flex h-5 w-5 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-[10px] font-semibold text-white"
            >
              {{ userInitial }}
            </span>
            <span class="hidden sm:inline">{{ t('home.dashboard') }}</span>
            <Icon name="arrowRight" size="sm" :stroke-width="2" class="hidden sm:inline" />
          </router-link>
          <template v-else>
            <router-link to="/login" class="btn btn-secondary btn-sm">{{ t('home.login') }}</router-link>
            <router-link to="/register" class="btn btn-primary btn-sm">{{ t('home.getStarted') }}</router-link>
          </template>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="relative z-10 flex-1 px-6 py-14 md:py-20">
      <div class="mx-auto max-w-7xl">
        <!-- Hero (NeoGraphite) -->
        <div class="mb-14">
          <div class="neo-panel neo-border-animated px-6 py-8 md:px-10 md:py-10">
            <div class="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <!-- Left: Text Content -->
          <div class="lg:col-span-6">
            <div
              class="mb-5 inline-flex flex-wrap items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-primary-400 shadow-glow"></span>
              {{ t('home.nav.enterprise') }}
              <span class="hidden opacity-70 sm:inline">·</span>
              <span class="hidden sm:inline">{{ t('home.tags.realtimeBilling') }}</span>
            </div>

            <h1 class="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
              <span class="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-700 bg-clip-text text-transparent">
                {{ siteName }}
              </span>
            </h1>
            <p class="mb-8 text-lg text-white/70 md:text-xl">
              {{ siteSubtitle }}
            </p>

            <!-- CTA -->
            <div class="flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
              <router-link
                :to="isAuthenticated ? dashboardPath : '/register'"
                class="btn btn-primary btn-lg w-full px-8 sm:w-auto"
              >
                {{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}
                <Icon name="arrowRight" size="md" class="ml-2" :stroke-width="2" />
              </router-link>
              <a
                v-if="landingPricingEnabled"
                href="#pricing"
                class="btn btn-secondary btn-lg w-full px-8 sm:w-auto"
              >
                {{ t('home.pricing.nav') }}
              </a>
            </div>
          </div>

          <!-- Right: Terminal Animation -->
          <div class="lg:col-span-6 lg:pl-2">
            <div class="terminal-container">
              <div class="terminal-window">
                <!-- Window header -->
                <div class="terminal-header">
                  <div class="terminal-buttons">
                    <span class="btn-close"></span>
                    <span class="btn-minimize"></span>
                    <span class="btn-maximize"></span>
                  </div>
                  <span class="terminal-title">terminal</span>
                </div>
                <!-- Terminal content -->
                <div class="terminal-body">
                  <div class="code-line line-1">
                    <span class="code-prompt">$</span>
                    <span class="code-cmd">curl</span>
                    <span class="code-flag">-X POST</span>
                    <span class="code-url">/v1/messages</span>
                  </div>
                  <div class="code-line line-2">
                    <span class="code-comment"># Routing to upstream...</span>
                  </div>
                  <div class="code-line line-3">
                    <span class="code-success">200 OK</span>
                    <span class="code-response">{ "content": "Hello!" }</span>
                  </div>
                  <div class="code-line line-4">
                    <span class="code-prompt">$</span>
                    <span class="cursor"></span>
                  </div>
                </div>
              </div>
              <div class="mt-4 flex items-center justify-between gap-3 px-1 text-xs text-white/60">
                <span class="hidden sm:inline">{{ t('home.tags.subscriptionToApi') }} · /v1/messages</span>
                <button
                  type="button"
                  class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
                  @click="copyHeroSnippet"
                >
                  <Icon name="clipboard" size="sm" />
                  <span class="hidden sm:inline">{{ t('common.copyToClipboard') }}</span>
                </button>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>

        <section id="features" class="mb-16">
        <!-- Feature Tags - Centered -->
        <div class="mb-10 flex flex-wrap items-center justify-center gap-3 md:gap-4">
          <div class="neo-surface inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-glass-sm">
            <Icon name="swap" size="sm" class="text-primary-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{
              t('home.tags.subscriptionToApi')
            }}</span>
          </div>
          <div
            class="neo-surface inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-glass-sm"
          >
            <Icon name="shield" size="sm" class="text-primary-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{
              t('home.tags.stickySession')
            }}</span>
          </div>
          <div
            class="neo-surface inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-glass-sm"
          >
            <Icon name="chart" size="sm" class="text-primary-500" />
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{
              t('home.tags.realtimeBilling')
            }}</span>
          </div>
        </div>

        <!-- Features Grid -->
        <div class="grid gap-6 md:grid-cols-3">
          <!-- Feature 1: Unified Gateway -->
          <div class="card card-hover group p-6">
            <div
              class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30 transition-transform group-hover:scale-110"
            >
              <Icon name="server" size="lg" class="text-white" />
            </div>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('home.features.unifiedGateway') }}
            </h3>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-dark-400">
              {{ t('home.features.unifiedGatewayDesc') }}
            </p>
          </div>

          <!-- Feature 2: Account Pool -->
          <div class="card card-hover group p-6">
            <div
              class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30 transition-transform group-hover:scale-110"
            >
              <svg
                class="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                />
              </svg>
            </div>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('home.features.multiAccount') }}
            </h3>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-dark-400">
              {{ t('home.features.multiAccountDesc') }}
            </p>
          </div>

          <!-- Feature 3: Billing & Quota -->
          <div class="card card-hover group p-6">
            <div
              class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30 transition-transform group-hover:scale-110"
            >
              <svg
                class="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="1.5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
                />
              </svg>
            </div>
            <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              {{ t('home.features.balanceQuota') }}
            </h3>
            <p class="text-sm leading-relaxed text-gray-600 dark:text-dark-400">
              {{ t('home.features.balanceQuotaDesc') }}
            </p>
          </div>
        </div>
        </section>

        <section id="providers" class="mb-16">
        <!-- Supported Providers -->
        <div class="mb-8 text-center">
          <h2 class="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
            {{ t('home.providers.title') }}
          </h2>
          <p class="text-sm text-gray-600 dark:text-dark-400">
            {{ t('home.providers.description') }}
          </p>
        </div>

        <div class="mb-16 flex flex-wrap items-center justify-center gap-4">
          <!-- Claude - Supported -->
          <div
            class="neo-surface flex items-center gap-2 rounded-xl px-5 py-3 ring-1 ring-primary-500/20"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-500"
            >
              <span class="text-xs font-bold text-white">C</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.providers.claude') }}</span>
            <span
              class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
              >{{ t('home.providers.supported') }}</span
            >
          </div>
          <!-- GPT - Supported -->
          <div
            class="neo-surface flex items-center gap-2 rounded-xl px-5 py-3 ring-1 ring-primary-500/20"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600"
            >
              <span class="text-xs font-bold text-white">G</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">GPT</span>
            <span
              class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
              >{{ t('home.providers.supported') }}</span
            >
          </div>
          <!-- Gemini - Supported -->
          <div
            class="neo-surface flex items-center gap-2 rounded-xl px-5 py-3 ring-1 ring-primary-500/20"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600"
            >
              <span class="text-xs font-bold text-white">G</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.providers.gemini') }}</span>
            <span
              class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
              >{{ t('home.providers.supported') }}</span
            >
          </div>
          <!-- Antigravity - Supported -->
          <div
            class="neo-surface flex items-center gap-2 rounded-xl px-5 py-3 ring-1 ring-primary-500/20"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-pink-600"
            >
              <span class="text-xs font-bold text-white">A</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.providers.antigravity') }}</span>
            <span
              class="rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
              >{{ t('home.providers.supported') }}</span
            >
          </div>
          <!-- More - Coming Soon -->
          <div
            class="neo-surface flex items-center gap-2 rounded-xl px-5 py-3 opacity-70"
          >
            <div
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gray-500 to-gray-600"
            >
              <span class="text-xs font-bold text-white">+</span>
            </div>
            <span class="text-sm font-medium text-gray-700 dark:text-dark-200">{{ t('home.providers.more') }}</span>
            <span
              class="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-dark-700 dark:text-dark-400"
              >{{ t('home.providers.soon') }}</span
            >
          </div>
        </div>
        </section>

        <!-- Pricing -->
        <section v-if="landingPricingEnabled" id="pricing" class="scroll-mt-24">
          <div class="mb-8 text-center">
            <h2 class="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
              {{ pricingConfigTitle }}
            </h2>
            <p v-if="pricingConfigSubtitle" class="text-sm text-gray-600 dark:text-dark-400">
              {{ pricingConfigSubtitle }}
            </p>
          </div>

          <!-- Tabs -->
          <div class="mb-8 flex flex-col items-center justify-center gap-4">
            <div class="tabs">
              <button
                type="button"
                class="tab"
                :class="{ 'tab-active': pricingTab === 'subscription' }"
                @click="pricingTab = 'subscription'"
              >
                {{ pricing.subscription.title }}
              </button>
              <button
                type="button"
                class="tab"
                :class="{ 'tab-active': pricingTab === 'payg' }"
                @click="pricingTab = 'payg'"
              >
                {{ pricing.payg.title }}
              </button>
            </div>

            <!-- Period toggle (subscription only) -->
            <div v-if="pricingTab === 'subscription'" class="tabs">
              <button
                v-for="p in subscriptionPeriods"
                :key="p.key"
                type="button"
                class="tab"
                :class="{ 'tab-active': pricingPeriod === p.key }"
                @click="pricingPeriod = p.key"
              >
                {{ p.label }}
              </button>
            </div>
            <p
              v-if="pricingTab === 'subscription' && pricingPeriod === 'custom'"
              class="text-center text-xs text-gray-500 dark:text-dark-400"
            >
              {{ t('home.pricing.customHint') }}
            </p>
          </div>

          <!-- Subscription plans -->
          <div v-if="pricingTab === 'subscription'" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="plan in visibleSubscriptionPlans"
              :key="plan.id"
              class="card card-hover p-6"
              :class="
                plan.id === 'enterprise'
                  ? 'ring-1 ring-gold-500/25 neo-border-animated'
                  : plan.highlighted
                    ? 'ring-1 ring-primary-500/30 shadow-glow neo-border-animated'
                    : ''
              "
            >
              <div class="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                      {{ plan.name }}
                    </h3>
                    <span
                      v-if="plan.badge"
                      class="badge"
                      :class="
                        plan.id === 'enterprise'
                          ? 'badge-gold'
                          : plan.highlighted
                            ? 'badge-primary'
                            : 'badge-gray'
                      "
                    >
                      {{ plan.badge }}
                    </span>
                  </div>
                  <p v-if="plan.description" class="mt-1 text-sm text-gray-600 dark:text-dark-400">
                    {{ plan.description }}
                  </p>
                </div>
              </div>

              <div class="mb-5">
                <div class="flex items-baseline gap-2">
                  <p class="text-3xl font-bold text-gray-900 dark:text-white">
                    {{
                      plan.price.custom
                        ? plan.price.custom
                        : formatCny(
                            pricingPeriod === 'week' ? plan.price.week || 0 : plan.price.month || 0
                          )
                    }}
                  </p>
                  <span
                    v-if="!plan.price.custom && pricingPeriod !== 'custom'"
                    class="text-sm text-gray-500 dark:text-dark-400"
                  >
                    /{{ periodLabel(pricingPeriod) }}
                  </span>
                </div>
                <p v-if="plan.highlighted" class="mt-2 text-xs text-primary-600 dark:text-primary-400">
                  {{ t('home.tags.realtimeBilling') }} · {{ t('home.features.balanceQuota') }}
                </p>
              </div>

              <PricingPlanPerks :plan="plan" :groups="pricingGroups" :period="pricingPeriod" class="mb-6" />

              <router-link
                :to="planCtaTo(plan.id, pricingPeriod)"
                class="btn w-full"
                :class="plan.id === 'enterprise' ? 'btn-premium' : 'btn-primary'"
              >
                {{ isAuthenticated ? t('home.pricing.goToPurchase') : t('home.getStarted') }}
                <Icon name="arrowRight" size="sm" class="ml-1.5" :stroke-width="2" />
              </router-link>
            </div>
          </div>

          <!-- Pay-as-you-go -->
          <div v-else class="mx-auto max-w-3xl">
            <div
              class="card neo-border-animated p-8"
            >
              <p v-if="pricing.payg.subtitle" class="text-sm text-gray-600 dark:text-dark-400">
                {{ pricing.payg.subtitle }}
              </p>
              <ul class="mt-6 space-y-2 text-sm text-gray-700 dark:text-dark-200">
                <li v-for="(f, idx) in pricing.payg.features" :key="idx" class="flex items-start gap-2">
                  <Icon name="check" size="sm" class="mt-0.5 text-primary-500" :stroke-width="2" />
                  <span>{{ f }}</span>
                </li>
              </ul>

              <div class="mt-8 flex flex-col gap-3 sm:flex-row">
                <router-link :to="paygCtaTo" class="btn btn-primary flex-1">
                  {{ pricing.payg.cta_label || t('dashboard.addBalanceWithCode') }}
                  <Icon name="arrowRight" size="sm" class="ml-1.5" :stroke-width="2" />
                </router-link>
                <router-link v-if="isAuthenticated" to="/redeem" class="btn btn-secondary flex-1">
                  {{ t('dashboard.addBalanceWithCode') }}
                </router-link>
              </div>

              <p v-if="pricing.payg.note" class="mt-4 text-xs text-gray-500 dark:text-dark-400">
                {{ pricing.payg.note }}
              </p>
            </div>

            <p v-if="pricing.note" class="mt-6 text-center text-xs text-gray-500 dark:text-dark-400">
              {{ pricing.note }}
            </p>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-gray-200/50 px-6 py-8 dark:border-dark-800/50">
      <div
        class="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 text-center sm:flex-row sm:text-left"
      >
        <p class="text-sm text-gray-500 dark:text-dark-400">
          &copy; {{ currentYear }} {{ siteName }}. {{ t('home.footer.allRightsReserved') }}
        </p>
        <div class="flex items-center gap-4">
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-dark-400 dark:hover:text-white"
          >
            {{ t('home.docs') }}
          </a>
          <a
            :href="githubUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-dark-400 dark:hover:text-white"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import DOMPurify from 'dompurify'
import { useAuthStore, useAppStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import PricingPlanPerks from '@/components/pricing/PricingPlanPerks.vue'
import Icon from '@/components/icons/Icon.vue'
import { useClipboard } from '@/composables/useClipboard'
import {
  formatCny,
  parseLandingPricingConfig,
  type PricingTab,
  type PricingPeriod
} from '@/utils/landingPricing'

const { t } = useI18n()

const authStore = useAuthStore()
const appStore = useAppStore()

// Site settings - directly from appStore (already initialized from injected config)
const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '')
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || 'AI API Gateway Platform')
const docUrl = computed(() => appStore.cachedPublicSettings?.doc_url || appStore.docUrl || '')
const docUrlIsInternal = computed(() => docUrl.value.startsWith('/'))
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')
const sanitizedHomeContent = computed(() => {
  const raw = homeContent.value || ''
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
})
const landingPricingEnabled = computed(() => appStore.cachedPublicSettings?.landing_pricing_enabled ?? true)
const pricingParseResult = computed(() =>
  parseLandingPricingConfig(appStore.cachedPublicSettings?.landing_pricing_config || '')
)
const pricing = computed(() => pricingParseResult.value.config)
const pricingGroups = computed(() => appStore.cachedPublicSettings?.landing_pricing_groups || [])

// Check if homeContent is a URL (for iframe display)
const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

// Theme
const isDark = ref(document.documentElement.classList.contains('dark'))

// GitHub URL
const githubUrl = 'https://github.com/Wei-Shaw/sub2api'

// Auth state
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => isAdmin.value ? '/admin/dashboard' : '/dashboard')
const userInitial = computed(() => {
  const user = authStore.user
  if (!user || !user.email) return ''
  return user.email.charAt(0).toUpperCase()
})

// Current year for footer
const currentYear = computed(() => new Date().getFullYear())

type DisplayPeriod = PricingPeriod

const pricingTab = ref<PricingTab>('subscription')
const pricingPeriod = ref<DisplayPeriod>('month')
const pricingUiInitialized = ref(false)

const { copyToClipboard } = useClipboard()

const heroSnippet = computed(() => {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'
  return [
    `curl -X POST ${base}/v1/messages \\`,
    '  -H \"Authorization: Bearer $SUB2API_KEY\" \\',
    '  -H \"Content-Type: application/json\" \\',
    '  -d \"{\\\"model\\\":\\\"claude-3-5-haiku-latest\\\",\\\"messages\\\":[{\\\"role\\\":\\\"user\\\",\\\"content\\\":\\\"Hello!\\\"}]}\"'
  ].join('\n')
})

async function copyHeroSnippet() {
  await copyToClipboard(heroSnippet.value, t('common.copiedToClipboard'))
}

watch(
  pricing,
  (cfg) => {
    if (pricingUiInitialized.value) return
    pricingTab.value = cfg.default_tab
    pricingPeriod.value =
      cfg.subscription.default_period === 'week'
        ? 'week'
        : cfg.subscription.default_period === 'custom'
          ? 'custom'
          : 'month'
    pricingUiInitialized.value = true
  },
  { immediate: true }
)

const subscriptionPeriods = computed(() => {
  const periods = pricing.value.subscription.periods
  const hasCustomPlan = pricing.value.subscription.plans.some((p) => !!p.price.custom)
  return hasCustomPlan ? periods : periods.filter((p) => p.key !== 'custom')
})

const visibleSubscriptionPlans = computed(() => {
  const plans = pricing.value.subscription.plans
  if (pricingPeriod.value !== 'custom') return plans
  const customPlans = plans.filter((p) => !!p.price.custom)
  return customPlans.length ? customPlans : plans
})

const pricingConfigTitle = computed(() =>
  pricingTab.value === 'subscription' ? pricing.value.subscription.title : pricing.value.payg.title
)

const pricingConfigSubtitle = computed(() =>
  pricingTab.value === 'subscription' ? pricing.value.subscription.subtitle : pricing.value.payg.subtitle
)

function periodLabel(key: DisplayPeriod): string {
  const found = pricing.value.subscription.periods.find((p) => p.key === key)
  return found?.label || key
}

function purchaseQueryString(params: Record<string, string>): string {
  const sp = new URLSearchParams(params)
  return `/purchase?${sp.toString()}`
}

function planCtaTo(planId: string, period: DisplayPeriod) {
  const redirect = purchaseQueryString({ tab: 'subscription', plan: planId, period })
  if (!isAuthenticated.value) {
    return { path: '/register', query: { redirect } }
  }
  return { path: '/purchase', query: { tab: 'subscription', plan: planId, period } }
}

const paygCtaTo = computed(() => {
  const redirect = purchaseQueryString({ tab: 'payg' })
  if (!isAuthenticated.value) {
    return { path: '/register', query: { redirect } }
  }
  return { path: '/purchase', query: { tab: 'payg' } }
})

// Toggle theme
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
}

onMounted(() => {
  initTheme()

  // Check auth state
  authStore.checkAuth()

  // Ensure public settings are loaded (will use cache if already loaded from injected config)
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})
</script>

<style scoped>
/* Terminal Container */
.terminal-container {
  position: relative;
  display: inline-block;
}

/* Terminal Window */
.terminal-window {
  width: 420px;
  max-width: 100%;
  background: linear-gradient(145deg, rgba(2, 6, 23, 0.92) 0%, #0f172a 55%, rgba(2, 6, 23, 0.94) 100%);
  border-radius: 14px;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(34, 211, 238, 0.18),
    0 0 34px rgba(34, 211, 238, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  overflow: hidden;
  transform: perspective(1000px) rotateX(2deg) rotateY(-2deg);
  transition: transform 0.3s ease;
}

.terminal-window:hover {
  transform: perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(-4px);
}

/* Terminal Header */
.terminal-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.terminal-buttons {
  display: flex;
  gap: 8px;
}

.terminal-buttons span {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.btn-close {
  background: #ef4444;
}
.btn-minimize {
  background: #eab308;
}
.btn-maximize {
  background: #22c55e;
}

.terminal-title {
  flex: 1;
  text-align: center;
  font-size: 12px;
  font-family: ui-monospace, monospace;
  color: #64748b;
  margin-right: 52px;
}

/* Terminal Body */
.terminal-body {
  padding: 20px 24px;
  font-family: ui-monospace, 'Fira Code', monospace;
  font-size: 14px;
  line-height: 2;
}

.code-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  opacity: 0;
  animation: line-appear 0.5s ease forwards;
}

.line-1 {
  animation-delay: 0.3s;
}
.line-2 {
  animation-delay: 1s;
}
.line-3 {
  animation-delay: 1.8s;
}
.line-4 {
  animation-delay: 2.5s;
}

@keyframes line-appear {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.code-prompt {
  color: #22c55e;
  font-weight: bold;
}
.code-cmd {
  color: #38bdf8;
}
.code-flag {
  color: #a78bfa;
}
.code-url {
  color: #22d3ee;
}
.code-comment {
  color: #64748b;
  font-style: italic;
}
.code-success {
  color: #22c55e;
  background: rgba(34, 197, 94, 0.15);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}
.code-response {
  color: #fbbf24;
}

/* Blinking Cursor */
.cursor {
  display: inline-block;
  width: 8px;
  height: 16px;
  background: #22c55e;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

/* Dark mode adjustments */
:global(.dark) .terminal-window {
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(34, 211, 238, 0.22),
    0 0 40px rgba(34, 211, 238, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
</style>
