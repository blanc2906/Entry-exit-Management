import React, { useState } from 'react';
import { Calendar, User, Cpu, Download, Search } from 'lucide-react';

interface DateRange {
  from: string;
  to: string;
}

interface Filters {
  dateRange: DateRange;
  userId: string;
  deviceId: string;
}

interface AttendanceRecord {
  date: string;
  user: string;
  timeIn: string;
  timeOut: string | null;
  device: string;
  status: 'complete' | 'incomplete';
}

const AttendancePage: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    dateRange: {
      from: '2024-01-15',
      to: '2024-01-15',
    },
    userId: '',
    deviceId: '',
  });

  // Mock data for demonstration
  const attendanceRecords: AttendanceRecord[] = [
    {
      date: '2024-01-15',
      user: 'John Doe',
      timeIn: '08:30',
      timeOut: '17:30',
      device: 'Dev A',
      status: 'complete',
    },
    {
      date: '2024-01-15',
      user: 'Jane S.',
      timeIn: '08:35',
      timeOut: '17:25',
      device: 'Dev B',
      status: 'complete',
    },
    {
      date: '2024-01-15',
      user: 'Bob J.',
      timeIn: '09:00',
      timeOut: null,
      device: 'Dev A',
      status: 'incomplete',
    },
  ];

  const handleExport = () => {
    // Implementation for export functionality
    console.log('Exporting attendance data...');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Attendance History</h1>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Download size={18} className="mr-2" />
          Export Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Calendar size={16} className="mr-2" />
              Date Range
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, from: e.target.value }
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, to: e.target.value }
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* User Filter */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <User size={16} className="mr-2" />
              User
            </label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Users</option>
              <option value="1">John Doe</option>
              <option value="2">Jane Smith</option>
              <option value="3">Bob Johnson</option>
            </select>
          </div>

          {/* Device Filter */}
          <div className="space-y-2">
            <label className="flex items-center text-sm font-medium text-gray-700">
              <Cpu size={16} className="mr-2" />
              Device
            </label>
            <select
              value={filters.deviceId}
              onChange={(e) => setFilters({ ...filters, deviceId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Devices</option>
              <option value="1">Dev A</option>
              <option value="2">Dev B</option>
            </select>
          </div>
        </div>

        {/* Search and Reset */}
        <div className="flex justify-end space-x-3 mt-4">
          <button
            onClick={() => setFilters({
              dateRange: { from: '', to: '' },
              userId: '',
              deviceId: '',
            })}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Reset Filters
          </button>
          <button
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Search size={18} className="mr-2" />
            Search
          </button>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time In
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time Out
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {attendanceRecords.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.user}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.timeIn}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.timeOut || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.device}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      record.status === 'complete'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {record.status === 'complete' ? 'Complete' : 'Incomplete'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;