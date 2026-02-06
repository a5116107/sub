import React from 'react';

export enum AppView {
  LANDING = 'LANDING',
  DASHBOARD = 'DASHBOARD',
  ADMIN = 'ADMIN',
  LOGIN = 'LOGIN',
  REGISTER = 'REGISTER'
}

export interface UserSession {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
}

export interface ChartData {
  time: string;
  requests: number;
  latency: number;
  p95?: number;
  p99?: number;
}

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsed: string;
  created: string;
  status: 'active' | 'revoked' | 'expiring';
  usage: number;
  limit: number;
}

export interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
  colSpan: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  model: string;
  requestId: string;
  status: number;
  latency: string;
  cost: string;
}

export interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Owner' | 'Admin' | 'Developer';
  avatar: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
  isLocked: boolean;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  category: 'AI' | 'Edge' | 'Security' | 'DevOps';
  progress?: number;
  imageGradient: string;
  lessons?: Lesson[];
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: 'Pro' | 'Enterprise' | 'Free';
  spend: string;
  status: 'Active' | 'Suspended';
  lastActive: string;
}

export interface SystemRegion {
  id: string;
  name: string;
  status: 'Operational' | 'Degraded' | 'Maintenance';
  latency: number;
  load: number;
}

export interface AdminAuditLog {
  id: string;
  action: string;
  admin: string;
  target: string;
  timestamp: string;
  status: 'Success' | 'Failed';
  details: string;
}

export interface Subscription {
  id: string;
  user: string;
  group: string;
  usage: number; // percentage
  limit: string; // e.g. "1M Tokens"
  expires: string;
  status: 'Active' | 'Expired' | 'Suspended';
}

export interface RedeemCode {
  id: string;
  code: string;
  type: 'Balance' | 'Subscription';
  value: string;
  status: 'Available' | 'Used' | 'Revoked';
  usedBy?: string;
  usedAt?: string;
}

export interface PromoCode {
  id: string;
  code: string;
  bonusAmount: string;
  usage: string; // "5 / 100" or "Unlimited"
  status: 'Active' | 'Expired' | 'Disabled';
  expiresAt?: string;
  createdAt: string;
}

export interface PlatformAccount {
  id: string;
  name: string;
  platform: 'Anthropic' | 'OpenAI' | 'Gemini';
  type: string;
  capacity?: string; // e.g. "Tier 4"
  status: 'Active' | 'Disabled' | 'RateLimited' | 'Expired';
  lastUsed?: string;
  expiresAt?: string;
}

export interface ApiGroup {
  id: string;
  name: string;
  platform: string;
  billingType: 'Standard' | 'Subscription';
  rateMultiplier: string;
  type: 'Public' | 'Exclusive';
  accountsCount: number;
  status: 'Active' | 'Disabled';
}

export interface UsageStat {
  id: string;
  user: string;
  apiKey: string;
  model: string;
  tokens: number;
  cost: string;
  duration: string;
  time: string;
}