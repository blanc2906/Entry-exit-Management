// frontend/src/services/api.ts
import { User, CreateUserDto, AddFingerprintDto, AddCardNumberDto } from '../types/user';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

class ApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // User APIs - Matching backend endpoints exactly
  async getAllUsers(page = 1, limit = 100, search?: string): Promise<{
    users: User[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    
    return this.request<{
      users: User[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/users/findAll?${params}`);
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    return this.request<User>('/users/create-user', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async removeUser(userId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async requestAddFingerprint(userId: string, deviceId: string): Promise<void> {
    return this.request<void>('/users/request-add-fingerprint', {
      method: 'POST',
      body: JSON.stringify({ userId, deviceId }),
    });
  }

  async addFingerprint(data: AddFingerprintDto): Promise<User> {
    return this.request<User>('/users/add-fingerprint', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserFingerprint(userId: string): Promise<{ userId: string; templateData: string }> {
    return this.request<{ userId: string; templateData: string }>(`/users/${userId}/get-finger-data`);
  }

  async requestAddCardNumber(userId: string, deviceId: string): Promise<void> {
    return this.request<void>('/users/request-add-cardNumber', {
      method: 'POST',
      body: JSON.stringify({ userId, deviceId }),
    });
  }

  async addCardNumber(data: AddCardNumberDto): Promise<User> {
    return this.request<User>('/users/add-cardNumber', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Device APIs for user management
  async getAllDevices(page = 1, limit = 100, search?: string): Promise<{
    devices: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search })
    });
    
    return this.request<{
      devices: any[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/devices/findAll?${params}`);
  }

  async addUserToDevice(deviceId: string, userId: string): Promise<any> {
    return this.request<any>(`/devices/${deviceId}/users/${userId}`, {
      method: 'POST',
    });
  }

  async removeUserFromDevice(deviceId: string, userId: string): Promise<any> {
    return this.request<any>(`/devices/${deviceId}/users/${userId}`, {
      method: 'DELETE',
    });
  }

  async syncAllUsers(deviceId: string): Promise<any> {
    return this.request<any>(`/devices/${deviceId}/sync-all-users`, {
      method: 'POST',
    });
  }

  async deleteAllUsers(deviceId: string): Promise<any> {
    return this.request<any>(`/devices/${deviceId}/delete-all-users`, {
      method: 'POST',
    });
  }

  async getAllUserOfDevice(deviceId: string): Promise<{
    device: any;
    users: any[];
    totalUsers: number;
  }> {
    return this.request<{
      device: any;
      users: any[];
      totalUsers: number;
    }>(`/devices/${deviceId}/users`);
  }

  // History APIs
  async getAllHistory(
    page = 1,
    limit = 100,
    search?: string,
    deviceId?: string,
    userId?: string,
    startDate?: string,
    endDate?: string
  ): Promise<{
    histories: any[];
    total: number;
    page: number;
    totalPages: number;
    filters: any;
  }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(deviceId && { deviceId }),
      ...(userId && { userId }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate })
    });
    
    return this.request<{
      histories: any[];
      total: number;
      page: number;
      totalPages: number;
      filters: any;
    }>(`/history/findAll?${params}`);
  }
}

export const apiService = new ApiService();
export default apiService;