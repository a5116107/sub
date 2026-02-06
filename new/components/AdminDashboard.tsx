import React, { useState } from 'react';
import { 
  AreaChart, Area, XAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { 
  LayoutDashboard, Users, Server, ShieldAlert, 
  Search, Filter, MoreVertical, 
  Activity, DollarSign, AlertTriangle,
  HardDrive, Database, ChevronRight, LogOut, Download, FileText, ClipboardList,
  Layers, CreditCard, RefreshCw, Columns, Plus,
  Gift, Tag, BarChart2, Cloud, Globe, Trash2, Calendar, X, Clock, User
} from 'lucide-react';
import { Button } from './Button';
import { AdminUser, SystemRegion, ChartData, AdminAuditLog, Subscription, RedeemCode, PromoCode, PlatformAccount, ApiGroup, UsageStat, UserSession } from '../types';

// --- MOCK DATA ---

const GLOBAL_TRAFFIC_DATA: ChartData[] = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  requests: Math.floor(Math.random() * 50000) + 10000,
  latency: Math.floor(Math.random() * 50) + 20,
}));

const ADMIN_USERS: AdminUser[] = [
  { id: 'usr_1', name: 'Alex Morgan', email: 'alex@nexus.ai', plan: 'Enterprise', spend: '$420.50', status: 'Active', lastActive: '2 min ago' },
  { id: 'usr_2', name: 'Sarah Connor', email: 'sarah@skynet.com', plan: 'Pro', spend: '$120.00', status: 'Active', lastActive: '1 hr ago' },
  { id: 'usr_3', name: 'James Holden', email: 'jim@rocinante.space', plan: 'Free', spend: '$0.00', status: 'Suspended', lastActive: '5 days ago' },
];

const REGIONS: SystemRegion[] = [
  { id: 'us-east-1', name: 'N. Virginia', status: 'Operational', latency: 24, load: 45 },
  { id: 'eu-west-1', name: 'Ireland', status: 'Degraded', latency: 120, load: 89 },
];

const AUDIT_LOGS: AdminAuditLog[] = [
  { id: 'aud_1', action: 'User Suspension', admin: 'sysadmin', target: 'usr_3', timestamp: '2023-10-25 14:30:22', status: 'Success', details: 'Suspended due to TOS violation (Spam)' },
  { id: 'aud_2', action: 'Config Change', admin: 'devops_lead', target: 'eu-west-1', timestamp: '2023-10-25 12:15:10', status: 'Success', details: 'Increased load balancer capacity by 20%' },
];

const MOCK_SUBSCRIPTIONS: Subscription[] = [
   { id: 'sub_1', user: 'alex@nexus.ai', group: 'Engineering', usage: 45, limit: '1M Tokens', expires: '2024-12-31', status: 'Active' },
   { id: 'sub_2', user: 'sarah@skynet.com', group: 'External', usage: 92, limit: '500k Tokens', expires: '2023-11-30', status: 'Active' },
];

const MOCK_REDEEM_CODES: RedeemCode[] = [
  { id: 'rc_1', code: 'NEXUS-GIFT-2024', type: 'Balance', value: '$50.00', status: 'Available' },
  { id: 'rc_2', code: 'WELCOME-10', type: 'Balance', value: '$10.00', status: 'Used', usedBy: 'alex@nexus.ai', usedAt: '2023-10-01' },
];

const MOCK_PROMO_CODES: PromoCode[] = [
  { id: 'pc_1', code: 'BLACKFRIDAY23', bonusAmount: '$25.00', usage: '154 / 500', status: 'Active', createdAt: '2023-11-01' },
  { id: 'pc_2', code: 'EARLYACCESS', bonusAmount: '$100.00', usage: '50 / 50', status: 'Expired', createdAt: '2023-01-15' },
];

const MOCK_ACCOUNTS: PlatformAccount[] = [
  { id: 'acc_1', name: 'Anthropic Prod A', platform: 'Anthropic', type: 'Claude Code', capacity: 'Tier 4', status: 'Active', lastUsed: '5m ago' },
  { id: 'acc_2', name: 'OpenAI Reserve', platform: 'OpenAI', type: 'API Key', capacity: 'Tier 5', status: 'RateLimited', lastUsed: '1h ago' },
];

const MOCK_GROUPS: ApiGroup[] = [
  { id: 'grp_1', name: 'default', platform: 'Anthropic', billingType: 'Standard', rateMultiplier: '1x', type: 'Public', accountsCount: 5, status: 'Active' },
  { id: 'grp_2', name: 'vip-cluster', platform: 'OpenAI', billingType: 'Subscription', rateMultiplier: '0.8x', type: 'Exclusive', accountsCount: 2, status: 'Active' },
];

const MOCK_USAGE_STATS: UsageStat[] = [
  { id: 'usg_1', user: 'alex@nexus.ai', apiKey: 'nx_live_...', model: 'claude-3-opus', tokens: 4520, cost: '$0.15', duration: '2.4s', time: '10:42:05' },
  { id: 'usg_2', user: 'sarah@skynet.com', apiKey: 'nx_test_...', model: 'gpt-4', tokens: 120, cost: '$0.01', duration: '0.8s', time: '10:41:55' },
];

const COLORS = {
  primary: '#00F0FF',
  danger: '#EF4444',
  warning: '#F59E0B',
  success: '#10B981',
  purple: '#7000FF'
};

interface AdminDashboardProps {
  user: UserSession;
}

// Internal Modal Component
const Modal = ({ isOpen, onClose, title, children, footer }: { isOpen: boolean; onClose: () => void; title: string; children?: React.ReactNode; footer?: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-[#121215] border border-nexus-border rounded-xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-float">
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {children}
        </div>
        {footer && (
          <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [showGenerateCodeModal, setShowGenerateCodeModal] = useState(false);
  const [showCreatePromoModal, setShowCreatePromoModal] = useState(false);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  const SidebarItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative
        ${activeTab === id 
          ? 'bg-nexus-card border border-nexus-border text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'}
      `}
      title={isSidebarCollapsed ? label : undefined}
    >
      {activeTab === id && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
      )}
      <Icon className={`w-5 h-5 ${activeTab === id ? 'text-white' : 'group-hover:text-gray-200'}`} />
      {!isSidebarCollapsed && <span>{label}</span>}
    </button>
  );

  const renderOverview = () => (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-nexus-border bg-nexus-card relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Total Revenue (MRR)</span>
            <DollarSign className="w-4 h-4 text-nexus-success" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">$482,900</div>
          <div className="text-xs text-nexus-success flex items-center gap-1">
             <Activity className="w-3 h-3" /> +12.5% vs last month
          </div>
        </div>
        {/* ... other KPIs ... */}
         <div className="glass-panel p-5 rounded-xl border border-nexus-border bg-nexus-card relative overflow-hidden">
           <div className="flex justify-between items-start mb-2">
            <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Active Deployments</span>
            <Server className="w-4 h-4 text-nexus-primary" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">24,592</div>
          <div className="text-xs text-nexus-primary flex items-center gap-1">
             <Activity className="w-3 h-3" /> +842 new today
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-white font-semibold">Global Traffic Volume</h3>
             <select className="bg-nexus-bg border border-nexus-border text-gray-300 text-xs rounded-md px-2 py-1 outline-none">
                <option>Live (Realtime)</option>
                <option>Last 24h</option>
             </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={GLOBAL_TRAFFIC_DATA}>
                <defs>
                  <linearGradient id="colorAdminRequests" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A30" vertical={false} />
                <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0C', border: '1px solid #2A2A30', borderRadius: '8px', color: '#fff' }}
                />
                <Area type="monotone" dataKey="requests" stroke={COLORS.primary} fill="url(#colorAdminRequests)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
    </div>
  );

  const renderRedeemCodes = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Redeem Codes</h2>
       </div>
       
       <div className="glass-panel p-2 rounded-xl border border-nexus-border bg-nexus-card flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input type="text" placeholder="Search codes..." className="w-full bg-[#0A0A0C] border border-nexus-border rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-white/20" />
          </div>
          <select className="bg-[#0A0A0C] border border-nexus-border text-gray-300 text-sm rounded-lg px-3 py-2 outline-none hover:border-gray-500 min-w-[120px]">
              <option>All Types</option>
              <option>Balance</option>
              <option>Subscription</option>
          </select>
          <select className="bg-[#0A0A0C] border border-nexus-border text-gray-300 text-sm rounded-lg px-3 py-2 outline-none hover:border-gray-500 min-w-[120px]">
              <option>All Status</option>
              <option>Available</option>
              <option>Used</option>
          </select>
          <Button variant="secondary" className="h-9 px-3 text-xs gap-2">
             <Download className="w-3 h-3" /> Export CSV
          </Button>
          <Button variant="primary" className="h-9 px-4 text-xs bg-emerald-500 hover:bg-emerald-400 text-black border-none" onClick={() => setShowGenerateCodeModal(true)}>
             Generate Codes
          </Button>
       </div>

       <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
          <table className="w-full text-left text-sm">
             <thead>
                <tr className="bg-white/5 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                   <th className="p-4 font-medium">Code</th>
                   <th className="p-4 font-medium">Type</th>
                   <th className="p-4 font-medium">Value</th>
                   <th className="p-4 font-medium">Status</th>
                   <th className="p-4 font-medium">Used By</th>
                   <th className="p-4 font-medium">Used At</th>
                   <th className="p-4 font-medium text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {MOCK_REDEEM_CODES.map(code => (
                   <tr key={code.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-white">{code.code}</td>
                      <td className="p-4 text-gray-300">{code.type}</td>
                      <td className="p-4 text-emerald-400 font-mono">{code.value}</td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${code.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-gray-400 border-white/10'}`}>
                            {code.status}
                         </span>
                      </td>
                      <td className="p-4 text-gray-400 text-xs">{code.usedBy || '-'}</td>
                      <td className="p-4 text-gray-400 text-xs">{code.usedAt || '-'}</td>
                      <td className="p-4 text-right">
                         <button className="text-gray-500 hover:text-white p-1"><Trash2 className="w-4 h-4" /></button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>

       <Modal 
          isOpen={showGenerateCodeModal} 
          onClose={() => setShowGenerateCodeModal(false)} 
          title="Generate Redeem Codes"
          footer={
             <>
               <Button variant="ghost" onClick={() => setShowGenerateCodeModal(false)}>Cancel</Button>
               <Button variant="primary" className="bg-emerald-500 hover:bg-emerald-400 text-black border-none">Generate</Button>
             </>
          }
       >
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Code Type</label>
                <select className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20">
                   <option>Balance</option>
                   <option>Subscription</option>
                </select>
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Amount ($)</label>
                <input type="number" defaultValue={10} className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20" />
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Count</label>
                <input type="number" defaultValue={1} className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20" />
             </div>
          </div>
       </Modal>
    </div>
  );

  const renderPromoCodes = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Promo Codes</h2>
       </div>

       <div className="glass-panel p-2 rounded-xl border border-nexus-border bg-nexus-card flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input type="text" placeholder="Search codes..." className="w-full bg-[#0A0A0C] border border-nexus-border rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-white/20" />
          </div>
          <select className="bg-[#0A0A0C] border border-nexus-border text-gray-300 text-sm rounded-lg px-3 py-2 outline-none hover:border-gray-500 min-w-[120px]">
              <option>All Status</option>
              <option>Active</option>
              <option>Expired</option>
          </select>
          <Button variant="primary" className="h-9 px-4 text-xs bg-emerald-500 hover:bg-emerald-400 text-black border-none" onClick={() => setShowCreatePromoModal(true)}>
             <Plus className="w-4 h-4 mr-1" /> Create Promo Code
          </Button>
       </div>

       <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
          <table className="w-full text-left text-sm">
             <thead>
                <tr className="bg-white/5 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                   <th className="p-4 font-medium">Code</th>
                   <th className="p-4 font-medium">Bonus Amount</th>
                   <th className="p-4 font-medium">Usage</th>
                   <th className="p-4 font-medium">Status</th>
                   <th className="p-4 font-medium">Expires At</th>
                   <th className="p-4 font-medium">Created At</th>
                   <th className="p-4 font-medium text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {MOCK_PROMO_CODES.map(code => (
                   <tr key={code.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-white font-bold">{code.code}</td>
                      <td className="p-4 text-emerald-400">{code.bonusAmount}</td>
                      <td className="p-4 text-gray-300">{code.usage}</td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${code.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {code.status}
                         </span>
                      </td>
                      <td className="p-4 text-gray-400 text-xs">{code.expiresAt || 'Never'}</td>
                      <td className="p-4 text-gray-400 text-xs">{code.createdAt}</td>
                      <td className="p-4 text-right">
                         <button className="text-gray-500 hover:text-white p-1"><Trash2 className="w-4 h-4" /></button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
       
       <Modal 
          isOpen={showCreatePromoModal} 
          onClose={() => setShowCreatePromoModal(false)} 
          title="Create Promo Code"
          footer={
             <>
               <Button variant="ghost" onClick={() => setShowCreatePromoModal(false)}>Cancel</Button>
               <Button variant="primary" className="bg-emerald-500 hover:bg-emerald-400 text-black border-none">Create</Button>
             </>
          }
       >
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Promo Code <span className="text-xs text-gray-500">(auto-generate if empty)</span></label>
                <input type="text" placeholder="ENTER PROMO CODE" className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20 placeholder:text-gray-700 uppercase" />
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Bonus Amount ($)</label>
                <input type="number" defaultValue={1} className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20" />
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Max Uses <span className="text-xs text-gray-500">(0 = unlimited)</span></label>
                <input type="number" defaultValue={0} className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20" />
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Notes <span className="text-xs text-gray-500">(optional)</span></label>
                <textarea className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20 h-20 resize-none"></textarea>
             </div>
          </div>
       </Modal>
    </div>
  );

  const renderUsage = () => (
    <div className="space-y-6 animate-fade-in">
       {/* Stats Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-xl border border-nexus-border bg-white/5 flex items-center gap-4">
             <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400"><FileText className="w-6 h-6"/></div>
             <div><div className="text-xs text-gray-400">Total Requests</div><div className="text-xl font-bold text-white">45,291</div></div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-nexus-border bg-white/5 flex items-center gap-4">
             <div className="p-3 rounded-lg bg-orange-500/10 text-orange-400"><Layers className="w-6 h-6"/></div>
             <div><div className="text-xs text-gray-400">Total Tokens</div><div className="text-xl font-bold text-white">8.2M</div></div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-nexus-border bg-white/5 flex items-center gap-4">
             <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400"><DollarSign className="w-6 h-6"/></div>
             <div><div className="text-xs text-gray-400">Total Cost</div><div className="text-xl font-bold text-white">$420.50</div></div>
          </div>
          <div className="glass-panel p-4 rounded-xl border border-nexus-border bg-white/5 flex items-center gap-4">
             <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400"><Clock className="w-6 h-6"/></div>
             <div><div className="text-xs text-gray-400">Avg Duration</div><div className="text-xl font-bold text-white">1.2s</div></div>
          </div>
       </div>

       {/* Charts Placeholder */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card h-64 flex flex-col items-center justify-center text-gray-500">
             <BarChart2 className="w-12 h-12 mb-4 opacity-20"/>
             <span>Model Distribution</span>
          </div>
          <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card h-64 flex flex-col items-center justify-center text-gray-500">
             <Activity className="w-12 h-12 mb-4 opacity-20"/>
             <span>Token Usage Trend</span>
          </div>
       </div>

       {/* Filters */}
       <div className="glass-panel p-4 rounded-xl border border-nexus-border bg-nexus-card grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="text" placeholder="User email..." className="bg-[#0A0A0C] border border-nexus-border rounded-lg px-3 py-2 text-xs text-white outline-none" />
          <input type="text" placeholder="API Key name..." className="bg-[#0A0A0C] border border-nexus-border rounded-lg px-3 py-2 text-xs text-white outline-none" />
          <select className="bg-[#0A0A0C] border border-nexus-border rounded-lg px-3 py-2 text-xs text-gray-300 outline-none"><option>Select Model</option></select>
          <select className="bg-[#0A0A0C] border border-nexus-border rounded-lg px-3 py-2 text-xs text-gray-300 outline-none"><option>All Billing Types</option></select>
          <div className="md:col-span-4 flex justify-end gap-2">
             <Button variant="ghost" className="h-8 text-xs">Reset</Button>
             <Button variant="danger" className="h-8 text-xs">Cleanup</Button>
             <Button variant="primary" className="h-8 text-xs bg-emerald-500 hover:bg-emerald-400 text-black border-none">Export Excel</Button>
          </div>
       </div>

       {/* Table */}
       <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
          <table className="w-full text-left text-sm">
             <thead>
                <tr className="bg-white/5 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                   <th className="p-4 font-medium">User</th>
                   <th className="p-4 font-medium">Model</th>
                   <th className="p-4 font-medium">Tokens</th>
                   <th className="p-4 font-medium">Cost</th>
                   <th className="p-4 font-medium">Duration</th>
                   <th className="p-4 font-medium">Time</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {MOCK_USAGE_STATS.map(stat => (
                   <tr key={stat.id} className="group hover:bg-white/5 transition-colors text-xs">
                      <td className="p-4 text-white">{stat.user}</td>
                      <td className="p-4 text-nexus-primary">{stat.model}</td>
                      <td className="p-4 text-gray-300">{stat.tokens}</td>
                      <td className="p-4 text-white font-mono">{stat.cost}</td>
                      <td className="p-4 text-gray-400">{stat.duration}</td>
                      <td className="p-4 text-gray-500">{stat.time}</td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderAccounts = () => (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Account Management</h2>
       </div>
       
       <div className="glass-panel p-2 rounded-xl border border-nexus-border bg-nexus-card flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input type="text" placeholder="Search accounts..." className="w-full bg-[#0A0A0C] border border-nexus-border rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-white/20" />
          </div>
          <select className="bg-[#0A0A0C] border border-nexus-border text-gray-300 text-sm rounded-lg px-3 py-2 outline-none hover:border-gray-500 min-w-[120px]"><option>All Platforms</option></select>
          <select className="bg-[#0A0A0C] border border-nexus-border text-gray-300 text-sm rounded-lg px-3 py-2 outline-none hover:border-gray-500 min-w-[120px]"><option>All Status</option></select>
          <Button variant="secondary" className="h-9 px-3 text-xs gap-2"><RefreshCw className="w-3 h-3" /> Auto Refresh</Button>
          <Button variant="primary" className="h-9 px-4 text-xs bg-emerald-500 hover:bg-emerald-400 text-black border-none" onClick={() => setShowCreateAccountModal(true)}>Create Account</Button>
       </div>

       <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
          <table className="w-full text-left text-sm">
             <thead>
                <tr className="bg-white/5 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                   <th className="p-4 font-medium">Name</th>
                   <th className="p-4 font-medium">Platform/Type</th>
                   <th className="p-4 font-medium">Capacity</th>
                   <th className="p-4 font-medium">Status</th>
                   <th className="p-4 font-medium">Last Used</th>
                   <th className="p-4 font-medium text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {MOCK_ACCOUNTS.map(acc => (
                   <tr key={acc.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-4 font-medium text-white">{acc.name}</td>
                      <td className="p-4 text-gray-300">
                         <div className="flex items-center gap-2">
                            <span className="text-xs bg-white/5 px-1.5 py-0.5 rounded border border-white/10">{acc.platform}</span>
                            <span className="text-xs text-gray-500">{acc.type}</span>
                         </div>
                      </td>
                      <td className="p-4 text-gray-400 text-xs">{acc.capacity}</td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            acc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            acc.status === 'RateLimited' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                            'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            {acc.status}
                         </span>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">{acc.lastUsed}</td>
                      <td className="p-4 text-right">
                         <button className="text-gray-500 hover:text-white p-1"><MoreVertical className="w-4 h-4" /></button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>

       <Modal 
          isOpen={showCreateAccountModal} 
          onClose={() => setShowCreateAccountModal(false)} 
          title="Create Account"
          footer={
             <>
               <Button variant="ghost" onClick={() => setShowCreateAccountModal(false)}>Cancel</Button>
               <Button variant="primary" className="bg-emerald-500 hover:bg-emerald-400 text-black border-none">Next</Button>
             </>
          }
       >
          <div className="space-y-4">
             <div className="flex gap-4 border-b border-white/5 pb-4 mb-4">
                 <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm"><span className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-xs">1</span> Authorization Method</div>
                 <div className="flex items-center gap-2 text-gray-500 text-sm"><span className="w-5 h-5 rounded-full bg-white/10 text-gray-400 flex items-center justify-center text-xs">2</span> Account Details</div>
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Account Name</label>
                <input type="text" className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20" />
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Platform</label>
                <div className="flex gap-2">
                   {['Anthropic', 'OpenAI', 'Gemini'].map(p => (
                      <button key={p} className="flex-1 py-2 bg-[#0A0A0C] border border-nexus-border rounded-md text-xs hover:border-nexus-primary hover:text-white text-gray-400 transition-all">{p}</button>
                   ))}
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Add Method</label>
                <div className="flex gap-4">
                   <label className="flex items-center gap-2 text-sm text-gray-300"><input type="radio" name="method" defaultChecked /> OAuth</label>
                   <label className="flex items-center gap-2 text-sm text-gray-300"><input type="radio" name="method" /> Token (Long-lived)</label>
                </div>
             </div>
          </div>
       </Modal>
    </div>
  );

  const renderGroups = () => (
     <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Manage Groups</h2>
       </div>

       <div className="glass-panel p-2 rounded-xl border border-nexus-border bg-nexus-card flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
              <input type="text" placeholder="Search groups..." className="w-full bg-[#0A0A0C] border border-nexus-border rounded-lg pl-9 pr-4 py-2 text-sm text-white outline-none focus:border-white/20" />
          </div>
          <select className="bg-[#0A0A0C] border border-nexus-border text-gray-300 text-sm rounded-lg px-3 py-2 outline-none hover:border-gray-500 min-w-[120px]"><option>All Platforms</option></select>
          <Button variant="primary" className="h-9 px-4 text-xs bg-emerald-500 hover:bg-emerald-400 text-black border-none" onClick={() => setShowCreateGroupModal(true)}>
             <Plus className="w-4 h-4 mr-1" /> Create Group
          </Button>
       </div>

       <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
          <table className="w-full text-left text-sm">
             <thead>
                <tr className="bg-white/5 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                   <th className="p-4 font-medium">Name</th>
                   <th className="p-4 font-medium">Platform</th>
                   <th className="p-4 font-medium">Billing Type</th>
                   <th className="p-4 font-medium">Rate Multiplier</th>
                   <th className="p-4 font-medium">Type</th>
                   <th className="p-4 font-medium">Accounts</th>
                   <th className="p-4 font-medium">Status</th>
                   <th className="p-4 font-medium text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-white/5">
                {MOCK_GROUPS.map(grp => (
                   <tr key={grp.id} className="group hover:bg-white/5 transition-colors">
                      <td className="p-4 font-medium text-white">{grp.name}</td>
                      <td className="p-4"><span className="text-xs bg-white/5 px-2 py-0.5 rounded border border-white/10 text-gray-300">{grp.platform}</span></td>
                      <td className="p-4 text-gray-400 text-xs">{grp.billingType}</td>
                      <td className="p-4 text-gray-300 text-xs">{grp.rateMultiplier}</td>
                      <td className="p-4 text-xs text-gray-400">{grp.type}</td>
                      <td className="p-4 text-xs text-gray-500">{grp.accountsCount} accounts</td>
                      <td className="p-4"><span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">{grp.status}</span></td>
                      <td className="p-4 text-right">
                         <button className="text-gray-500 hover:text-white p-1"><MoreVertical className="w-4 h-4" /></button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
       
       <Modal 
          isOpen={showCreateGroupModal} 
          onClose={() => setShowCreateGroupModal(false)} 
          title="Create Group"
          footer={
             <>
               <Button variant="ghost" onClick={() => setShowCreateGroupModal(false)}>Cancel</Button>
               <Button variant="primary" className="bg-emerald-500 hover:bg-emerald-400 text-black border-none">Create</Button>
             </>
          }
       >
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Name</label>
                <input type="text" className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20" />
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Description</label>
                <textarea className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20 h-20 resize-none"></textarea>
             </div>
             <div className="space-y-2">
                <label className="text-sm text-gray-400">Platform</label>
                <select className="w-full bg-[#0A0A0C] border border-nexus-border rounded-md px-3 py-2 text-white outline-none focus:border-white/20">
                   <option>Anthropic</option>
                   <option>OpenAI</option>
                </select>
             </div>
             <div className="flex items-center justify-between">
                <div className="text-sm text-gray-400">Exclusive Group</div>
                <div className="w-10 h-6 bg-white/10 rounded-full relative cursor-pointer"><div className="w-4 h-4 bg-gray-500 rounded-full absolute left-1 top-1"></div></div>
             </div>
          </div>
       </Modal>
     </div>
  );

  return (
    <div className="flex min-h-screen bg-[#050507] text-white font-sans selection:bg-purple-500/30">
      
      {/* Admin Sidebar */}
      <aside className={`
        fixed top-0 left-0 bottom-0 z-50 bg-[#0A0A0C] border-r border-nexus-border flex flex-col transition-all duration-300
        ${isSidebarCollapsed ? 'w-20' : 'w-64'}
      `}>
        {/* Admin Brand */}
        <div className={`h-16 flex items-center px-6 border-b border-white/5 ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}>
           <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-red-500" />
           </div>
           {!isSidebarCollapsed && (
              <div className="ml-3">
                 <h1 className="text-white font-bold tracking-tight">Nexus<span className="text-red-500">Admin</span></h1>
                 <p className="text-[10px] text-gray-500 uppercase tracking-wider">Internal Ops</p>
              </div>
           )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
           <SidebarItem id="overview" icon={LayoutDashboard} label="Dashboard" />
           <SidebarItem id="ops" icon={Server} label="Ops" />
           <div className="my-2 border-t border-white/5"></div>
           <SidebarItem id="users" icon={Users} label="Users" />
           <SidebarItem id="groups" icon={Layers} label="Groups" />
           <SidebarItem id="subscriptions" icon={CreditCard} label="Subscriptions" />
           <SidebarItem id="accounts" icon={Cloud} label="Accounts" />
           <SidebarItem id="proxies" icon={Globe} label="Proxies" />
           <div className="my-2 border-t border-white/5"></div>
           <SidebarItem id="redeem" icon={Gift} label="Redeem Codes" />
           <SidebarItem id="promo" icon={Tag} label="Promo Codes" />
           <SidebarItem id="usage" icon={BarChart2} label="Usage" />
           <div className="my-2 border-t border-white/5"></div>
           <SidebarItem id="audit" icon={FileText} label="Audit Logs" />
        </nav>

        {/* Collapse Toggle */}
        <button 
           onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
           className="h-12 border-t border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
        >
           {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronRight className="w-5 h-5 rotate-180" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${isSidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
         
         <header className="h-16 border-b border-nexus-border bg-[#0A0A0C]/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white capitalize flex items-center gap-2">
               {activeTab.replace('-', ' ')}
            </h2>
            <div className="flex items-center gap-4">
               <span className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-500 font-mono">
                  ADMIN MODE
               </span>
               <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                 <div className="text-right hidden sm:block">
                    <div className="text-xs font-medium text-white">{user.username}</div>
                    <div className="text-[10px] text-gray-500">{user.email}</div>
                 </div>
                 <img src={user.avatar} className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-500 to-orange-500 border border-white/10" alt={user.username} />
              </div>
            </div>
         </header>

         <main className="p-6 lg:p-8 max-w-[1600px] mx-auto w-full">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && (
                <div className="space-y-6 animate-fade-in">
                   <h2 className="text-2xl font-bold text-white mb-4">User Management</h2>
                   <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
                      <table className="w-full text-left text-sm">
                         <thead>
                            <tr className="bg-white/5 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                               <th className="p-4 font-medium">User</th>
                               <th className="p-4 font-medium">Plan</th>
                               <th className="p-4 font-medium">Status</th>
                               <th className="p-4 font-medium">Spend</th>
                               <th className="p-4 font-medium text-right">Actions</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                            {ADMIN_USERS.map((user) => (
                               <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                                  <td className="p-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white">{user.name.charAt(0)}</div>
                                        <div><div className="text-white font-medium">{user.name}</div><div className="text-xs text-gray-500">{user.email}</div></div>
                                     </div>
                                  </td>
                                  <td className="p-4"><span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-purple-500/10 text-purple-400 border-purple-500/20">{user.plan}</span></td>
                                  <td className="p-4"><span className="text-emerald-400 text-xs">{user.status}</span></td>
                                  <td className="p-4 text-white font-mono">{user.spend}</td>
                                  <td className="p-4 text-right"><button className="text-gray-500 hover:text-white p-1"><MoreVertical className="w-4 h-4" /></button></td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
            )}
            {activeTab === 'ops' && (
                <div className="space-y-6 animate-fade-in">
                   <h2 className="text-2xl font-bold text-white mb-4">System Operations</h2>
                   <div className="glass-panel p-6 rounded-xl border border-nexus-border bg-nexus-card">
                      <h3 className="text-white font-semibold mb-6 flex items-center gap-2"><HardDrive className="w-4 h-4 text-nexus-primary" /> Compute Usage</h3>
                      <div className="space-y-4">
                         {['US-East-1', 'EU-West-1'].map(region => (
                            <div key={region} className="space-y-2">
                               <div className="flex justify-between text-sm"><span className="text-gray-300">{region}</span><span className="text-gray-400 font-mono">82%</span></div>
                               <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-nexus-primary/80 rounded-full w-[82%]"></div></div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
            )}
            {activeTab === 'groups' && renderGroups()}
            {activeTab === 'subscriptions' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-bold text-white">Subscription Management</h2>
                    <div className="glass-panel rounded-xl border border-nexus-border bg-nexus-card overflow-hidden">
                       <table className="w-full text-left text-sm">
                          <thead>
                             <tr className="bg-white/5 border-b border-white/5 text-xs text-gray-500 uppercase tracking-wider">
                                <th className="p-4 font-medium">User</th>
                                <th className="p-4 font-medium">Group</th>
                                <th className="p-4 font-medium">Usage</th>
                                <th className="p-4 font-medium">Status</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {MOCK_SUBSCRIPTIONS.map(sub => (
                                <tr key={sub.id} className="group hover:bg-white/5 transition-colors">
                                   <td className="p-4 text-white font-medium">{sub.user}</td>
                                   <td className="p-4"><span className="bg-white/5 border border-white/10 px-2 py-1 rounded text-xs text-gray-300">{sub.group}</span></td>
                                   <td className="p-4 text-gray-300">{sub.usage}%</td>
                                   <td className="p-4"><span className="text-emerald-400 text-xs">{sub.status}</span></td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                </div>
            )}
            {activeTab === 'accounts' && renderAccounts()}
            {activeTab === 'proxies' && (
               <div className="glass-panel p-12 text-center text-gray-500 animate-fade-in">Proxies module pending implementation.</div>
            )}
            {activeTab === 'redeem' && renderRedeemCodes()}
            {activeTab === 'promo' && renderPromoCodes()}
            {activeTab === 'usage' && renderUsage()}
            {activeTab === 'audit' && renderOverview()} 
         </main>

      </div>
    </div>
  );
};