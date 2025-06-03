import axios from 'axios';
import { Device, DeviceFilters } from '../types/device';
import { User } from '../types/user';
import { API_URL } from '../config';

interface DeviceResponse {
  data: any;
  status: number;
}

const deviceApi = axios.create({
  baseURL: `${API_URL}/devices`,
});

interface DeviceUsersResponse {
  device: {
    _id: string;
    deviceMac: string;
    description: string;
  };
  users: (User & { fingerId: number })[];
  totalUsers: number;
}

export const deviceService = {
  async getDevices(filters: DeviceFilters) {
    const { page = 1, limit = 10, search, status } = filters;
    const response = await deviceApi.get('/findAll', {
      params: { page, limit, search, status },
    });
    return {
      items: response.data.devices || [],
      meta: {
        currentPage: response.data.page || 1,
        totalPages: response.data.totalPages || 1,
        totalItems: response.data.total || 0,
        itemCount: response.data.devices?.length || 0,
        itemsPerPage: limit,
      },
    };
  },

  async getDevice(deviceId: string) {
    const response = await deviceApi.get(`/${deviceId}`);
    return response.data;
  },

  async createDevice(deviceData: Partial<Device>) {
    const response = await deviceApi.post('/create-device', deviceData);
    return response.data;
  },

  async updateDevice(deviceId: string, deviceData: Partial<Device>) {
    const response = await deviceApi.patch(`/${deviceId}`, deviceData);
    return response.data;
  },

  async deleteDevice(deviceId: string) {
    const response = await deviceApi.delete(`/${deviceId}`);
    return response.data;
  },

  async getDeviceUsers(deviceId: string): Promise<DeviceUsersResponse> {
    const response = await deviceApi.get(`/${deviceId}/users`);
    return response.data;
  },

  async removeUserFromDevice(deviceId: string, userId: string): Promise<DeviceResponse> {
    const response = await deviceApi.delete(`/${deviceId}/users/${userId}`);
    return response;
  },

  getAllUsersNotInDevice: async (deviceId: string): Promise<{ data: User[] }> => {
    return deviceApi.get(`/${deviceId}/users-not-in-device`);
  },

  addUserToDevice: async (deviceId: string, userId: string): Promise<DeviceResponse> => {
    return deviceApi.post(`/${deviceId}/users/${userId}`);
  },

  getAllDevices: async (page: number = 1, limit: number = 10, search?: string): Promise<DeviceResponse> => {
    return deviceApi.get('/findAll', {
      params: {
        page,
        limit,
        search,
      },
    });
  },

  getAllUsersOfDevice: async (deviceId: string): Promise<{ data: User[] }> => {
    return deviceApi.get(`/${deviceId}/users`);
  },

  syncAllUsers: async (deviceId: string): Promise<DeviceResponse> => {
    return deviceApi.post(`/${deviceId}/sync-all-users`);
  },

  deleteAllUsers: async (deviceId: string): Promise<DeviceResponse> => {
    return deviceApi.post(`/${deviceId}/delete-all-users`);
  },

  updateDevice: async (deviceId: string, data: any): Promise<DeviceResponse> => {
    return deviceApi.patch(`/${deviceId}`, data);
  },
}; 