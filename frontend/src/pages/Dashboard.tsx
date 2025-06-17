import React, { useEffect, useState } from 'react';
import Overview from '../components/dashboard/Overview';
import AttendanceChart from '../components/dashboard/AttendanceChart';
import RecentAttendance from '../components/dashboard/RecentAttendance';
import { useRecentActivity } from '../hooks/useRecentActivity';
import { AttendanceRecord, ChartData } from '../types';
import { useRecentAttendanceStore } from '../store/recentAttendanceStore';
import { initActivitySocket, subscribeActivity } from '../utils/activitySocket';
import { dashboardService } from '../services/dashboard.service';
import { DashboardMetric } from '../types';

const Dashboard: React.FC = () => {
  const { records, setRecords } = useRecentAttendanceStore();
  const [metrics, setMetrics] = useState<DashboardMetric[]>();
  const [attendanceChartData, setAttendanceChartData] = useState<ChartData>({
    labels: [],
    datasets: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [stats, chartData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getAttendanceChartData()
        ]);

        setMetrics([
          {
            title: 'Tổng Số Người Dùng',
            value: stats.totalUsers,
            icon: 'users',
            change: { value: stats.userGrowthRate, trend: stats.userGrowthRate >= 0 ? 'up' : 'down' }
          },
          {
            title: 'Tổng Số Thiết Bị',
            value: stats.totalDevices,
            icon: 'cpu',
            change: { value: stats.deviceGrowthRate, trend: stats.deviceGrowthRate >= 0 ? 'up' : 'down' }
          }
        ]);

        // Transform the chart data into the required format
        setAttendanceChartData({
          labels: chartData.map(item => item.date),
          datasets: [{
            label: 'Số lượng chấm công',
            data: chartData.map(item => item.count),
            borderColor: 'rgb(75, 192, 192)',
            backgroundColor: 'rgba(75, 192, 192, 0.2)'
          }]
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    initActivitySocket();
    const unsubscribe = subscribeActivity((activities: any[]) => {
      setRecords(activities);
    });
    return unsubscribe;
  }, [setRecords]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tổng Quan</h1>
        <p className="text-gray-500 mt-1">Chào mừng trở lại, theo dõi dữ liệu chấm công</p>
      </div>
      
      <Overview metrics={metrics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Biểu Đồ Chấm Công (7 ngày gần nhất)</h2>
          </div>
          <div className="p-6">
            <AttendanceChart data={attendanceChartData} />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Chấm Công Gần Đây</h2>
        </div>
        <RecentAttendance records={records} />
      </div>
    </div>
  );
};

export default Dashboard;