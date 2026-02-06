import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types';
import { authApi } from '../api/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string, code?: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    invite_code?: string;
    promo_code?: string;
    verify_code?: string;
  }) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  updateUser: (data: Partial<User>) => void;
  clearError: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      isLoading: false,
      error: null,

      login: async (email, password, code) => {
        set({ isLoading: true, error: null });
        try {
          const response = code
            ? await authApi.loginWith2FA({ email, password, code })
            : await authApi.login({ email, password });

          const { token, user } = response;
          localStorage.setItem('access_token', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isAdmin: user.role === 'admin',
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
          });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(data);
          const { token, user } = response;
          localStorage.setItem('access_token', token);

          set({
            user,
            token,
            isAuthenticated: true,
            isAdmin: user.role === 'admin',
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
          });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAdmin: false,
          error: null,
        });
      },

      setUser: (user) => {
        set({
          user,
          isAdmin: user.role === 'admin',
        });
      },

      updateUser: (data) => {
        const currentUser = get().user;
        if (currentUser) {
          const updatedUser = { ...currentUser, ...data };
          set({
            user: updatedUser,
            isAdmin: updatedUser.role === 'admin',
          });
        }
      },

      clearError: () => set({ error: null }),

      fetchCurrentUser: async () => {
        try {
          const user = await authApi.getMe();
          set({
            user,
            isAuthenticated: true,
            isAdmin: user.role === 'admin',
          });
        } catch {
          localStorage.removeItem('access_token');
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isAdmin: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);
