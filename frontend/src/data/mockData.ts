import { User, Device, AttendanceRecord, DashboardMetric, ChartData } from '../types';

export const users: User[] = [
  { id: '1', name: 'John Doe', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=96' },
  { id: '2', name: 'Jane Smith', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=96' },
  { id: '3', name: 'Bob Johnson', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=96' },
  { id: '4', name: 'Alice Williams', avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=96' },
  { id: '5', name: 'David Brown', avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=96' },
];

export const devices: Device[] = [
  { id: '1', name: 'Device A' },
  { id: '2', name: 'Device B' },
  { id: '3', name: 'Device C' },
];

export const recentAttendance: AttendanceRecord[] = [
  { 
    id: '1', 
    userId: '1', 
    user: users[0], 
    deviceId: '1', 
    device: devices[0], 
    timestamp: '2025-06-15T08:30:00', 
    status: 'check-in' 
  },
  { 
    id: '2', 
    userId: '2', 
    user: users[1], 
    deviceId: '2', 
    device: devices[1], 
    timestamp: '2025-06-15T08:35:00', 
    status: 'check-in' 
  },
  { 
    id: '3', 
    userId: '3', 
    user: users[2], 
    deviceId: '1', 
    device: devices[0], 
    timestamp: '2025-06-15T08:40:00', 
    status: 'check-in' 
  },
  { 
    id: '4', 
    userId: '4', 
    user: users[3], 
    deviceId: '3', 
    device: devices[2], 
    timestamp: '2025-06-15T08:45:00', 
    status: 'check-in' 
  },
  { 
    id: '5', 
    userId: '5', 
    user: users[4], 
    deviceId: '2', 
    device: devices[1], 
    timestamp: '2025-06-15T08:50:00', 
    status: 'check-in' 
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  {
    title: 'Total Users',
    value: 120,
    icon: 'users',
    change: { value: 12, trend: 'up' }
  },
  {
    title: 'Total Devices',
    value: 15,
    icon: 'cpu',
    change: { value: 2, trend: 'up' }
  },
  {
    title: "Today's Attendance",
    value: 89,
    icon: 'calendar-check',
    change: { value: 5, trend: 'up' }
  },
];

export const attendanceChartData: ChartData = {
  labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  datasets: [
    {
      label: 'Attendance',
      data: [75, 82, 90, 85, 89, 55, 40],
      borderColor: 'rgb(79, 70, 229)',
      backgroundColor: 'rgba(79, 70, 229, 0.2)',
    },
  ],
};