import React from 'react';
import Overview from '../components/dashboard/Overview';
import AttendanceChart from '../components/dashboard/AttendanceChart';
import RecentAttendance from '../components/dashboard/RecentAttendance';
import { dashboardMetrics, attendanceChartData, recentAttendance } from '../data/mockData';

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
        <p className="text-gray-500 mt-1">Welcome back, monitor your attendance data</p>
      </div>
      
      <Overview metrics={dashboardMetrics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Attendance Chart (Last 7 days)</h2>
          </div>
          <div className="p-6">
            <AttendanceChart data={attendanceChartData} />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Recent Attendance</h2>
        </div>
        <RecentAttendance records={recentAttendance} />
      </div>
    </div>
  );
};

export default Dashboard;