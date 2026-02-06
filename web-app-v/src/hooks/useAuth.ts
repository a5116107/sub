import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
  const {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    fetchCurrentUser,
    setUser,
    updateUser,
  } = useAuthStore();

  // Fetch current user on mount if token exists
  useEffect(() => {
    if (token && !user) {
      fetchCurrentUser();
    }
  }, [token, user, fetchCurrentUser]);

  return {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    setUser,
    updateUser,
  };
};

export const useRequireAuth = () => {
  const { isAuthenticated, isLoading } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    isReady: !isLoading,
  };
};

export const useRequireAdmin = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  return {
    isAuthenticated,
    isAdmin,
    isLoading,
    isAllowed: isAuthenticated && isAdmin,
    isReady: !isLoading,
  };
};
