/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { UserLayout } from '../layouts/UserLayout';
import { AdminLayout } from '../layouts/AdminLayout';

type LazyPageModule = Record<string, unknown>;

function isLazyPageComponent(value: unknown): value is React.ComponentType<unknown> {
  return typeof value === 'function' || (typeof value === 'object' && value !== null);
}

const lazyPage = (importer: () => Promise<LazyPageModule>, exportName: string) =>
  React.lazy(async () => {
    const module = await importer();

    const component = module[exportName];
    if (!isLazyPageComponent(component)) {
      throw new Error(`Lazy page export "${exportName}" is missing or invalid.`);
    }

    return { default: component };
  });

// Public Pages
const LandingPage = lazyPage(() => import('../pages/public/LandingPage'), 'LandingPage');

// Auth Pages
const LoginPage = lazyPage(() => import('../pages/auth/LoginPage'), 'LoginPage');
const RegisterPage = lazyPage(() => import('../pages/auth/RegisterPage'), 'RegisterPage');
const ForgotPasswordPage = lazyPage(() => import('../pages/auth/ForgotPasswordPage'), 'ForgotPasswordPage');
const OAuthCallbackPage = lazyPage(() => import('../pages/auth/OAuthCallbackPage'), 'OAuthCallbackPage');

// User Pages
const DashboardPage = lazyPage(() => import('../pages/user/DashboardPage'), 'DashboardPage');
const ApiKeysPage = lazyPage(() => import('../pages/user/ApiKeysPage'), 'ApiKeysPage');
const UsagePage = lazyPage(() => import('../pages/user/UsagePage'), 'UsagePage');
const SubscriptionsPage = lazyPage(() => import('../pages/user/SubscriptionsPage'), 'SubscriptionsPage');
const RedeemPage = lazyPage(() => import('../pages/user/RedeemPage'), 'RedeemPage');
const BillingPage = lazyPage(() => import('../pages/user/BillingPage'), 'BillingPage');
const DocsPage = lazyPage(() => import('../pages/user/DocsPage'), 'DocsPage');
const ProfilePage = lazyPage(() => import('../pages/user/settings/ProfilePage'), 'ProfilePage');
const SecurityPage = lazyPage(() => import('../pages/user/settings/SecurityPage'), 'SecurityPage');
const TwoFactorPage = lazyPage(() => import('../pages/user/settings/TwoFactorPage'), 'TwoFactorPage');

// Admin Pages
const AdminDashboardPage = lazyPage(() => import('../pages/admin/DashboardPage'), 'AdminDashboardPage');
const AdminUsersPage = lazyPage(() => import('../pages/admin/UsersPage'), 'UsersPage');
const AdminGroupsPage = lazyPage(() => import('../pages/admin/GroupsPage'), 'GroupsPage');
const AdminAccountsPage = lazyPage(() => import('../pages/admin/AccountsPage'), 'AccountsPage');
const AdminSubscriptionsPage = lazyPage(() => import('../pages/admin/SubscriptionsPage'), 'SubscriptionsPage');
const AdminRedeemCodesPage = lazyPage(() => import('../pages/admin/RedeemCodesPage'), 'RedeemCodesPage');
const AdminPromoCodesPage = lazyPage(() => import('../pages/admin/PromoCodesPage'), 'PromoCodesPage');
const AdminProxiesPage = lazyPage(() => import('../pages/admin/ProxiesPage'), 'ProxiesPage');
const AdminUsagePage = lazyPage(() => import('../pages/admin/UsagePage'), 'UsagePage');
const AdminAnnouncementsPage = lazyPage(() => import('../pages/admin/AnnouncementsPage'), 'AnnouncementsPage');
const AdminSettingsPage = lazyPage(() => import('../pages/admin/SettingsPage'), 'SettingsPage');
const AdminModelPricingPage = lazyPage(() => import('../pages/admin/ModelPricingPage'), 'ModelPricingPage');
const AdminOpsPage = lazyPage(() => import('../pages/admin/OpsPage'), 'OpsPage');
const AdminDocsPage = lazyPage(() => import('../pages/admin/DocsPage'), 'DocsPage');
const AdminUserAttributesPage = lazyPage(() => import('../pages/admin/UserAttributesPage'), 'UserAttributesPage');
const AdminSystemPage = lazyPage(() => import('../pages/admin/SystemPage'), 'SystemPage');

// Protected Route Components
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const AdminRoute: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
};

const PublicRoute: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
};


export const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
      {
        element: <PublicRoute />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
          {
            path: 'forgot-password',
            element: <ForgotPasswordPage />,
          },
        ],
      },
      {
        path: 'oauth/callback',
        element: <OAuthCallbackPage />,
      },
      {
        path: 'auth/linuxdo/callback',
        element: <OAuthCallbackPage />,
      },
    ],
  },
  {
    path: '/app',
    element: <ProtectedRoute />,
    children: [
      {
        element: <UserLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/app/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'api-keys',
            element: <ApiKeysPage />,
          },
          {
            path: 'usage',
            element: <UsagePage />,
          },
          {
            path: 'subscriptions',
            element: <SubscriptionsPage />,
          },
          {
            path: 'billing',
            element: <BillingPage />,
          },
          {
            path: 'redeem',
            element: <RedeemPage />,
          },
          {
            path: 'docs',
            element: <DocsPage />,
          },
          {
            path: 'settings',
            children: [
              {
                index: true,
                element: <Navigate to="/app/settings/profile" replace />,
              },
              {
                path: 'profile',
                element: <ProfilePage />,
              },
              {
                path: 'security',
                element: <SecurityPage />,
              },
              {
                path: '2fa',
                element: <TwoFactorPage />,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/admin',
    element: <AdminRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/admin/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <AdminDashboardPage />,
          },
          {
            path: 'users',
            element: <AdminUsersPage />,
          },
          {
            path: 'groups',
            element: <AdminGroupsPage />,
          },
          {
            path: 'accounts',
            element: <AdminAccountsPage />,
          },
          {
            path: 'subscriptions',
            element: <AdminSubscriptionsPage />,
          },
          {
            path: 'redeem-codes',
            element: <AdminRedeemCodesPage />,
          },
          {
            path: 'promo-codes',
            element: <AdminPromoCodesPage />,
          },
          {
            path: 'proxies',
            element: <AdminProxiesPage />,
          },
          {
            path: 'usage',
            element: <AdminUsagePage />,
          },
          {
            path: 'ops',
            element: <AdminOpsPage />,
          },
          {
            path: 'announcements',
            element: <AdminAnnouncementsPage />,
          },
          {
            path: 'settings',
            element: <AdminSettingsPage />,
          },
          {
            path: 'model-pricing',
            element: <AdminModelPricingPage />,
          },
          {
            path: 'docs',
            element: <AdminDocsPage />,
          },
          {
            path: 'user-attributes',
            element: <AdminUserAttributesPage />,
          },
          {
            path: 'system',
            element: <AdminSystemPage />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default router;
