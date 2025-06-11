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
  check_in_auth_method?: string;
  check_out_auth_method?: string;
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

export interface RecentAttendanceRecord {
  user: {
    name: string;
    avatar?: string;
  };
  time: string;
  device: string;
  status: string;
  timestamp: string;
  type: 'check-in' | 'check-out';
}