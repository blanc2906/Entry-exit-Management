import React from 'react';
import StatsCard from '../../components/StatsCard';
import AttendanceChart from '../../components/AttendanceChart';
import RecentActivity from '../../components/RecentActivity';
import QuickActions from '../../components/QuickActions';

const DashboardPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Employees" value="150" />
        <StatsCard title="Present Today" value="142" />
        <StatsCard title="Absent Today" value="8" />
        <StatsCard title="Late Today" value="5" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceChart />
        <RecentActivity />
      </div>
      <div className="mt-6">
        <QuickActions />
      </div>
    </div>
  );
};

export default DashboardPage; 