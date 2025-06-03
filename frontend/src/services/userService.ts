import axios from 'axios';
import { User, UserFilters } from '../types/user';

const API_URL = 'http://localhost:3000'; // Removed /api since it might not be needed

export const userService = {
  async getUsers(filters: UserFilters) {
    const { page = 1, limit = 10, search } = filters;
    const response = await axios.get(`${API_URL}/users/findAll`, {
      params: { page, limit, search },
    });
    return {
      items: response.data.users || [],
      meta: {
        currentPage: response.data.page || 1,
        totalPages: response.data.totalPages || 1,
        totalItems: response.data.total || 0,
        itemCount: response.data.users?.length || 0,
        itemsPerPage: limit,
      },
    };
  },

  async createUser(userData: { userId: string; name: string }) {
    const response = await axios.post(`${API_URL}/users/create-user`, {
      ...userData,
      createdAt: new Date(),
    });
    return response.data;
  },

  async deleteUser(userId: string) {
    const response = await axios.delete(`${API_URL}/users/${userId}`);
    return response.data;
  },

  async deleteAllUser() {
    const response = await axios.delete(`${API_URL}/users/delete-all-users`);
    return response.data;
  },

  updateUser: async (userId: string, userData: Partial<User>): Promise<User> => {
    const { data } = await axios.patch<User>(`${API_URL}/users/${userId}`, userData);
    return data;
  },

  async requestAddFingerprint(userId: string, deviceId: string) {
    const response = await axios.post(`${API_URL}/users/request-add-fingerprint`, {
      userId,
      deviceId,
    });
    return response.data;
  },

  async requestAddCardNumber(userId: string, deviceId: string) {
    const response = await axios.post(`${API_URL}/users/request-add-cardNumber`, {
      userId,
      deviceId,
    });
    return response.data;
  },

  // Thêm các methods khác khi cần
};