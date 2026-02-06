import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { 
  Key, Copy, Check, Activity, Settings, 
  Plus, Terminal, Zap, Menu, X, 
  ChevronRight, Shield, Cpu,
  CreditCard, FileText, Bell, HelpCircle, Search, Filter, Wallet,
  LayoutGrid, BarChart3, Database, TrendingUp, TrendingDown, Lock, History, RotateCcw,
  Download, Users, Building, AlertTriangle, User, ExternalLink, LogOut, MoreVertical,
  Wifi, RefreshCw, BookOpen, PlayCircle, Clock, GraduationCap, Star, ArrowRight, ArrowLeft, CheckCircle2, Lock as LockIcon, Play
} from 'lucide-react';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { ChartData, ApiKey, ActivityLog, Invoice, TeamMember, Tutorial, Lesson, UserSession } from '../types';
import { generateCodeSnippet } from '../services/geminiService';

// --- MOCK DATA ---

const MOCK_USAGE_DATA: ChartData[] = [
  { time: 'Mon', requests: 4000, latency: 240, p95: 380, p99: 800 },
  { time: 'Tue', requests: 3000, latency: 139, p95: 220, p99: 750 },
  { time: 'Wed', requests: 9000, latency: 280, p95: 450, p99: 1400 },
  { time: 'Thu', requests: 5780, latency: 290, p95: 470, p99: 1550 },
  { time: 'Fri', requests: 5890, latency: 280, p95: 460, p99: 1300 },
  { time: 'Sat', requests: 4390, latency: 250, p95: 400, p99: 1100 },
  { time: 'Sun', requests: 4490, latency: 260, p95: 410, p99: 1050 },
];

const MOCK_HOURLY_LATENCY: ChartData[] = [
  { time: '00:00', requests: 0, latency: 350, p95: 500, p99: 800 },
  { time: '04:00', requests: 0, latency: 320, p95: 480, p99: 750 },
  { time: '08:00', requests: 0, latency: 450, p95: 700, p99: 1200 },
  { time: '12:00', requests: 0, latency: 600, p95: 900, p99: 1500 },
  { time: '16:00', requests: 0, latency: 550, p95: 850, p99: 1300 },
  { time: '20:00', requests: 0, latency: 400, p95: 650, p99: 1000 },
  { time: '23:59', requests: 0, latency: 380, p95: 550, p99: 850 },
];

const MOCK_KEYS: ApiKey[] = [
  { id: '1', name: 'Production - Main App', prefix: 'nx_live_', lastUsed: 'Just now', created: 'Oct 24, 2023', status: 'active', usage: 15400, limit: 100000 },
  { id: '2', name: 'Staging - AI Agent', prefix: 'nx_test_', lastUsed: '1 day ago', created: 'Nov 01, 2023', status: 'active', usage: 2100, limit: 50000 },
  { id: '3', name: 'Legacy Key v1', prefix: 'nx_live_', lastUsed: '-', created: 'Jan 10, 2023', status: 'revoked', usage: 0, limit: 0 },
  { id: '4', name: 'Test Runner CI', prefix: 'nx_test_', lastUsed: '12 hours ago', created: 'Dec 05, 2023', status: 'expiring', usage: 890, limit: 1000 },
];

const MOCK_LOGS: ActivityLog[] = [
  { id: '1', timestamp: '14:42:05', requestId: 'req_8f92ma01', model: 'gpt-4-turbo', status: 200, latency: '420ms', cost: '$0.032' },
  { id: '2', timestamp: '14:42:02', requestId: 'req_8f92ma02', model: 'claude-3-opus', status: 200, latency: '1.2s', cost: '$0.060' },
  { id: '3', timestamp: '14:41:55', requestId: 'req_8f92ma03', model: 'gpt-3.5-turbo', status: 429, latency: '120ms', cost: '$0.000' },
  { id: '4', timestamp: '14:41:48', requestId: 'req_8f92ma04', model: 'mistral-large', status: 200, latency: '310ms', cost: '$0.012' },
  { id: '5', timestamp: '14:41:30', requestId: 'req_8f92ma05', model: 'gpt-4-vision', status: 500, latency: '5002ms', cost: '$0.000' },
  { id: '6', timestamp: '14:40:12', requestId: 'req_8f92ma06', model: 'gpt-4-turbo', status: 200, latency: '380ms', cost: '$0.021' },
  { id: '7', timestamp: '14:40:05', requestId: 'req_8f92ma07', model: 'gemini-pro', status: 200, latency: '240ms', cost: '$0.008' },
];

const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-2023-001', date: 'Oct 01, 2023', amount: '$380.20', status: 'Paid' },
  { id: 'INV-2023-002', date: 'Sep 01, 2023', amount: '$412.50', status: 'Paid' },
  { id: 'INV-2023-003', date: 'Aug 01, 2023', amount: '$290.00', status: 'Paid' },
];

const MOCK_TEAM: TeamMember[] = [
  { id: '1', name: 'Alex Morgan', email: 'alex@nexusai.com', role: 'Owner', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
  { id: '2', name: 'Sarah Chen', email: 'sarah@nexusai.com', role: 'Admin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah' },
  { id: '3', name: 'Mike Ross', email: 'mike@nexusai.com', role: 'Developer', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike' },
];

const MOCK_LESSONS: Lesson[] = [
  { id: 'l1', title: 'Introduction to Edge Computing', duration: '2:30', isCompleted: true, isLocked: false },
  { id: 'l2', title: 'Installing the Nexus CLI', duration: '5:15', isCompleted: true, isLocked: false },
  { id: 'l3', title: 'Creating your first function', duration: '10:45', isCompleted: false, isLocked: false },
  { id: 'l4', title: 'Understanding Regions', duration: '8:20', isCompleted: false, isLocked: true },
  { id: 'l5', title: 'Deploying to Production', duration: '12:00', isCompleted: false, isLocked: true },
  { id: 'l6', title: 'Monitoring & Logs', duration: '6:45', isCompleted: false, isLocked: true },
];

const MOCK_TUTORIALS: Tutorial[] = [
  { 
    id: '1', 
    title: 'Deploying your first Edge Function', 
    description: 'Learn how to deploy a globally distributed serverless function in under 3 minutes using the CLI.', 
    duration: '45 min', 
    difficulty: 'Beginner', 
    category: 'Edge',
    progress: 35,
    imageGradient: 'from-cyan-500/20 to-blue-500/20',
    lessons: MOCK_LESSONS
  },
  { 
    id: '2', 
    title: 'Orchestrating LLMs with Nexus Pipelines', 
    description: 'Build a multi-model AI chain that processes text and generates images automatically.', 
    duration: '1h 15min', 
    difficulty: 'Intermediate', 
    category: 'AI',
    progress: 0,
    imageGradient: 'from-purple-500/20 to-pink-500/20',
    lessons: MOCK_LESSONS
  },
  { 
    id: '3', 
    title: 'Real-time Data Streaming with WebSockets', 
    description: 'Implement a scalable WebSocket server for live chat applications.', 
    duration: '2h 30min', 
    difficulty: 'Advanced', 
    category: 'DevOps',
    imageGradient: 'from-yellow-500/20 to-orange-500/20',
    lessons: MOCK_LESSONS
  },
  { 
    id: '4', 
    title: 'Securing your API Gateway', 
    description: 'Best practices for rate limiting, IP allowlisting, and JWT verification.', 
    duration: '50 min', 
    difficulty: 'Intermediate', 
    category: 'Security',
    imageGradient: 'from-emerald-500/20 to-teal-500/20',
    lessons: MOCK_LESSONS
  },
  { 
    id: '5', 
    title: 'Custom Domain Configuration', 
    description: 'Map your custom domain to Nexus deployments with SSL termination.', 
    duration: '20 min', 
    difficulty: 'Beginner', 
    category: 'DevOps',
    imageGradient: 'from-blue-500/20 to-indigo-500/20',
    lessons: MOCK_LESSONS
  },
   { 
    id: '6', 
    title: 'Multi-region Database Replication', 
    description: 'Set up active-active database replication for low-latency global access.', 
    duration: '3h 10min', 
    difficulty: 'Advanced', 
    category: 'Edge',
    imageGradient: 'from-red-500/20 to-orange-500/20',
    lessons: MOCK_LESSONS
  },
];


const COLORS = {
  primary: '#00F0FF',
  secondary: '#7000FF',
  accent: '#FF0055',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  slate: '#64748B'
};

const ERROR_DISTRIBUTION = [
  { name: '200 OK', value: 99.8, color: '#10B981' }, // Emerald
  { name: '4xx User', value: 0.15, color: '#F59E0B' }, // Amber
  { name: '5xx Server', value: 0.05, color: '#EF4444' }, // Red
];

interface DashboardProps {
  user: UserSession;
}

// --- COMPONENTS ---

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsTab, setSettingsTab] = useState('general');
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Playground state
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('// AI generated code will appear here...');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    // Simulate initial data load
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    const code = await generateCodeSnippet(prompt);
    setGeneratedCode(code);
    setIsGenerating(false);
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setSelectedTutorial(null); // Reset detail view when changing tabs
        setIsMobileNavOpen(false);
      }}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
        ${activeTab === id 
          ? 'bg-nexus-card border border-nexus-border text-white shadow-[0_0_15px_rgba(0,0,0,0.5)]' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'}
      `}
      title={isSidebarCollapsed ? label : undefined}
    >
      {activeTab === id && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-nexus-primary rounded-r-full shadow-[0_0_10px_#00F0FF]" />
      )}
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-nexus-primary' : 'group-hover:text-gray-200'}`} />
      {!isSidebarCollapsed && <span>{label}</span>}
    </button>
  );

  // --- RENDER FUNCTIONS ---

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
       {/* Use Analytics component for the overview in this design */}
       {renderAnalytics()}
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6 animate-fade-in">
      {/* Top Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Token Usage */}
        <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-white font-semibold">Token Usage Volume</h3>
              <p className="text-xs text-gray-400">Tokens processed per model provider</p>
            </div>
            <select className="bg-nexus-bg border border-nexus-border text-gray-300 text-xs rounded-md px-2 py-1 outline-none focus:border-nexus-primary">
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_USAGE_DATA}>
                <defs>
                  <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.secondary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.secondary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" vertical={false} />
                <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0C', border: '1px solid #2A2A30', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="requests" stackId="1" stroke={COLORS.primary} fill="url(#colorRequests)" />
                <Area type="monotone" dataKey="latency" stackId="1" stroke={COLORS.secondary} fill="url(#colorLatency)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
             <div className="flex items-center gap-2 text-xs text-gray-400">
               <div className="w-2 h-2 rounded-full bg-purple-500" /> Claude 3
             </div>
             <div className="flex items-center gap-2 text-xs text-gray-400">
               <div className="w-2 h-2 rounded-full bg-cyan-400" /> GPT-4
             </div>
             <div className="flex items-center gap-2 text-xs text-gray-400">
               <div className="w-2 h-2 rounded-full bg-teal-400" /> Mistral
             </div>
          </div>
        </div>

        {/* Latency */}
        <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
           <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-white font-semibold">System Latency</h3>
              <p className="text-xs text-gray-400">Response time percentiles (ms)</p>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> P99</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> P95</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> P50</span>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MOCK_HOURLY_LATENCY}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" vertical={false} />
                <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0C', border: '1px solid #2A2A30', borderRadius: '8px', color: '#fff' }}
                />
                <Line type="monotone" dataKey="p99" stroke="#EF4444" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="p95" stroke="#F59E0B" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="latency" stroke="#10B981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Models */}
        <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card flex flex-col">
           <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">Top Models by Cost</h3>
           <div className="space-y-6 flex-1">
              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded flex items-center justify-center bg-blue-500/20 text-blue-400 text-[10px] font-bold">O</div>
                       <span className="text-white">GPT-4 Turbo</span>
                    </div>
                    <span className="text-white font-mono">$1,204.50</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[75%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded flex items-center justify-center bg-purple-500/20 text-purple-400 text-[10px] font-bold">A</div>
                       <span className="text-white">Claude 3 Opus</span>
                    </div>
                    <span className="text-white font-mono">$840.20</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-[50%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded flex items-center justify-center bg-teal-500/20 text-teal-400 text-[10px] font-bold">M</div>
                       <span className="text-white">Mistral Large</span>
                    </div>
                    <span className="text-white font-mono">$210.00</span>
                 </div>
                 <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-400 w-[15%] rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)]"></div>
                 </div>
              </div>
           </div>
        </div>

        {/* Error Distribution */}
        <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card flex flex-col">
           <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">Error Distribution</h3>
           <div className="flex-1 flex flex-col items-center justify-center relative">
              <ResponsiveContainer width="100%" height={180}>
                 <PieChart>
                    <Pie
                       data={ERROR_DISTRIBUTION}
                       innerRadius={60}
                       outerRadius={80}
                       paddingAngle={5}
                       dataKey="value"
                    >
                       {ERROR_DISTRIBUTION.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                       ))}
                    </Pie>
                 </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-3xl font-bold text-white">99.8%</span>
                 <span className="text-xs text-nexus-success">Success Rate</span>
              </div>
           </div>
           <div className="flex justify-center gap-4 text-xs text-gray-400 mt-2">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 200 OK</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> 4xx User</div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 5xx Server</div>
           </div>
        </div>

        {/* Cache Hit Ratio */}
        <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card flex flex-col justify-between">
           <div>
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">Cache Hit Ratio</h3>
              <div className="flex items-baseline gap-2">
                 <span className="text-5xl font-bold text-white">24.5%</span>
                 <span className="text-nexus-success text-sm flex items-center">
                    <TrendingUp className="w-3 h-3 mr-1" /> 2.1%
                 </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">requests served from edge cache</p>
           </div>
           <div className="space-y-4 text-sm">
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                 <span className="text-gray-400">Bandwidth Saved</span>
                 <span className="text-white font-mono">450 GB</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                 <span className="text-gray-400">Latency Reduced</span>
                 <span className="text-nexus-success font-mono">-120ms avg</span>
              </div>
              <div className="flex justify-between items-center border-t border-white/5 pt-4">
                 <span className="text-gray-400">Cost Savings</span>
                 <span className="text-nexus-success font-mono">$340.00</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderKeys = () => (
    <div className="space-y-6 animate-fade-in">
       {/* Metrics Cards */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-nexus-border bg-nexus-card relative overflow-hidden group">
             <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-gray-400 font-medium">Active Keys</div>
                <Key className="w-5 h-5 text-nexus-primary opacity-50 group-hover:opacity-100 transition-opacity" />
             </div>
             <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-white">12</span>
                <span className="text-nexus-success text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center border border-emerald-500/20">
                   <TrendingUp className="w-3 h-3 mr-0.5" /> +2
                </span>
             </div>
             <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-nexus-primary w-[40%] rounded-full shadow-[0_0_10px_rgba(0,240,255,0.5)]" />
             </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-nexus-border bg-nexus-card relative overflow-hidden group">
             <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-gray-400 font-medium">Total Requests (24h)</div>
                <Database className="w-5 h-5 text-nexus-secondary opacity-50 group-hover:opacity-100 transition-opacity" />
             </div>
             <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-white">1.4M</span>
                <span className="text-nexus-success text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center border border-emerald-500/20">
                   <TrendingUp className="w-3 h-3 mr-0.5" /> +15%
                </span>
             </div>
             <div className="flex gap-0.5 items-end h-1 w-full opacity-50">
               {[40, 60, 45, 70, 50, 80].map((h, i) => (
                 <div key={i} className="flex-1 bg-nexus-secondary rounded-t-sm" style={{ height: `${h}%` }}></div>
               ))}
             </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-nexus-border bg-nexus-card relative overflow-hidden group">
             <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-gray-400 font-medium">Avg Error Rate</div>
                <AlertTriangle className="w-5 h-5 text-orange-500 opacity-50 group-hover:opacity-100 transition-opacity" />
             </div>
             <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-white">0.02%</span>
                <span className="text-nexus-success text-xs bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center border border-emerald-500/20">
                   <TrendingDown className="w-3 h-3 mr-0.5" /> -0.01%
                </span>
             </div>
             <p className="text-xs text-gray-500">Within healthy range (&lt; 0.1%)</p>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-nexus-border bg-nexus-card relative overflow-hidden group">
             <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-gray-400 font-medium">Est. Cost (MTD)</div>
                <Wallet className="w-5 h-5 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />
             </div>
             <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-white">$420.50</span>
             </div>
             <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
             </div>
          </div>
       </div>

       {/* Filter Bar */}
       <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
             <button className="h-8 px-3 rounded bg-blue-600 text-white text-xs font-medium flex items-center gap-2 border border-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]">
                All Keys <span className="bg-black/20 px-1.5 py-0.5 rounded text-[10px]">16</span>
             </button>
             <button className="h-8 px-3 rounded bg-transparent text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors">Active</button>
             <button className="h-8 px-3 rounded bg-transparent text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors">Revoked</button>
             <button className="h-8 px-3 rounded bg-transparent text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium flex items-center gap-2 transition-colors">
                Expiring Soon <span className="bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded text-[10px]">1</span>
             </button>
          </div>
          <button className="h-8 px-3 rounded bg-nexus-card border border-nexus-border text-gray-300 text-xs font-medium flex items-center gap-2 hover:bg-white/5">
             <Filter className="w-3 h-3" /> Sort by Date
          </button>
       </div>

       {/* Keys Table */}
       <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
          <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-white/5 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="p-4 font-medium w-[20%]">Key Name</th>
                      <th className="p-4 font-medium w-[20%]">Token Prefix</th>
                      <th className="p-4 font-medium w-[12%]">Created</th>
                      <th className="p-4 font-medium w-[12%]">Last Used</th>
                      <th className="p-4 font-medium w-[20%]">Usage (30d)</th>
                      <th className="p-4 font-medium w-[8%]">Status</th>
                      <th className="p-4 font-medium text-right w-[8%]">Actions</th>
                   </tr>
                </thead>
                <tbody className="text-sm divide-y divide-white/5">
                   {MOCK_KEYS.map((key) => (
                      <tr key={key.id} className={`group hover:bg-white/5 transition-colors ${key.status === 'revoked' ? 'bg-red-500/5' : ''}`}>
                         <td className="p-4">
                            <div className="font-medium text-white">{key.name}</div>
                            <div className="text-xs text-gray-500">{key.id === '1' ? 'Full Access • No IP Restriction' : key.id === '2' ? 'Models: GPT-4, Claude-2' : key.id === '3' ? 'Revoked due to exposure' : 'IP Restricted: 192.168.1.0/24'}</div>
                         </td>
                         <td className="p-4">
                            <div className={`font-mono text-xs px-2 py-1 rounded w-fit border flex items-center gap-2 ${key.status === 'revoked' ? 'border-transparent text-gray-500' : 'bg-[#0A0A0C] border-nexus-border text-gray-300'}`}>
                               <span className={key.prefix.includes('live') ? 'text-nexus-primary' : 'text-nexus-secondary'}>{key.prefix}</span>...{key.id}f92
                               {key.status !== 'revoked' && <Copy className="w-3 h-3 cursor-pointer hover:text-white" />}
                            </div>
                         </td>
                         <td className="p-4 text-gray-400">{key.created}</td>
                         <td className="p-4 text-gray-300">
                            {key.lastUsed === 'Just now' ? (
                               <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Just now
                               </div>
                            ) : key.lastUsed}
                         </td>
                         <td className="p-4">
                           {key.limit > 0 ? (
                              <div className="space-y-1">
                                 <div className="flex justify-between text-xs text-gray-500">
                                    <span className="text-gray-300">{key.usage >= 1000 ? (key.usage/1000).toFixed(1) + 'k' : key.usage}</span>
                                    <span>Limit: {key.limit >= 1000 ? (key.limit/1000) + 'k' : key.limit}</span>
                                 </div>
                                 <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div 
                                       className={`h-full rounded-full ${key.usage/key.limit > 0.8 ? 'bg-orange-500' : 'bg-blue-500'}`} 
                                       style={{ width: `${(key.usage / key.limit) * 100}%` }}
                                    ></div>
                                 </div>
                              </div>
                           ) : (
                              <span className="text-xs text-gray-500">0 reqs</span>
                           )}
                         </td>
                         <td className="p-4">
                            <span className={`
                               inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
                               ${key.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                 key.status === 'revoked' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 
                                 'bg-orange-500/10 text-orange-400 border-orange-500/20'}
                            `}>
                               {key.status === 'active' ? 'Active' : key.status === 'revoked' ? 'Revoked' : 'Expiring'}
                            </span>
                         </td>
                         <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100">
                               {key.status === 'revoked' ? (
                                  <button className="p-1 hover:text-white"><History className="w-4 h-4" /></button>
                               ) : (
                                  <>
                                     <button className="p-1 hover:text-white"><Settings className="w-4 h-4" /></button>
                                     <button className="p-1 hover:text-red-400"><Lock className="w-4 h-4" /></button>
                                  </>
                               )}
                            </div>
                         </td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          <div className="p-4 border-t border-white/5 flex justify-between items-center text-xs text-gray-500">
             <div>Showing <span className="text-white">1-4</span> of 16 keys</div>
             <div className="flex gap-2">
                <button className="px-2 py-1 bg-white/5 rounded text-gray-400 hover:text-white hover:bg-white/10" disabled>Previous</button>
                <button className="px-2 py-1 bg-white/5 rounded text-gray-400 hover:text-white hover:bg-white/10">Next</button>
             </div>
          </div>
       </div>

       {/* Security Defaults & Alerts */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                   <Shield className="w-5 h-5" />
                </div>
                <div>
                   <h3 className="text-white font-medium">Security Policy Defaults</h3>
                   <p className="text-xs text-gray-400">These settings apply to all new keys unless overridden.</p>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <label className="text-xs text-gray-400 font-medium mb-2 block">Default Rate Limit</label>
                   <div className="flex">
                      <input type="number" defaultValue="1000" className="bg-[#0A0A0C] border border-r-0 border-nexus-border rounded-l-md px-3 py-2 text-sm text-white w-full outline-none focus:border-nexus-primary" />
                      <select className="bg-[#0A0A0C] border border-nexus-border rounded-r-md px-2 py-2 text-sm text-gray-400 outline-none focus:border-nexus-primary">
                         <option>Req / min</option>
                      </select>
                   </div>
                </div>
                <div>
                   <label className="text-xs text-gray-400 font-medium mb-2 block">Model Access Scope</label>
                   <div className="flex gap-3">
                      <label className="flex items-center gap-2 bg-[#0A0A0C] border border-nexus-border px-3 py-2 rounded-md cursor-pointer hover:border-gray-500 transition-colors">
                         <div className="w-4 h-4 rounded bg-nexus-primary flex items-center justify-center text-black text-[10px] font-bold"><Check className="w-3 h-3" /></div>
                         <span className="text-xs text-gray-300">GPT-4</span>
                      </label>
                      <label className="flex items-center gap-2 bg-[#0A0A0C] border border-nexus-border px-3 py-2 rounded-md cursor-pointer hover:border-gray-500 transition-colors">
                         <div className="w-4 h-4 rounded bg-nexus-primary flex items-center justify-center text-black text-[10px] font-bold"><Check className="w-3 h-3" /></div>
                         <span className="text-xs text-gray-300">Claude-2</span>
                      </label>
                      <label className="flex items-center gap-2 bg-[#0A0A0C] border border-nexus-border px-3 py-2 rounded-md cursor-pointer hover:border-gray-500 transition-colors">
                         <div className="w-4 h-4 rounded border border-gray-600"></div>
                         <span className="text-xs text-gray-300">DALL-E 3</span>
                      </label>
                   </div>
                </div>
             </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
             <div className="flex items-center gap-2 mb-6">
                <Shield className="w-4 h-4 text-orange-500" />
                <h3 className="text-white font-medium">Recent Security Alerts</h3>
             </div>
             <div className="space-y-4">
                <div className="flex gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                   <div>
                      <p className="text-sm text-gray-300 leading-tight">Rate limit exceeded on <span className="text-white font-mono bg-white/5 px-1 rounded text-xs">Test Runner CI</span></p>
                      <p className="text-xs text-gray-500 mt-1">2 mins ago • 192.168.0.1</p>
                   </div>
                </div>
                <div className="flex gap-3">
                   <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                   <div>
                      <p className="text-sm text-gray-300 leading-tight">New IP detected for <span className="text-white font-mono bg-white/5 px-1 rounded text-xs">Staging - AI Agent</span></p>
                      <p className="text-xs text-gray-500 mt-1">2 hours ago • Frankfurt, DE</p>
                   </div>
                </div>
                <button className="text-xs text-nexus-primary hover:underline mt-2">View All Logs</button>
             </div>
          </div>
       </div>
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
             <div className="flex justify-between items-start mb-6">
                <div>
                   <h3 className="text-white text-lg font-bold">Current Period Usage</h3>
                   <p className="text-sm text-gray-400">Billing period: Oct 1 - Oct 31</p>
                </div>
                {/* Visual bar chart icon */}
                <div className="flex items-end gap-1 h-8 opacity-40">
                   <div className="w-2 h-4 bg-gray-500 rounded-sm"></div>
                   <div className="w-2 h-6 bg-gray-500 rounded-sm"></div>
                   <div className="w-2 h-8 bg-gray-500 rounded-sm"></div>
                   <div className="w-2 h-5 bg-gray-500 rounded-sm"></div>
                </div>
             </div>
             <div className="mb-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white tracking-tight">$420.50</span>
                <span className="text-gray-500">/ $1,000.00 Limit</span>
             </div>
             <div className="w-full h-4 bg-[#0A0A0C] rounded-full overflow-hidden mb-8 border border-white/5">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 w-[42%] rounded-full shadow-[0_0_15px_rgba(37,99,235,0.4)] relative">
                   <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                </div>
             </div>
             <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0A0A0C] p-4 rounded-lg border border-white/5">
                   <div className="text-xs text-gray-500 mb-1">GPT-4</div>
                   <div className="text-white font-mono font-medium">$280.00</div>
                </div>
                <div className="bg-[#0A0A0C] p-4 rounded-lg border border-white/5">
                   <div className="text-xs text-gray-500 mb-1">Claude 3</div>
                   <div className="text-white font-mono font-medium">$110.25</div>
                </div>
                <div className="bg-[#0A0A0C] p-4 rounded-lg border border-white/5">
                   <div className="text-xs text-gray-500 mb-1">Others</div>
                   <div className="text-white font-mono font-medium">$30.25</div>
                </div>
             </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card flex flex-col justify-between">
             <div className="flex justify-between items-start mb-6">
                <h3 className="text-white font-medium">Payment Method</h3>
                <button className="text-xs text-nexus-primary hover:text-white transition-colors">Edit</button>
             </div>
             <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-5 rounded-xl border border-white/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Wifi className="w-12 h-12 text-white rotate-90" />
                </div>
                <div className="flex justify-between items-start mb-8 relative z-10">
                   <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
                      <div className="w-4 h-4 rounded-full border-2 border-white/50"></div>
                   </div>
                   <span className="text-white font-bold italic">VISA</span>
                </div>
                <div className="text-gray-400 text-xs mb-1 font-mono">CARD NUMBER</div>
                <div className="text-white font-mono text-lg tracking-widest mb-6">•••• •••• •••• 4242</div>
                <div className="flex justify-between">
                   <div>
                      <div className="text-gray-400 text-[10px] mb-0.5 font-mono">HOLDER</div>
                      <div className="text-white text-sm">Alex Morgan</div>
                   </div>
                   <div className="text-right">
                      <div className="text-gray-400 text-[10px] mb-0.5 font-mono">EXPIRES</div>
                      <div className="text-white text-sm">12/25</div>
                   </div>
                </div>
             </div>
             <div className="mt-6 space-y-2">
                <div className="flex justify-between text-xs">
                   <span className="text-gray-400">Next billing date</span>
                   <span className="text-white">Nov 1, 2023</span>
                </div>
                <div className="flex justify-between text-xs">
                   <span className="text-gray-400">Auto-recharge</span>
                   <span className="text-nexus-success">Enabled ($50)</span>
                </div>
             </div>
          </div>
       </div>

       <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
          <div className="p-4 border-b border-white/5 flex justify-between items-center">
             <h3 className="text-white font-medium">Invoice History</h3>
             <button className="text-xs text-gray-400 flex items-center gap-1 hover:text-white"><Download className="w-3 h-3" /> Download All</button>
          </div>
          <table className="w-full text-left text-sm">
             <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                   <th className="p-4 font-medium">Invoice ID</th>
                   <th className="p-4 font-medium">Date</th>
                   <th className="p-4 font-medium text-right">Amount</th>
                   <th className="p-4 font-medium text-center">Status</th>
                   <th className="p-4 font-medium text-right">Action</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {MOCK_INVOICES.map((inv) => (
                   <tr key={inv.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-mono">{inv.id}</td>
                      <td className="p-4 text-gray-400">{inv.date}</td>
                      <td className="p-4 text-white text-right font-mono">{inv.amount}</td>
                      <td className="p-4 text-center">
                         <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded text-xs font-medium">
                            {inv.status}
                         </span>
                      </td>
                      <td className="p-4 text-right">
                         <button className="text-nexus-primary hover:underline text-xs">PDF</button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderLogs = () => (
    <div className="space-y-4 animate-fade-in">
       {/* Filters */}
       <div className="flex gap-4 p-2 bg-[#0A0A0C] border border-nexus-border rounded-lg items-center">
          <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
             <input 
                type="text" 
                placeholder="Search by Request ID, Model, or User..." 
                className="w-full bg-transparent text-sm text-white pl-9 pr-4 py-1.5 outline-none placeholder:text-gray-600"
             />
          </div>
          <div className="w-px h-6 bg-white/10"></div>
          <select className="bg-transparent text-gray-300 text-sm outline-none cursor-pointer hover:text-white">
             <option>All Statuses</option>
          </select>
          <select className="bg-transparent text-gray-300 text-sm outline-none cursor-pointer hover:text-white">
             <option>All Models</option>
          </select>
          <select className="bg-transparent text-gray-300 text-sm outline-none cursor-pointer hover:text-white">
             <option>Last 1 Hour</option>
          </select>
       </div>

       {/* Logs Table */}
       <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
               <thead>
                  <tr className="bg-[#111315] border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                     <th className="p-4 font-medium">Timestamp</th>
                     <th className="p-4 font-medium">Request ID</th>
                     <th className="p-4 font-medium">Model</th>
                     <th className="p-4 font-medium">Status</th>
                     <th className="p-4 font-medium text-right">Latency</th>
                     <th className="p-4 font-medium text-right">Cost</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-white/5">
                  {MOCK_LOGS.map((log) => (
                     <tr key={log.id} className="group hover:bg-white/5 transition-colors font-mono text-xs">
                        <td className="p-4 text-gray-400">
                           <span className="text-white">{log.timestamp}</span> <span className="text-gray-600">2023-10-24</span>
                        </td>
                        <td className="p-4 text-nexus-primary hover:underline cursor-pointer">{log.requestId}</td>
                        <td className="p-4 text-white">
                           <span className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{log.model}</span>
                        </td>
                        <td className="p-4">
                           <span className={`
                              px-1.5 py-0.5 rounded text-[10px] font-bold border
                              ${log.status === 200 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                                log.status === 429 ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 
                                'bg-red-500/10 text-red-500 border-red-500/20'}
                           `}>
                              {log.status}
                           </span>
                        </td>
                        <td className="p-4 text-right text-white">{log.latency}</td>
                        <td className="p-4 text-right text-gray-300">{log.cost}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
          </div>
       </div>
    </div>
  );

  const renderPlayground = () => (
     <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-200px)] animate-fade-in">
        <div className="glass-panel rounded-xl p-6 flex flex-col border border-nexus-border bg-nexus-card">
           <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
             <Terminal className="w-5 h-5 text-purple-400" />
             AI Code Generator
           </h3>
           <textarea 
             className="w-full bg-[#0A0A0C] border border-nexus-border rounded-xl p-4 text-white placeholder-gray-600 focus:outline-none focus:border-nexus-primary transition-all font-mono text-sm flex-1 resize-none"
             placeholder="Describe a function or component..."
             value={prompt}
             onChange={(e) => setPrompt(e.target.value)}
           />
           <div className="mt-6 flex justify-end">
             <Button 
               onClick={handleGenerate} 
               isLoading={isGenerating} 
               glow
               variant="primary"
               className="bg-nexus-primary hover:bg-cyan-400 text-black border-none"
             >
               <Zap className="w-4 h-4" /> Generate Code
             </Button>
           </div>
        </div>
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col border border-nexus-border bg-nexus-card relative min-h-[400px]">
           <div className="bg-[#0f0f12] px-4 py-3 flex items-center justify-between border-b border-white/5">
             <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
             </div>
             <span className="text-xs text-gray-500 font-mono">generated.ts</span>
           </div>
           <pre className="flex-1 bg-[#0A0A0C] p-6 overflow-auto font-mono text-sm text-gray-300">
             {isGenerating ? (
               <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                 <RefreshCw className="w-8 h-8 animate-spin text-nexus-primary" />
                 <span className="animate-pulse">Synthesizing logic...</span>
               </div>
             ) : (
               <code>{generatedCode}</code>
             )}
           </pre>
        </div>
     </div>
  );

  const renderTutorialDetail = (tutorial: Tutorial) => (
    <div className="animate-fade-in space-y-6">
       <button 
         onClick={() => setSelectedTutorial(null)}
         className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4"
       >
          <ArrowLeft className="w-4 h-4" /> Back to Tutorials
       </button>
       
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
             {/* Video Placeholder */}
             <div className="aspect-video w-full bg-black rounded-xl border border-white/10 relative group overflow-hidden flex items-center justify-center">
                 <div className="absolute inset-0 bg-gradient-to-tr from-nexus-primary/5 to-purple-500/5" />
                 <Button variant="secondary" className="w-16 h-16 rounded-full p-0 flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20 hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-white text-white ml-1" />
                 </Button>
                 <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center gap-2">
                       <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                          <div className="w-1/3 h-full bg-nexus-primary"></div>
                       </div>
                       <span className="text-xs text-gray-300 font-mono">12:30 / 45:00</span>
                    </div>
                 </div>
             </div>
             
             <div>
                <h1 className="text-3xl font-bold text-white mb-2">{tutorial.title}</h1>
                <p className="text-gray-400 leading-relaxed">{tutorial.description}</p>
             </div>

             <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
                <h3 className="text-lg font-medium text-white mb-4">About this course</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                   <div className="flex items-center gap-3 text-gray-400">
                      <Clock className="w-4 h-4 text-nexus-primary" />
                      <span>Duration: {tutorial.duration}</span>
                   </div>
                   <div className="flex items-center gap-3 text-gray-400">
                      <BarChart3 className="w-4 h-4 text-nexus-secondary" />
                      <span>Level: {tutorial.difficulty}</span>
                   </div>
                   <div className="flex items-center gap-3 text-gray-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Certificate of Completion</span>
                   </div>
                   <div className="flex items-center gap-3 text-gray-400">
                      <Terminal className="w-4 h-4 text-purple-500" />
                      <span>Hands-on Labs</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
             <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
                <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-white">Course Syllabus</h3>
                   <span className="text-xs text-gray-500">2/6 Completed</span>
                </div>
                <div className="space-y-3">
                   {tutorial.lessons?.map((lesson, idx) => (
                      <div 
                         key={lesson.id}
                         className={`p-3 rounded-lg border flex items-center gap-3 transition-colors cursor-pointer ${
                            lesson.isCompleted ? 'bg-emerald-500/5 border-emerald-500/20' : 
                            lesson.isLocked ? 'bg-white/5 border-white/5 opacity-50' : 
                            'bg-nexus-card border-nexus-border hover:border-nexus-primary/50'
                         }`}
                      >
                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                            lesson.isCompleted ? 'bg-emerald-500 text-black border-emerald-500' :
                            lesson.isLocked ? 'border-gray-600 text-gray-600' :
                            'border-gray-400 text-white'
                         }`}>
                            {lesson.isCompleted ? <Check className="w-3 h-3" /> : idx + 1}
                         </div>
                         <div className="flex-1">
                            <div className="text-sm font-medium text-white">{lesson.title}</div>
                            <div className="text-xs text-gray-500">{lesson.duration}</div>
                         </div>
                         {lesson.isLocked && <LockIcon className="w-3 h-3 text-gray-600" />}
                         {!lesson.isLocked && !lesson.isCompleted && <PlayCircle className="w-4 h-4 text-nexus-primary" />}
                      </div>
                   ))}
                </div>
             </div>
             
             <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-gradient-to-br from-purple-900/20 to-blue-900/20 text-center">
                <GraduationCap className="w-10 h-10 text-white mx-auto mb-3" />
                <h3 className="font-bold text-white mb-1">Unlock Certification</h3>
                <p className="text-xs text-gray-400 mb-4">Complete all lessons to earn your badge.</p>
                <Button variant="secondary" className="w-full text-xs h-8">View Badge</Button>
             </div>
          </div>
       </div>
    </div>
  );

  const renderTutorials = () => {
    if (selectedTutorial) {
       return renderTutorialDetail(selectedTutorial);
    }
    
    return (
    <div className="space-y-8 animate-fade-in">
      {/* Featured Banner */}
      <div className="glass-panel rounded-2xl p-8 border border-nexus-border bg-gradient-to-br from-[#0f1014] to-[#0A0A0C] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-primary/10 rounded-full blur-[80px] group-hover:bg-nexus-primary/20 transition-all duration-700"></div>
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
           <div className="space-y-4 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-nexus-secondary/10 border border-nexus-secondary/20 text-xs font-medium text-nexus-secondary">
                 <Star className="w-3 h-3 fill-nexus-secondary" /> Featured Course
              </div>
              <h2 className="text-3xl font-bold text-white">Mastering Nexus Edge Functions</h2>
              <p className="text-gray-400 text-lg">From zero to hero. Learn how to build, test, and deploy globally distributed serverless functions with sub-50ms latency.</p>
              <div className="flex items-center gap-4 pt-2">
                 <Button 
                   variant="primary" 
                   glow 
                   className="h-10"
                   onClick={() => setSelectedTutorial(MOCK_TUTORIALS[0])}
                 >
                   Start Learning
                 </Button>
                 <span className="text-sm text-gray-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> 1h 30m
                 </span>
              </div>
           </div>
           <div className="hidden md:block w-48 h-48 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-600/20 border border-white/10 flex items-center justify-center relative">
              <GraduationCap className="w-16 h-16 text-white opacity-80" />
              <div className="absolute inset-0 border border-white/10 rounded-xl" />
           </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
         <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
            {['All', 'AI', 'Edge', 'Security', 'DevOps'].map((cat) => (
               <button key={cat} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${cat === 'All' ? 'bg-white text-black' : 'bg-[#0A0A0C] border border-nexus-border text-gray-400 hover:text-white hover:border-gray-500'}`}>
                  {cat}
               </button>
            ))}
         </div>
         <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
             <input 
                type="text" 
                placeholder="Search tutorials..." 
                className="w-full bg-[#0A0A0C] border border-nexus-border rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-nexus-primary placeholder:text-gray-600"
             />
         </div>
      </div>

      {/* Tutorials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
         {MOCK_TUTORIALS.map((tutorial) => (
            <div key={tutorial.id} className="glass-panel rounded-xl overflow-hidden border border-nexus-border hover:border-nexus-primary/50 transition-all duration-300 group flex flex-col h-full bg-[#0E0E11]">
               <div className={`h-32 w-full bg-gradient-to-br ${tutorial.imageGradient} relative`}>
                  <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded text-[10px] font-medium text-white border border-white/10 uppercase tracking-wide">
                     {tutorial.category}
                  </div>
                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                     <PlayCircle className="w-12 h-12 text-white drop-shadow-lg" />
                  </div>
               </div>
               <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        tutorial.difficulty === 'Beginner' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' :
                        tutorial.difficulty === 'Intermediate' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                        'text-red-400 border-red-500/20 bg-red-500/10'
                     }`}>
                        {tutorial.difficulty}
                     </span>
                     <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {tutorial.duration}
                     </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-nexus-primary transition-colors">{tutorial.title}</h3>
                  <p className="text-sm text-gray-400 mb-4 flex-1">{tutorial.description}</p>
                  
                  {tutorial.progress ? (
                     <div className="mt-auto space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                           <span>Progress</span>
                           <span>{tutorial.progress}%</span>
                        </div>
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                           <div className="h-full bg-nexus-success w-full rounded-full"></div>
                        </div>
                     </div>
                  ) : (
                     <div 
                       className="mt-auto pt-4 border-t border-white/5 flex items-center text-nexus-primary text-sm font-medium group-hover:translate-x-1 transition-transform cursor-pointer"
                       onClick={() => setSelectedTutorial(tutorial)}
                     >
                        Start Tutorial <ArrowRight className="w-4 h-4 ml-1" />
                     </div>
                  )}
               </div>
            </div>
         ))}
      </div>
    </div>
  )};

  const renderSettings = () => (
     <div className="grid grid-cols-12 gap-8 animate-fade-in">
        <div className="col-span-12 md:col-span-3">
           <nav className="space-y-1">
              {['General', 'Organization', 'Team Members'].map((tab) => {
                 const id = tab.toLowerCase().replace(' ', '');
                 return (
                    <button
                       key={id}
                       onClick={() => setSettingsTab(id)}
                       className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${settingsTab === id ? 'bg-white/10 text-white font-medium' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                    >
                       {tab}
                    </button>
                 )
              })}
           </nav>
        </div>
        <div className="col-span-12 md:col-span-9">
           {settingsTab === 'general' && (
              <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
                 <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-medium text-white">Profile Information</h3>
                 </div>
                 <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4">
                       <img src={user.avatar} className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold text-white border-2 border-white/10" alt={user.username} />
                       <button className="px-3 py-2 bg-white/5 border border-white/10 rounded-md text-sm text-white hover:bg-white/10 transition-colors">Change Avatar</button>
                       <p className="text-xs text-gray-500">JPG, GIF or PNG. Max size 800K</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-sm text-gray-400">First Name</label>
                          <input type="text" defaultValue={user.username.split(' ')[0]} className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-nexus-primary" />
                       </div>
                       <div className="space-y-2">
                          <label className="text-sm text-gray-400">Last Name</label>
                          <input type="text" defaultValue={user.username.split(' ')[1] || ''} className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-nexus-primary" />
                       </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Email Address</label>
                        <input type="email" defaultValue={user.email} className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-nexus-primary" />
                    </div>
                 </div>
                 <div className="p-4 bg-[#0A0A0C] flex justify-end gap-3 border-t border-white/5">
                    <button className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                    <Button variant="primary" className="h-9 px-4">Save Changes</Button>
                 </div>
              </div>
           )}

           {settingsTab === 'organization' && (
              <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
                 <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-medium text-white">Organization Settings</h3>
                 </div>
                 <div className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm text-gray-400">Organization Name</label>
                        <input type="text" defaultValue="Nexus AI Corp" className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-nexus-primary" />
                    </div>
                    <div className="space-y-4 pt-4">
                       <div className="flex items-center justify-between p-4 bg-[#0A0A0C] rounded-lg border border-white/5">
                          <div>
                             <div className="text-white text-sm font-medium">Enforce SSO</div>
                             <div className="text-xs text-gray-500">Require all members to log in via Single Sign-On.</div>
                          </div>
                          <div className="w-10 h-6 bg-white/10 rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-gray-400 rounded-full absolute left-1 top-1"></div></div>
                       </div>
                       <div className="flex items-center justify-between p-4 bg-[#0A0A0C] rounded-lg border border-white/5">
                          <div>
                             <div className="text-white text-sm font-medium">Usage Alerts</div>
                             <div className="text-xs text-gray-500">Receive emails when 80% of budget is consumed.</div>
                          </div>
                          <div className="w-10 h-6 bg-nexus-primary rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div></div>
                       </div>
                    </div>
                 </div>
                 <div className="p-4 bg-[#0A0A0C] flex justify-end gap-3 border-t border-white/5">
                    <button className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                    <Button variant="primary" className="h-9 px-4">Save Changes</Button>
                 </div>
              </div>
           )}

           {settingsTab === 'teammembers' && (
              <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
                 <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white">Team Members</h3>
                    <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-sm rounded-md transition-colors flex items-center gap-2">
                       <Plus className="w-4 h-4" /> Invite Member
                    </button>
                 </div>
                 <div className="divide-y divide-white/5">
                    {MOCK_TEAM.map((member) => (
                       <div key={member.id} className="p-4 flex items-center justify-between group hover:bg-white/5 transition-colors">
                          <div className="flex items-center gap-3">
                             <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full bg-white/10" />
                             <div>
                                <div className="text-white text-sm font-medium">{member.name}</div>
                                <div className="text-xs text-gray-500">{member.email}</div>
                             </div>
                          </div>
                          <div className="flex items-center gap-4">
                             <span className="px-2 py-1 rounded bg-[#0A0A0C] border border-white/10 text-xs text-gray-300">{member.role}</span>
                             <button className="text-gray-500 hover:text-white p-1"><MoreVertical className="w-4 h-4" /></button>
                          </div>
                       </div>
                    ))}
                 </div>
                 <div className="p-4 bg-[#0A0A0C] border-t border-white/5 flex justify-end gap-3">
                     <button className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancel</button>
                    <Button variant="primary" className="h-9 px-4">Save Changes</Button>
                 </div>
              </div>
           )}
        </div>
     </div>
  );

  return (
    <div className="flex min-h-screen bg-nexus-bg text-white font-sans selection:bg-nexus-primary/30">
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-50 bg-[#0A0A0C] border-r border-nexus-border flex flex-col transition-all duration-300
        ${isSidebarCollapsed ? 'w-20' : 'w-64'}
        ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Brand */}
        <div className={`h-16 flex items-center px-6 border-b border-white/5 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.5)]">
              <div className="w-3 h-3 bg-white rounded-full"></div>
           </div>
           {!isSidebarCollapsed && (
              <div className="ml-3">
                 <h1 className="text-white font-bold tracking-tight">NexusAI</h1>
                 <p className="text-[10px] text-gray-500 uppercase tracking-wider">Enterprise Gateway</p>
              </div>
           )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
           <SidebarItem id="overview" icon={LayoutGrid} label="Overview" />
           <SidebarItem id="keys" icon={Key} label="API Keys" />
           <SidebarItem id="billing" icon={CreditCard} label="Billing" />
           <SidebarItem id="logs" icon={FileText} label="Logs" />
           <SidebarItem id="analytics" icon={BarChart3} label="Analytics" />
           <SidebarItem id="playground" icon={Terminal} label="Playground" />
           <SidebarItem id="tutorials" icon={BookOpen} label="Tutorials" />
           <div className="pt-4 mt-4 border-t border-white/5">
              <SidebarItem id="settings" icon={Settings} label="Settings" />
           </div>
        </nav>

        {/* Collapse Toggle */}
        <button 
           onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
           className="h-12 border-t border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors hidden md:flex"
        >
           {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 rotate-180" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        
        {/* Top Header */}
        <header className="h-16 border-b border-nexus-border bg-[#0A0A0C]/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <button className="md:hidden text-gray-400" onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}>
                 <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-bold text-white capitalize">{activeTab === 'keys' ? 'API Keys & Access' : activeTab}</h2>
           </div>
           <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-500">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                 US-East-1 Operational
              </div>
              <button className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5 relative">
                 <Bell className="w-5 h-5" />
                 <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0A0A0C]"></span>
              </button>
              <button className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/5">
                 <HelpCircle className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                 <div className="text-right hidden sm:block">
                    <div className="text-xs font-medium text-white">{user.username}</div>
                    <div className="text-[10px] text-gray-500">{user.email}</div>
                 </div>
                 <img src={user.avatar} className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 border border-white/10" alt={user.username} />
              </div>
           </div>
        </header>

        {/* Tab Content */}
        <main className="p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
           {activeTab === 'overview' && (
              <div className="space-y-2 mb-8">
                 <h2 className="text-3xl font-bold text-white mb-2">Analytics</h2>
                 <p className="text-gray-400">Deep insights into model performance, costs, and system health.</p>
                 <div className="mt-6">{renderOverview()}</div>
              </div>
           )}
           
           {activeTab === 'keys' && (
              <div className="space-y-2 mb-8">
                 <div className="flex justify-between items-start mb-6">
                    <div>
                       <h2 className="text-3xl font-bold text-white mb-2">API Keys & Access</h2>
                       <p className="text-gray-400 max-w-2xl">Manage your secret keys, configure rate limits per token, and monitor usage security in real-time.</p>
                    </div>
                    <div className="flex gap-3">
                       <button className="px-4 py-2 bg-nexus-card border border-nexus-border rounded-lg text-white text-sm font-medium hover:bg-white/5 flex items-center gap-2">
                          <FileText className="w-4 h-4" /> Docs
                       </button>
                       <Button variant="primary" className="h-10">
                          <Plus className="w-4 h-4 mr-2" /> Generate New Key
                       </Button>
                    </div>
                 </div>
                 {renderKeys()}
              </div>
           )}

           {activeTab === 'billing' && (
              <div className="space-y-2 mb-8">
                 <h2 className="text-3xl font-bold text-white mb-2">Billing & Usage</h2>
                 <p className="text-gray-400">Manage your payment methods, invoices, and spending limits.</p>
                 <div className="mt-6">{renderBilling()}</div>
              </div>
           )}

           {activeTab === 'logs' && (
              <div className="space-y-2 mb-8">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                       <h2 className="text-3xl font-bold text-white mb-2">Request Logs</h2>
                       <p className="text-gray-400">Inspect and debug individual API requests.</p>
                    </div>
                    <div className="flex gap-2">
                       <button className="px-3 py-2 bg-nexus-card border border-nexus-border rounded-lg text-white text-xs font-medium hover:bg-white/5 flex items-center gap-2">
                          <Download className="w-3 h-3" /> Export CSV
                       </button>
                       <button className="p-2 bg-nexus-card border border-nexus-border rounded-lg text-white hover:bg-white/5">
                          <RotateCcw className="w-4 h-4" />
                       </button>
                    </div>
                 </div>
                 {renderLogs()}
              </div>
           )}

           {activeTab === 'analytics' && (
              <div className="space-y-2 mb-8">
                 <h2 className="text-3xl font-bold text-white mb-2">Analytics</h2>
                 <p className="text-gray-400">Deep insights into model performance, costs, and system health.</p>
                 <div className="mt-6">{renderAnalytics()}</div>
              </div>
           )}

           {activeTab === 'playground' && (
              <div className="space-y-2 mb-8">
                 <h2 className="text-3xl font-bold text-white mb-2">Playground</h2>
                 <p className="text-gray-400">Test prompts and generate code snippets instantly.</p>
                 <div className="mt-6">{renderPlayground()}</div>
              </div>
           )}
           
           {activeTab === 'tutorials' && (
              <div className="space-y-2 mb-8">
                 <h2 className="text-3xl font-bold text-white mb-2">Tutorial Center</h2>
                 <p className="text-gray-400">Learn how to build, deploy, and scale with Nexus.</p>
                 <div className="mt-6">{renderTutorials()}</div>
              </div>
           )}

           {activeTab === 'settings' && (
              <div className="space-y-2 mb-8">
                 <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
                 <p className="text-gray-400">Manage account preferences and system configurations.</p>
                 <div className="mt-6">{renderSettings()}</div>
              </div>
           )}
        </main>
      </div>

      {/* Mobile Overlay */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm md:hidden" onClick={() => setIsMobileNavOpen(false)} />
      )}
    </div>
  );
};