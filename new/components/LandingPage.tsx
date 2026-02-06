import React, { useState } from 'react';
import { Terminal } from './Terminal';
import { BentoGrid } from './BentoGrid';
import { NetworkMap } from './NetworkMap';
import { Button } from './Button';
import { AppView } from '../types';
import { ChevronRight, ArrowRight, Zap, Globe, Cpu, ShieldCheck, Activity, Box, CheckCircle2, Code2, Server, Globe2, FileCode } from 'lucide-react';

interface LandingPageProps {
  setView: (view: AppView) => void;
  isAuthenticated?: boolean;
}

const STATS = [
   { label: 'Global Latency', value: '<30ms', icon: Zap, color: 'text-yellow-400' },
   { label: 'Uptime SLA', value: '99.99%', icon: ShieldCheck, color: 'text-emerald-400' },
   { label: 'Edge Regions', value: '150+', icon: Globe, color: 'text-blue-400' },
   { label: 'Daily Requests', value: '2B+', icon: Activity, color: 'text-purple-400' },
];

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
     lang: 'typescript',
     code: `import { geolocation } from '@nexus/edge';

export default async function handler(req: Request) {
  const { city, country } = geolocation(req);
  
  // Logic runs closer to the user
  return new Response(JSON.stringify({
    message: \`Hello from \${city}, \${country}!\`,
    timestamp: Date.now()
  }), {
    headers: { 'content-type': 'application/json' }
  });
}`
  },
  middleware: {
     file: 'middleware.ts',
     lang: 'typescript',
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
     lang: 'typescript',
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

export const LandingPage: React.FC<LandingPageProps> = ({ setView, isAuthenticated = false }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'edge' | 'middleware' | 'ai'>('edge');

  const handleStart = () => {
    if (isAuthenticated) {
       setView(AppView.DASHBOARD);
    } else {
       setView(AppView.REGISTER);
    }
  };

  const highlightCode = (code: string) => {
    return code
      .replace(/import|export|default|async|function|return|const|let|var|if/g, '<span class="text-purple-400 font-bold">$&</span>')
      .replace(/from/g, '<span class="text-purple-400 font-bold">$&</span>')
      .replace(/'[^']*'/g, '<span class="text-green-400">$&</span>')
      .replace(/`[^`]*`/g, '<span class="text-yellow-300">$&</span>')
      .replace(/\/\/.*/g, '<span class="text-gray-500 italic">$&</span>')
      .replace(/Response|Request|JSON|Date/g, '<span class="text-yellow-400">$&</span>')
      .replace(/new|await/g, '<span class="text-cyan-400 font-medium">$&</span>');
  };

  return (
    <div className="bg-nexus-bg min-h-screen text-white pt-16 font-sans overflow-x-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-20 lg:pt-32 lg:pb-32 px-6 overflow-visible">
        {/* Advanced Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen" />
        <div className="absolute top-[20%] right-[10%] w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse-slow mix-blend-screen" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04] pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
          
          {/* Left Content */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-cyan-400 mb-2 animate-fade-in backdrop-blur-md hover:bg-white/10 transition-colors cursor-default shadow-[0_0_20px_rgba(0,0,0,0.2)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Nexus V2.0 is now live
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white drop-shadow-lg">
              The <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 animate-shimmer bg-[length:200%_auto]">Infrastructure</span> <br />
              for the Future.
            </h1>
            
            <p className="text-xl text-gray-400 max-w-lg mx-auto lg:mx-0 leading-relaxed font-light">
              Deploy serverless functions, manage edge databases, and orchestrate AI pipelines. 
              <span className="text-gray-200 font-medium"> All with zero config.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4">
              <Button 
                variant="primary" 
                glow 
                className="w-full sm:w-auto h-14 text-base px-8 font-bold tracking-wide shadow-xl"
                onClick={handleStart}
              >
                Start Deploying <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button variant="secondary" className="w-full sm:w-auto h-14 text-base px-8 font-medium">
                Read Documentation
              </Button>
            </div>

            <div className="pt-10 border-t border-white/5 mt-8">
               <p className="text-sm text-gray-500 mb-6 uppercase tracking-wider font-semibold">Trusted by engineering teams at</p>
               <div className="flex flex-wrap justify-center lg:justify-start gap-8 lg:gap-12 grayscale hover:grayscale-0 transition-all duration-700">
                  {LOGOS.map((logo, idx) => (
                     <div key={idx} className="w-24 text-white">{logo}</div>
                  ))}
               </div>
            </div>
          </div>

          {/* Right Content - 3D Terminal Effect */}
          <div className="relative animate-float delay-100 hidden lg:block perspective-[2000px] z-20">
             <div className="absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl blur-2xl opacity-20 animate-pulse" />
             <div className="absolute -bottom-5 -left-5 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20" />
             
             <div className="transform rotate-y-[-5deg] rotate-x-[5deg] transition-transform duration-500 hover:rotate-0 drop-shadow-2xl">
                <Terminal />
             </div>
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <div className="border-y border-white/5 bg-[#0A0A0C]/50 backdrop-blur-sm relative z-20">
         <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
               {STATS.map((stat, idx) => (
                  <div key={idx} className="flex flex-col items-center lg:items-start text-center lg:text-left gap-2 group cursor-default">
                     <div className={`p-3 rounded-xl bg-white/5 border border-white/5 group-hover:border-white/20 transition-colors mb-2 ${stat.color} shadow-lg`}>
                        <stat.icon className="w-6 h-6" />
                     </div>
                     <div className="text-3xl font-bold text-white tracking-tight">{stat.value}</div>
                     <div className="text-sm text-gray-500 uppercase tracking-wider font-medium">{stat.label}</div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-[#050507] relative">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />
        
        {/* Global Network Map Section */}
        <section className="py-32 px-6 relative z-10">
           <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                 <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400 mb-4">
                    <Globe2 className="w-3 h-3" /> Global Infrastructure
                 </div>
                 <h2 className="text-3xl md:text-5xl font-bold mb-6">Deploy globally, instantly.</h2>
                 <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                    Your code runs within milliseconds of your users. Our intelligent edge network automatically routes traffic to the nearest healthy node.
                 </p>
              </div>
              
              <div className="max-w-5xl mx-auto">
                 <NetworkMap />
              </div>
           </div>
        </section>
        
        {/* Bento Grid Features */}
        <section className="py-20 relative z-10">
          <BentoGrid />
        </section>

        {/* Developer Experience / Code Section */}
        <section className="py-24 relative overflow-hidden">
           <div className="max-w-7xl mx-auto px-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                 
                 {/* Code Editor Tabs */}
                 <div className="order-2 lg:order-1 relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-3xl rounded-full opacity-50 group-hover:opacity-75 transition-opacity" />
                    
                    <div className="glass-panel rounded-xl relative border border-white/10 bg-[#0A0A0C] overflow-hidden shadow-2xl">
                       {/* Tabs */}
                       <div className="flex border-b border-white/5 bg-[#0f1012]">
                          {(Object.keys(CODE_SNIPPETS) as Array<keyof typeof CODE_SNIPPETS>).map((tab) => (
                             <button 
                                key={tab}
                                onClick={() => setActiveCodeTab(tab)}
                                className={`
                                   px-6 py-3 text-xs font-medium font-mono border-r border-white/5 transition-all
                                   ${activeCodeTab === tab 
                                      ? 'text-white bg-[#0A0A0C] border-t-2 border-t-nexus-primary' 
                                      : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-t-2 border-t-transparent'}
                                `}
                             >
                                {CODE_SNIPPETS[tab].file}
                             </button>
                          ))}
                       </div>
                       
                       {/* Code Content */}
                       <div className="p-6 overflow-x-auto">
                          <pre className="font-mono text-sm leading-relaxed text-gray-300">
                             <code dangerouslySetInnerHTML={{ __html: highlightCode(CODE_SNIPPETS[activeCodeTab].code) }} />
                          </pre>
                       </div>
                    </div>
                 </div>

                 {/* Text Content */}
                 <div className="order-1 lg:order-2 space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-medium border border-purple-500/20">
                       <Code2 className="w-3 h-3" /> Developer Experience
                    </div>
                    <h2 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">
                       Just write code. <br />
                       <span className="text-gray-500">We handle the rest.</span>
                    </h2>
                    <p className="text-gray-400 text-lg leading-relaxed">
                       Forget about Kubernetes, Dockerfiles, or load balancers. 
                       Just write a function and we deploy it to 150+ edge locations instantly.
                       Focus on your logic, not the infrastructure.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                       <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-nexus-primary/30 transition-colors">
                          <Server className="w-6 h-6 text-nexus-primary mb-2" />
                          <h4 className="text-white font-bold mb-1">Serverless</h4>
                          <p className="text-xs text-gray-400">Zero management, auto-scaling.</p>
                       </div>
                       <div className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-nexus-secondary/30 transition-colors">
                          <Cpu className="w-6 h-6 text-nexus-secondary mb-2" />
                          <h4 className="text-white font-bold mb-1">Edge Compute</h4>
                          <p className="text-xs text-gray-400">V8 Isolate runtime, <10ms startup.</p>
                       </div>
                    </div>

                    <ul className="space-y-3 text-gray-300 pt-2">
                       <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-sm">Instant git-push deployments</span></li>
                       <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-sm">Built-in CI/CD pipelines</span></li>
                       <li className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> <span className="text-sm">Real-time logs & analytics</span></li>
                    </ul>
                 </div>
              </div>
           </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 relative z-10">
          <div className="max-w-5xl mx-auto glass-panel p-12 lg:p-16 rounded-[2rem] text-center relative overflow-hidden border border-nexus-primary/30 shadow-[0_0_50px_rgba(0,240,255,0.1)] group">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-transparent pointer-events-none transition-opacity duration-500 group-hover:opacity-75" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px]" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
            
            <h2 className="text-4xl md:text-5xl font-bold mb-6 relative z-10 text-white tracking-tight">Ready to ship your next big thing?</h2>
            <p className="text-gray-400 mb-10 max-w-xl mx-auto relative z-10 text-lg">
              Join 100,000+ developers building the future on Nexus. 
              Get <span className="text-white font-semibold">$100 in free credits</span> when you sign up today.
            </p>
            <div className="relative z-10 flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                variant="primary" 
                glow 
                className="h-14 px-10 text-lg font-bold shadow-lg transform transition-transform hover:-translate-y-1"
                onClick={handleStart}
              >
                Get Started for Free <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="secondary" 
                className="h-14 px-10 text-lg hover:bg-white/10"
              >
                Contact Sales
              </Button>
            </div>
            <p className="mt-6 text-sm text-gray-500">No credit card required for free tier.</p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#050507] py-16 px-6 relative z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
           <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Edge Functions</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Edge Config</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">AI Gateway</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">CLI</a></li>
              </ul>
           </div>
           <div>
              <h4 className="text-white font-bold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Documentation</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Guides</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Help Center</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">API Reference</a></li>
              </ul>
           </div>
           <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">About</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Blog</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Careers</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Contact</a></li>
              </ul>
           </div>
           <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Privacy Policy</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Terms of Service</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors">Cookie Policy</a></li>
              </ul>
           </div>
        </div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/5 pt-8">
          <div className="text-gray-600 text-sm">
            © 2024 Nexus Cloud Inc. All rights reserved.
          </div>
          <div className="flex gap-6">
             <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer border border-white/5">
                <Globe className="w-4 h-4" />
             </div>
             {/* Add more social icons here if needed */}
          </div>
        </div>
      </footer>
    </div>
  );
};