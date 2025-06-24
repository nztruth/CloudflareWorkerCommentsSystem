import { useState, useEffect } from 'react';
import { useQuery } from 'react-query';
import { apiClient } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('authToken')
  );

  const { data: user, isLoading, error } = useQuery<User>(
    ['user'],
    async () => {
      if (!token) throw new Error('No token');
      const response = await apiClient.get('/user');
      return response.data.data;
    },
    {
      enabled: !!token,
      retry: false,
      onError: () => {
        // Clear invalid token
        localStorage.removeItem('authToken');
        setToken(null);
      }
    }
  );

  const login = (newToken: string) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
  };

  return {
    user,
    loading: isLoading,
    token,
    login,
    logout,
    isAuthenticated: !!token && !!user
  };
}