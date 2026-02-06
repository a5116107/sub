import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Layouts
import { PublicLayout } from '../layouts/PublicLayout';
import { UserLayout } from '../layouts/UserLayout';
import { AdminLayout } from '../layouts/AdminLayout';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { OAuthCallbackPage } from '../pages/auth/OAuthCallbackPage';

// User Pages
import { DashboardPage } from '../pages/user/DashboardPage';
import { ApiKeysPage } from '../pages/user/ApiKeysPage';
import { UsagePage } from '../pages/user/UsagePage';
import { SubscriptionsPage } from '../pages/user/SubscriptionsPage';
import { RedeemPage } from '../pages/user/RedeemPage';
import { BillingPage } from '../pages/user/BillingPage';
import { ProfilePage } from '../pages/user/settings/ProfilePage';
import { SecurityPage } from '../pages/user/settings/SecurityPage';
import { TwoFactorPage } from '../pages/user/settings/TwoFactorPage';

// Admin Pages
import { AdminDashboardPage } from '../pages/admin/DashboardPage';
import { UsersPage as AdminUsersPage } from '../pages/admin/UsersPage';
import { GroupsPage as AdminGroupsPage } from '../pages/admin/GroupsPage';
import { AccountsPage as AdminAccountsPage } from '../pages/admin/AccountsPage';
import { SubscriptionsPage as AdminSubscriptionsPage } from '../pages/admin/SubscriptionsPage';
import { RedeemCodesPage as AdminRedeemCodesPage } from '../pages/admin/RedeemCodesPage';
import { PromoCodesPage as AdminPromoCodesPage } from '../pages/admin/PromoCodesPage';
import { ProxiesPage as AdminProxiesPage } from '../pages/admin/ProxiesPage';
import { UsagePage as AdminUsagePage } from '../pages/admin/UsagePage';
import { AnnouncementsPage as AdminAnnouncementsPage } from '../pages/admin/AnnouncementsPage';
import { SettingsPage as AdminSettingsPage } from '../pages/admin/SettingsPage';
import { ModelPricingPage as AdminModelPricingPage } from '../pages/admin/ModelPricingPage';
import { OpsPage as AdminOpsPage } from '../pages/admin/OpsPage';
import { DocsPage as AdminDocsPage } from '../pages/admin/DocsPage';
import { UserAttributesPage as AdminUserAttributesPage } from '../pages/admin/UserAttributesPage';
import { SystemPage as AdminSystemPage } from '../pages/admin/SystemPage';

// Protected Route Components
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00F0FF] border-t-transparent rounded-full animate-spin" />
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
      <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
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
