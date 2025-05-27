import { User } from './user';

export interface Device {
  _id: string;
  deviceMac: string;
  description: string;
  isOnline: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt?: Date;
  users: string[];
}

export interface DeviceFilters {
  search?: string;
  page: number;
  limit: number;
  status?: 'online' | 'offline';
}

export interface DevicesResponse {
  items: Device[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
} 