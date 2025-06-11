import axios from 'axios';
import { API_URL } from '../config';

export interface HistoryFilter {
  page?: number;
  startDate?: string;
  endDate?: string;
}

export interface History {
  _id: string;
  date: string;
  time_in: string;
  time_out: string | null;
  user: {
    _id: string;
    name: string;
    userId: string;
    email: string;
  };
  check_in_device: {
    _id: string;
    deviceMac: string;
    description: string;
  };
  check_out_device?: {
    _id: string;
    deviceMac: string;
    description: string;
  };
  check_in_auth_method: 'fingerprint' | 'card';
  check_out_auth_method?: 'fingerprint' | 'card';
}

interface HistoryResponse {
  histories: History[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    startDate?: string;
    endDate?: string;
  };
}

class HistoryService {
  async getHistories(filter: HistoryFilter = {}): Promise<HistoryResponse> {
    try {
      console.log('Sending request to:', `${API_URL}/history/findAll`);
      console.log('With params:', filter);
      
      const response = await axios.get<HistoryResponse>(`${API_URL}/history/findAll`, {
        params: filter
      });
      
      console.log('Response received:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching histories:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
      return {
        histories: [],
        total: 0,
        page: 1,
        totalPages: 0,
        filters: {}
      };
    }
  }

  async getRecentAttendance(limit: number = 5): Promise<History[]> {
    try {
      const response = await axios.get<History[]>(`${API_URL}/history/recent`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
      return [];
    }
  }
}

export const historyService = new HistoryService(); 