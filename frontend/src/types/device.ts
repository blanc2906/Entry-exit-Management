import { User } from './user';

export interface Device {
  _id: string;
  deviceMac: string;
  description?: string;
  isOnline?: boolean;
  lastSeen?: Date;
  createdAt: Date;
  updatedAt: Date;
  users: User[];
}

export interface DeviceFilters {
  page?: number;
  limit?: number;
  search?: string;
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