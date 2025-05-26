// frontend/src/services/api.ts
import { User, CreateUserDto, AddFingerprintDto, AddCardNumberDto } from '../types/user';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

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
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // User APIs
  async createUser(userData: CreateUserDto): Promise<User> {
    return this.request<User>('/users/create-user', {
      method: 'POST',
      body: JSON.stringify(userData),
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

  async requestAddCardNumber(userId: string): Promise<void> {
    return this.request<void>('/users/request-add-cardNumber', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  }

  async addCardNumber(data: AddCardNumberDto): Promise<User> {
    return this.request<User>('/users/add-cardNumber', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Device APIs for user management
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
}

export const apiService = new ApiService();
export default apiService;