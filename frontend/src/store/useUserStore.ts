// frontend/src/store/useUserStore.ts
import { create } from 'zustand';
import { User, CreateUserDto, AddFingerprintDto, AddCardNumberDto } from '../types/user';
import { apiService } from '../services/api';

interface UserStore {
  users: User[];
  selectedUser: User | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setUsers: (users: User[]) => void;
  setSelectedUser: (user: User | null) => void;
  createUser: (userData: CreateUserDto) => Promise<void>;
  requestAddFingerprint: (userId: string, deviceId: string) => Promise<void>;
  addFingerprint: (data: AddFingerprintDto) => Promise<void>;
  getUserFingerprint: (userId: string) => Promise<{ userId: string; templateData: string }>;
  requestAddCardNumber: (userId: string) => Promise<void>;
  addCardNumber: (data: AddCardNumberDto) => Promise<void>;
  addUserToDevice: (deviceId: string, userId: string) => Promise<void>;
  removeUserFromDevice: (deviceId: string, userId: string) => Promise<void>;
  syncAllUsers: (deviceId: string) => Promise<void>;
  deleteAllUsers: (deviceId: string) => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  selectedUser: null,
  loading: false,
  error: null,

  setUsers: (users) => set({ users }),
  
  setSelectedUser: (user) => set({ selectedUser: user }),

  createUser: async (userData) => {
    set({ loading: true, error: null });
    try {
      const newUser = await apiService.createUser(userData);
      set((state) => ({
        users: [...state.users, newUser],
        loading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create user',
        loading: false 
      });
      throw error;
    }
  },

  requestAddFingerprint: async (userId, deviceId) => {
    set({ loading: true, error: null });
    try {
      await apiService.requestAddFingerprint(userId, deviceId);
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to request fingerprint',
        loading: false 
      });
      throw error;
    }
  },

  addFingerprint: async (data) => {
    set({ loading: true, error: null });
    try {
      const updatedUser = await apiService.addFingerprint(data);
      set((state) => ({
        users: state.users.map(user => 
          user._id === updatedUser._id ? updatedUser : user
        ),
        selectedUser: state.selectedUser?._id === updatedUser._id ? updatedUser : state.selectedUser,
        loading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add fingerprint',
        loading: false 
      });
      throw error;
    }
  },

  getUserFingerprint: async (userId) => {
    set({ loading: true, error: null });
    try {
      const result = await apiService.getUserFingerprint(userId);
      set({ loading: false });
      return result;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to get fingerprint',
        loading: false 
      });
      throw error;
    }
  },

  requestAddCardNumber: async (userId) => {
    set({ loading: true, error: null });
    try {
      await apiService.requestAddCardNumber(userId);
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to request card number',
        loading: false 
      });
      throw error;
    }
  },

  addCardNumber: async (data) => {
    set({ loading: true, error: null });
    try {
      const updatedUser = await apiService.addCardNumber(data);
      set((state) => ({
        users: state.users.map(user => 
          user._id === updatedUser._id ? updatedUser : user
        ),
        selectedUser: state.selectedUser?._id === updatedUser._id ? updatedUser : state.selectedUser,
        loading: false,
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add card number',
        loading: false 
      });
      throw error;
    }
  },

  addUserToDevice: async (deviceId, userId) => {
    set({ loading: true, error: null });
    try {
      await apiService.addUserToDevice(deviceId, userId);
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to add user to device',
        loading: false 
      });
      throw error;
    }
  },

  removeUserFromDevice: async (deviceId, userId) => {
    set({ loading: true, error: null });
    try {
      await apiService.removeUserFromDevice(deviceId, userId);
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to remove user from device',
        loading: false 
      });
      throw error;
    }
  },

  syncAllUsers: async (deviceId) => {
    set({ loading: true, error: null });
    try {
      await apiService.syncAllUsers(deviceId);
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to sync users',
        loading: false 
      });
      throw error;
    }
  },

  deleteAllUsers: async (deviceId) => {
    set({ loading: true, error: null });
    try {
      await apiService.deleteAllUsers(deviceId);
      set({ loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete all users',
        loading: false 
      });
      throw error;
    }
  },

  setLoading: (loading) => set({ loading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null }),
}));