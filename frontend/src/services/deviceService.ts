import axios from 'axios';
import { Device, DeviceFilters } from '../types/device';
import { User } from '../types/user';

const API_URL = 'http://localhost:3000';

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
    const response = await axios.get(`${API_URL}/devices/findAll`, {
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
    const response = await axios.get(`${API_URL}/devices/${deviceId}`);
    return response.data;
  },

  async createDevice(deviceData: Partial<Device>) {
    const response = await axios.post(`${API_URL}/devices/create-device`, deviceData);
    return response.data;
  },

  async updateDevice(deviceId: string, deviceData: Partial<Device>) {
    const response = await axios.patch(`${API_URL}/devices/${deviceId}`, deviceData);
    return response.data;
  },

  async deleteDevice(deviceId: string) {
    const response = await axios.delete(`${API_URL}/devices/${deviceId}`);
    return response.data;
  },

  async getDeviceUsers(deviceId: string): Promise<DeviceUsersResponse> {
    const response = await axios.get(`${API_URL}/devices/${deviceId}/users`);
    return response.data;
  },

  async removeUserFromDevice(deviceId: string, userId: string) {
    const response = await axios.delete(`${API_URL}/devices/${deviceId}/users/${userId}`);
    return response.data;
  },
}; 