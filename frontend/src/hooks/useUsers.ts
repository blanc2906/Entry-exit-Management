import { useState, useCallback } from 'react';
import { User, UserFilters } from '../types/user';
import { userService } from '../services/userService';
import { AxiosError } from 'axios';

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const handleError = (err: unknown) => {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? 0;
      const message = err.response?.data?.message || err.message;
      
      if (status === 401) {
        setError('Unauthorized. Please log in again.');
      } else if (status === 403) {
        setError('You do not have permission to access this resource.');
      } else if (status === 404) {
        setError('The requested resource was not found.');
      } else if (status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(`Error: ${message}`);
      }
    } else {
      setError('An unexpected error occurred. Please try again.');
    }
    console.error('Error details:', err);
  };

  const fetchUsers = useCallback(async (filters: UserFilters) => {
    try {
      setLoading(true);
      setError(null);
      const response = await userService.getUsers(filters);
      setUsers(response.items);
      setMeta({
        currentPage: response.meta.currentPage,
        totalPages: response.meta.totalPages,
        totalItems: response.meta.totalItems,
      });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      setError(null);
      await userService.deleteUser(userId);
      setUsers(prev => prev.filter(user => user._id !== userId));
    } catch (err) {
      handleError(err);
    }
  }, []);

  const createUser = useCallback(async (userData: { userId: string; name: string }) => {
    try {
      setError(null);
      const newUser = await userService.createUser(userData);
      setUsers(prev => [newUser, ...prev]);
      return newUser;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, []);

  return {
    users,
    loading,
    error,
    meta,
    fetchUsers,
    deleteUser,
    createUser,
  };
}; 