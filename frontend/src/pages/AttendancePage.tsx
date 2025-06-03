import React, { useState, useEffect } from 'react';
import { historyService, History } from '../services/history.service';

interface Filters {
  dateRange: {
    from: string;
    to: string;
  };
  page: number;
}

const AttendancePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [histories, setHistories] = useState<History[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    dateRange: {
      from: '',
      to: ''
    },
    page: 1
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Only include date filters if both dates are selected
      const params: any = {
        page: filters.page
      };

      if (filters.dateRange.from && filters.dateRange.to) {
        const startDate = new Date(filters.dateRange.from);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(filters.dateRange.to);
        endDate.setHours(23, 59, 59, 999);

        params.startDate = startDate.toISOString();
        params.endDate = endDate.toISOString();
      }

      const response = await historyService.getHistories(params);

      setHistories(response.histories);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleExport = () => {
    // Implementation for export functionality
    console.log('Exporting attendance data...');
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, page: 1 }));
    fetchData();
  };

  const handleReset = () => {
    setFilters({
      dateRange: {
        from: '',
        to: ''
      },
      page: 1
    });
    // After resetting filters, fetch without date range
    fetchData();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Attendance History</h1>
        <button
          onClick={handleExport}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
            <path d="M12 15V3M12 15L8 11M12 15L16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L2.621 19.485C2.72915 19.9177 2.97882 20.3018 3.33033 20.5763C3.68184 20.8508 4.11501 20.9999 4.561 21H19.439C19.885 20.9999 20.3182 20.8508 20.6697 20.5763C21.0212 20.3018 21.2708 19.9177 21.379 19.485L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Export Report
        </button>
      </div>

      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              <span className="inline-block mr-2">📅</span>
              Date Range
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateRange.from}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, from: e.target.value }
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="date"
                value={filters.dateRange.to}
                onChange={(e) => setFilters({
                  ...filters,
                  dateRange: { ...filters.dateRange, to: e.target.value }
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              <span className="inline-block mr-2">👤</span>
              User
            </label>
            <select
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            >
              <option value="">All Users</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              <span className="inline-block mr-2">🖥️</span>
              Device
            </label>
            <select
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
            >
              <option value="">All Devices</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Reset Filters
          </button>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Search
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DATE
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    USER INFO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CHECK IN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    CHECK OUT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {histories.map((record) => (
                  <tr key={record._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{record.user.name}</div>
                      <div className="text-sm text-gray-500">ID: {record.user.userId}</div>
                      <div className="text-sm text-gray-500">{record.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.time_in}</div>
                      <div className="text-sm text-gray-500">
                        Device: {record.check_in_device.description}
                        <div className="text-xs text-gray-400">({record.check_in_device.deviceMac})</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        Method: <span className="capitalize">{record.check_in_auth_method}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.time_out ? (
                        <>
                          <div className="text-sm text-gray-900">{record.time_out}</div>
                          <div className="text-sm text-gray-500">
                            Device: {record.check_out_device?.description}
                            <div className="text-xs text-gray-400">({record.check_out_device?.deviceMac})</div>
                          </div>
                          <div className="text-sm text-gray-500">
                            Method: <span className="capitalize">{record.check_out_auth_method}</span>
                          </div>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        record.time_out
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.time_out ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="px-6 py-3 flex justify-between items-center border-t border-gray-200">
              <div className="text-sm text-gray-700">
                Page {filters.page} of {totalPages}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, page: 1 }));
                    fetchData();
                  }}
                  disabled={filters.page === 1}
                  className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                >
                  First
                </button>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, page: prev.page - 1 }));
                    fetchData();
                  }}
                  disabled={filters.page === 1}
                  className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, page: prev.page + 1 }));
                    fetchData();
                  }}
                  disabled={filters.page === totalPages}
                  className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                >
                  Next
                </button>
                <button
                  onClick={() => {
                    setFilters(prev => ({ ...prev, page: totalPages }));
                    fetchData();
                  }}
                  disabled={filters.page === totalPages}
                  className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendancePage;