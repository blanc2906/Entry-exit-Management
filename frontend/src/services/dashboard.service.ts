import axios from 'axios';
import { API_URL } from '../config';

interface DashboardStats {
  totalUsers: number;
  totalDevices: number;
  todayAttendance: number;
  userGrowthRate: number;
  deviceGrowthRate: number;
  attendanceGrowthRate: number;
}

class DashboardService {
  async getStats(): Promise<DashboardStats> {
    try {
      const response = await axios.get<DashboardStats>(`${API_URL}/dashboard/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return {
        totalUsers: 0,
        totalDevices: 0,
        todayAttendance: 0,
        userGrowthRate: 0,
        deviceGrowthRate: 0,
        attendanceGrowthRate: 0
      };
    }
  }
}

export const dashboardService = new DashboardService(); 