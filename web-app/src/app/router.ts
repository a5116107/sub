import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores'
import { ROUTES } from '~/shared/config/constants'

// Route definitions
const routes = [
  // Public routes
  {
    path: ROUTES.HOME,
    name: 'Home',
    component: () => import('~/pages/home/HomePage.vue'),
    meta: { public: true }
  },
  {
    path: ROUTES.LOGIN,
    name: 'Login',
    component: () => import('~/pages/auth/LoginPage.vue'),
    meta: { public: true, guest: true }
  },
  {
    path: ROUTES.REGISTER,
    name: 'Register',
    component: () => import('~/pages/auth/RegisterPage.vue'),
    meta: { public: true, guest: true }
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    name: 'ForgotPassword',
    component: () => import('~/pages/auth/ForgotPasswordPage.vue'),
    meta: { public: true, guest: true }
  },
  {
    path: ROUTES.RESET_PASSWORD,
    name: 'ResetPassword',
    component: () => import('~/pages/auth/ResetPasswordPage.vue'),
    meta: { public: true, guest: true }
  },
  {
    path: ROUTES.OAUTH_CALLBACK,
    name: 'OAuthCallback',
    component: () => import('~/pages/auth/OAuthCallbackPage.vue'),
    meta: { public: true }
  },

  // Public docs route
  {
    path: '/docs/:key?',
    name: 'Docs',
    component: () => import('~/pages/docs/DocsPage.vue'),
    meta: { public: true }
  },

  // Authenticated routes
  {
    path: '/',
    component: () => import('~/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('~/pages/dashboard/DashboardPage.vue'),
        meta: { title: 'Dashboard' }
      },
      {
        path: 'api-keys',
        name: 'ApiKeys',
        component: () => import('~/pages/api-keys/ApiKeysPage.vue'),
        meta: { title: 'API Keys' }
      },
      {
        path: 'usage',
        name: 'Usage',
        component: () => import('~/pages/usage/UsagePage.vue'),
        meta: { title: 'Usage' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('~/pages/profile/ProfilePage.vue'),
        meta: { title: 'Profile' }
      },
      {
        path: 'announcements',
        name: 'Announcements',
        component: () => import('~/pages/announcements/AnnouncementsPage.vue'),
        meta: { title: 'Announcements' }
      },
      {
        path: 'redeem',
        name: 'Redeem',
        component: () => import('~/pages/redeem/RedeemPage.vue'),
        meta: { title: 'Redeem' }
      },
      {
        path: 'payments',
        name: 'Payments',
        component: () => import('~/pages/payments/PaymentsPage.vue'),
        meta: { title: 'Payments' }
      }
    ]
  },

  // Admin routes
  {
    path: ROUTES.ADMIN.ROOT,
    component: () => import('~/layouts/AppLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('~/pages/admin/DashboardPage.vue'),
        meta: { title: 'Admin Dashboard' }
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('~/pages/admin/UsersPage.vue'),
        meta: { title: 'User Management' }
      },
      {
        path: 'groups',
        name: 'AdminGroups',
        component: () => import('~/pages/admin/GroupsPage.vue'),
        meta: { title: 'Group Management' }
      },
      {
        path: 'accounts',
        name: 'AdminAccounts',
        component: () => import('~/pages/admin/AccountsPage.vue'),
        meta: { title: 'Account Management' }
      },
      {
        path: 'ops',
        name: 'AdminOps',
        component: () => import('~/pages/admin/OpsPage.vue'),
        meta: { title: 'Operations' }
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('~/pages/admin/SettingsPage.vue'),
        meta: { title: 'Settings' }
      }
    ]
  },

  // 404
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('~/pages/error/NotFoundPage.vue'),
    meta: { public: true }
  }
]

// Create router
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// Navigation guards
router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  // 强制重新读取 token（解决热更新后 store 状态丢失问题）
  const token = localStorage.getItem('token')

  // 如果 store 没有 token 但 localStorage 有，同步到 store
  if (!authStore.token && token) {
    authStore.setToken(token)
  }

  const isAuthenticated = !!authStore.token || !!token

  console.log('[Router Guard]', to.path, { isAuthenticated, token: token?.slice(0, 20), storeToken: authStore.token?.slice(0, 20) })

  // Check if route requires authentication
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  // Check if route requires admin
  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ name: 'Dashboard' })
    return
  }

  // Check if route is for guests only (e.g., login page)
  if (to.meta.guest && isAuthenticated) {
    next({ name: 'Dashboard' })
    return
  }

  next()
})

export default router
