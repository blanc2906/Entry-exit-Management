export interface User {
  id: string;
  name: string;
  avatar?: string;
}

export interface Device {
  id: string;
  name: string;
  mac: string;
  description: string;
  userCount: number;
  status: 'online' | 'offline';
  created: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  user: User;
  deviceId: string;
  device: Device;
  timestamp: string;
  status: 'check-in' | 'check-out';
}

export interface DashboardMetric {
  title: string;
  value: number | string;
  icon: string;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
  }[];
}