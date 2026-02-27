import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../../components/ui';
import { useLandingStyleStore } from '../../stores/landingStyleStore';
import {
  ChevronRight,
  ArrowRight,
  Zap,
  Globe,
  Cpu,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Code2,
  Server,
  Globe2,
} from 'lucide-react';

const LOGOS = [
  <svg key="l1" viewBox="0 0 100 30" className="h-7 fill-current opacity-40 hover:opacity-100 transition-opacity"><path d="M10,15 L20,5 L30,15 L20,25 Z M40,5 H50 V25 H40 Z M60,5 H80 V10 H65 V12 H75 V17 H65 V25 H60 Z" /></svg>,
  <svg key="l2" viewBox="0 0 100 30" className="h-7 fill-current opacity-40 hover:opacity-100 transition-opacity"><circle cx="15" cy="15" r="10" /> <rect x="35" y="5" width="20" height="20" /> <path d="M70,5 L90,5 L80,25 Z" /></svg>,
  <svg key="l3" viewBox="0 0 100 30" className="h-7 fill-current opacity-40 hover:opacity-100 transition-opacity"><path d="M10,5 L30,5 L30,10 L20,10 L20,25 L10,25 Z M40,5 L60,5 L60,10 L50,10 L50,25 L40,25 Z M70,5 H90 V10 H70 Z M70,12 H85 V17 H70 Z M70,20 H90 V25 H70 Z" /></svg>,
  <svg key="l4" viewBox="0 0 100 30" className="h-7 fill-current opacity-40 hover:opacity-100 transition-opacity"><rect x="10" y="5" width="20" height="20" rx="5" /> <circle cx="55" cy="15" r="10" /> <rect x="80" y="5" width="5" height="20" /> <rect x="90" y="5" width="5" height="20" /></svg>,
  <svg key="l5" viewBox="0 0 100 30" className="h-7 fill-current opacity-40 hover:opacity-100 transition-opacity"><path d="M10,25 L20,5 L30,25 M15,18 H25 M40,5 L40,25 M40,5 L60,15 L40,25 M70,5 H90 M80,5 V25" stroke="currentColor" strokeWidth="3" /></svg>
];

const CODE_SNIPPETS = {
  edge: {
    file: 'edge-function.ts',
    code: `import { geolocation } from '@nexus/edge';

export default async function handler(req: Request) {
  const { city, country } = geolocation(req);

  // Logic runs closer to the user
  return new Response(JSON.stringify({
    message: "Hello from " + city + ", " + country + "!",
    timestamp: Date.now()
  }), {
    headers: { 'content-type': 'application/json' }
  });
}`
  },
  middleware: {
    file: 'middleware.ts',
    code: `import { next } from '@nexus/edge';
import { verifyAuth } from './lib/auth';

export async function middleware(req: Request) {
  // 1. Verify Authentication at the Edge
  const session = await verifyAuth(req);

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  // 2. Add custom headers
  return next({
    headers: { 'x-user-id': session.id }
  });
}`
  },
  ai: {
    file: 'ai-stream.ts',
    code: `import { streamText } from 'nexus-ai';
import { openai } from '@ai-sdk/openai';

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Stream LLM response directly from edge
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
    maxTokens: 512,
  });

  return result.toDataStreamResponse();
}`
  }
};

export const LandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation('landing');
  const [activeCodeTab, setActiveCodeTab] = useState<'edge' | 'middleware' | 'ai'>('edge');
  const { lightStyle } = useLandingStyleStore();
  const isBusiness = lightStyle === 'business';

  const stats = [
    { label: t('stats.globalLatency'), value: '<30ms', icon: Zap, color: 'text-amber-500' },
    { label: t('stats.uptimeSLA'), value: '99.99%', icon: ShieldCheck, color: 'text-emerald-500' },
    { label: t('stats.edgeRegions'), value: '150+', icon: Globe, color: 'text-sky-500' },
    { label: t('stats.dailyRequests'), value: '2B+', icon: Activity, color: 'text-violet-500' },
  ];

  const regions = [
    { name: t('globalNetwork.regions.northAmerica'), status: t('globalNetwork.status'), locations: t('globalNetwork.locations') },
    { name: t('globalNetwork.regions.europe'), status: t('globalNetwork.status'), locations: t('globalNetwork.locations') },
    { name: t('globalNetwork.regions.asiaPacific'), status: t('globalNetwork.status'), locations: t('globalNetwork.locations') },
    { name: t('globalNetwork.regions.southAmerica'), status: t('globalNetwork.status'), locations: t('globalNetwork.locations') },
  ];

  return (
    <div className="bg-[var(--bg-primary)] min-h-screen text-[var(--text-primary)] font-sans overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 lg:pt-32 lg:pb-28 px-6 overflow-visible">
        {/* Advanced Background Gradients */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[980px] h-[560px] rounded-full blur-[110px] pointer-events-none ${isBusiness ? 'bg-blue-500/16' : 'bg-sky-400/20'}`} />
        <div className={`absolute top-[18%] right-[8%] w-[520px] h-[520px] rounded-full blur-[96px] pointer-events-none animate-pulse-slow ${isBusiness ? 'bg-indigo-700/12' : 'bg-indigo-400/14'}`} />
        <div className={`absolute inset-0 bg-grid-pattern pointer-events-none ${isBusiness ? 'opacity-[0.04]' : 'opacity-[0.05]'}`} />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
          {/* Left Content */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-primary)]/25 text-xs font-semibold text-[var(--accent-primary)] mb-2 animate-fade-in backdrop-blur-md transition-colors cursor-default shadow-[var(--shadow-sm)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-primary)]"></span>
              </span>
              {t('hero.badge')}
            </div>

            <h1 className="text-5xl lg:text-[4.65rem] font-extrabold tracking-tight leading-[1.05] text-[var(--text-primary)]">
              {t('hero.title.part1')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--accent-primary)] via-sky-500 to-[var(--accent-secondary)] animate-shimmer bg-[length:200%_auto]">{t('hero.title.part2')}</span> <br />
              {t('hero.title.part3')}
            </h1>

            <p className="text-lg lg:text-xl text-[var(--text-secondary)] max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              {t('hero.description')}
              <span className="text-[var(--accent-primary)] font-semibold"> {t('hero.highlight')}</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Link to={isAuthenticated ? '/app/dashboard' : '/register'}>
                <Button
                  variant="primary"
                  glow
                  className="w-full sm:w-auto h-14 text-base px-8 font-bold tracking-wide shadow-xl"
                >
                  {t('hero.cta.primary')} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Button variant="secondary" className="w-full sm:w-auto h-14 text-base px-8 font-medium hover:bg-[var(--accent-soft)]">
                {t('hero.cta.secondary')}
              </Button>
            </div>

            <div className="pt-10 border-t border-[var(--border-color-subtle)] mt-8">
              <p className="text-sm text-[var(--text-muted)] mb-6 uppercase tracking-wider font-semibold">{t('hero.trustedBy')}</p>
              <div className="flex flex-wrap justify-center lg:justify-start gap-8 lg:gap-12 grayscale hover:grayscale-0 transition-all duration-700">
                {LOGOS.map((logo, idx) => (
                  <div key={idx} className="w-24 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">{logo}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Content - Terminal Effect */}
          <div className="relative animate-float delay-100 hidden lg:block perspective-[2000px] z-20">
            <div className={`absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br rounded-xl blur-2xl opacity-30 animate-pulse ${isBusiness ? 'from-blue-500 to-slate-500' : 'from-sky-400 to-blue-500'}`} />
            <div className={`absolute -bottom-5 -left-5 w-32 h-32 rounded-full blur-3xl opacity-25 ${isBusiness ? 'bg-slate-400' : 'bg-violet-500'}`} />

            <div className="glass-panel rounded-xl overflow-hidden border border-[var(--border-color)] shadow-[var(--shadow-xl)]">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--code-bg)]">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
                <div className="ml-4 text-xs text-[var(--text-muted)] font-mono">nexus-cli</div>
              </div>
              <div className="p-6 font-mono text-sm">
                <div className="text-[var(--text-muted)] mb-2">$ nexus deploy</div>
                <div className="text-emerald-500 mb-1">✓ Building project...</div>
                <div className="text-emerald-500 mb-1">✓ Optimizing assets...</div>
                <div className="text-emerald-500 mb-1">✓ Deploying to edge...</div>
                <div className="text-[var(--accent-primary)] mb-2">✓ Deployed to 150+ regions in 890ms</div>
                <div className="text-[var(--text-muted)]">https://my-app.nexus.dev</div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[var(--text-muted)]">$</span>
                  <span className="w-2 h-4 bg-[var(--accent-primary)] animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <div className="border-y border-[var(--border-color-subtle)] bg-[var(--bg-card-alpha)] backdrop-blur-sm relative z-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="flex flex-col items-center lg:items-start text-center lg:text-left gap-2 group cursor-default rounded-2xl p-4 border border-[var(--border-color-subtle)] bg-[var(--bg-card-alpha)] transition-all hover:-translate-y-0.5 hover:border-[var(--border-color)] hover:shadow-[var(--shadow-md)]">
                <div className={`p-3 rounded-xl bg-[var(--accent-soft)] border border-[var(--border-color-subtle)] group-hover:border-[var(--border-color)] transition-colors mb-2 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">{stat.value}</div>
                <div className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[var(--bg-secondary)] relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04] pointer-events-none" />

        {/* Global Network Map Section */}
        <section className="py-32 px-6 relative z-10">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4 ${isBusiness ? 'bg-blue-600/10 border border-blue-700/25 text-blue-700 dark:text-blue-400' : 'bg-sky-500/10 border border-sky-500/25 text-sky-600 dark:text-sky-400'}`}>
                <Globe2 className="w-3 h-3" /> {t('globalNetwork.badge')}
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6">{t('globalNetwork.title')}</h2>
              <p className="text-[var(--text-secondary)] max-w-2xl mx-auto text-lg">
                {t('globalNetwork.description')}
              </p>
            </div>

            <div className="glass-panel rounded-2xl p-8 border border-[var(--border-color)] shadow-[var(--shadow-lg)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {regions.map((region) => (
                  <div key={region.name} className="text-center p-4 rounded-xl bg-[var(--bg-card-alpha)] border border-[var(--border-color-subtle)] hover:border-[var(--border-color)] transition-colors">
                    <div className="text-emerald-500 dark:text-emerald-400 text-sm font-medium mb-1">{region.status}</div>
                    <div className="text-[var(--text-primary)] font-semibold">{region.name}</div>
                    <div className="text-[var(--text-muted)] text-sm mt-1">{region.locations}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section className="py-20 relative z-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="lg:col-span-2 glass-panel rounded-2xl p-8 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 transition-all group shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-[var(--accent-primary)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('features.lightningFast.title')}</h3>
                <p className="text-[var(--text-secondary)]">{t('features.lightningFast.description')}</p>
              </div>

              {/* Feature 2 */}
              <div className="glass-panel rounded-2xl p-8 border border-[var(--border-color)] hover:border-purple-500/30 transition-all group shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('features.secureByDefault.title')}</h3>
                <p className="text-[var(--text-secondary)]">{t('features.secureByDefault.description')}</p>
              </div>

              {/* Feature 3 */}
              <div className="glass-panel rounded-2xl p-8 border border-[var(--border-color)] hover:border-emerald-500/30 transition-all group shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Activity className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('features.realtimeAnalytics.title')}</h3>
                <p className="text-[var(--text-secondary)]">{t('features.realtimeAnalytics.description')}</p>
              </div>

              {/* Feature 4 */}
              <div className="lg:col-span-2 glass-panel rounded-2xl p-8 border border-[var(--border-color)] hover:border-blue-500/30 transition-all group shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">{t('features.aiGateway.title')}</h3>
                <p className="text-[var(--text-secondary)]">{t('features.aiGateway.description')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Experience / Code Section */}
        <section className="py-24 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Code Editor Tabs */}
              <div className="order-2 lg:order-1 relative group">
                  <div className={`absolute inset-0 bg-gradient-to-r blur-3xl rounded-full opacity-60 group-hover:opacity-85 transition-opacity ${isBusiness ? 'from-blue-700/14 to-slate-500/20' : 'from-sky-500/16 to-indigo-500/14'}`} />

                <div className="glass-panel rounded-xl relative border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden shadow-[var(--shadow-xl)]">
                  {/* Tabs */}
                  <div className="flex border-b border-[var(--border-color-subtle)] bg-[var(--code-bg)]">
                    {(Object.keys(CODE_SNIPPETS) as Array<keyof typeof CODE_SNIPPETS>).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveCodeTab(tab)}
                        className={`
                          px-6 py-3 text-xs font-medium font-mono border-r border-[var(--border-color-subtle)] transition-all
                          ${activeCodeTab === tab
                            ? 'text-[var(--text-primary)] bg-[var(--bg-primary)] border-t-2 border-t-[var(--accent-primary)]'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] border-t-2 border-t-transparent'}
                        `}
                      >
                        {CODE_SNIPPETS[tab].file}
                      </button>
                    ))}
                  </div>

                  {/* Code Content */}
                  <div className="p-6 overflow-x-auto">
                    <pre className="font-mono text-sm leading-relaxed text-[var(--text-secondary)]">
                      <code>{CODE_SNIPPETS[activeCodeTab].code}</code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="order-1 lg:order-2 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium border border-purple-500/20">
                  <Code2 className="w-3 h-3" /> {t('developerExperience.badge')}
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] tracking-tight">
                  {t('developerExperience.title.part1')} <br />
                  <span className="text-[var(--text-secondary)]">{t('developerExperience.title.part2')}</span>
                </h2>
                <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                  {t('developerExperience.description')}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 transition-colors shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]">
                    <Server className="w-6 h-6 text-[var(--accent-primary)] mb-2" />
                    <h4 className="text-[var(--text-primary)] font-bold mb-1">{t('developerExperience.serverless.title')}</h4>
                    <p className="text-xs text-[var(--text-secondary)]">{t('developerExperience.serverless.description')}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-purple-500/30 transition-colors shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]">
                    <Cpu className="w-6 h-6 text-purple-400 mb-2" />
                    <h4 className="text-[var(--text-primary)] font-bold mb-1">{t('developerExperience.edgeCompute.title')}</h4>
                    <p className="text-xs text-[var(--text-secondary)]">{t('developerExperience.edgeCompute.description')}</p>
                  </div>
                </div>

                <ul className="space-y-3 text-[var(--text-secondary)] pt-2">
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-sm">{t('developerExperience.checklist.gitPush')}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-sm">{t('developerExperience.checklist.cicd')}</span></li>
                  <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-sm">{t('developerExperience.checklist.logs')}</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative z-10">
          <div className={`max-w-5xl mx-auto p-12 lg:p-16 rounded-[2rem] text-center relative overflow-hidden border border-[var(--border-color)] shadow-[var(--shadow-xl)] group ${isBusiness ? 'bg-[linear-gradient(140deg,rgba(255,255,255,0.94)_0%,rgba(241,245,252,0.9)_100%)]' : 'bg-[linear-gradient(140deg,rgba(255,255,255,0.9)_0%,rgba(237,244,253,0.84)_100%)]'}`}>
            <div className={`absolute inset-0 bg-gradient-to-b via-transparent to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-85 ${isBusiness ? 'from-blue-600/6' : 'from-sky-500/8'}`} />
            <div className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-[80px] ${isBusiness ? 'bg-blue-700/16' : 'bg-sky-500/20'}`} />
            <div className={`absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-[80px] ${isBusiness ? 'bg-slate-500/18' : 'bg-indigo-500/20'}`} />

            <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10 text-[var(--text-primary)] tracking-tight">{t('cta.title')}</h2>
            <p className="text-[var(--text-secondary)] mb-10 max-w-xl mx-auto relative z-10 text-lg">
              {t('cta.description')}
              {t('cta.credits', { amount: 100 })}
            </p>
            <div className="relative z-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link to={isAuthenticated ? '/app/dashboard' : '/register'}>
                <Button
                  variant="primary"
                  glow
                  className="h-14 px-10 text-lg font-bold shadow-lg transform transition-transform hover:-translate-y-1"
                >
                  {t('cta.primary')} <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Button
                variant="secondary"
                className="h-14 px-10 text-lg hover:bg-[var(--accent-soft)]"
              >
                {t('cta.secondary')}
              </Button>
            </div>
            <p className="mt-6 text-sm text-[var(--text-muted)]">{t('cta.disclaimer')}</p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color-subtle)] bg-[var(--bg-secondary)] py-16 px-6 relative z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-4">{t('footer.product.title')}</h4>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.product.edgeFunctions')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.product.edgeConfig')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.product.aiGateway')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.product.cli')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-4">{t('footer.resources.title')}</h4>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.resources.documentation')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.resources.guides')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.resources.helpCenter')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.resources.apiReference')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-4">{t('footer.company.title')}</h4>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.company.about')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.company.blog')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.company.careers')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.company.contact')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[var(--text-primary)] font-bold mb-4">{t('footer.legal.title')}</h4>
            <ul className="space-y-2 text-sm text-[var(--text-muted)]">
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.legal.privacy')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.legal.terms')}</a></li>
              <li><a href="#" className="hover:text-[var(--accent-primary)] transition-colors">{t('footer.legal.cookies')}</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-t border-[var(--border-color-subtle)] pt-8">
          <div className="text-[var(--text-muted)] text-sm">
            {t('footer.copyright', { year: 2024 })}
          </div>
          <div className="flex gap-6">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-primary)] transition-colors cursor-pointer border border-[var(--border-color-subtle)]">
              <Globe className="w-4 h-4" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
