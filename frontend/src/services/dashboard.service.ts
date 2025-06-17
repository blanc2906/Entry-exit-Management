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

interface AttendanceChartData {
  date: string;
  count: number;
}

interface RecentAttendance {
  id: string;
  userId: string;
  userName: string;
  deviceName: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
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

  async getAttendanceChartData(days: number = 7): Promise<AttendanceChartData[]> {
    try {
      const response = await axios.get<AttendanceChartData[]>(`${API_URL}/dashboard/attendance-chart?days=${days}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance chart data:', error);
      return [];
    }
  }

  async getRecentAttendance(limit: number = 10): Promise<RecentAttendance[]> {
    try {
      const response = await axios.get<RecentAttendance[]>(`${API_URL}/dashboard/recent-attendance?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
      return [];
    }
  }
}

export const dashboardService = new DashboardService(); 