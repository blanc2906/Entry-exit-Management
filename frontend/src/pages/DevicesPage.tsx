import React, { useState } from 'react';
import { Search, Plus, Settings, Edit, Trash, ChevronLeft, ChevronRight, Eye, Users } from 'lucide-react';
import { Device } from '../types';

const DevicesPage: React.FC = () => {
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Mock data for demonstration
  const devices: Device[] = [
    {
      id: 'D001',
      mac: '00:1B:44:11:3A:B7',
      name: 'Main Entrance',
      description: 'Main Entrance',
      userCount: 5,
      status: 'online',
      created: '2024-01-15'
    },
    {
      id: 'D002',
      mac: '00:1B:44:11:3A:B8',
      name: 'Office Door',
      description: 'Office Door',
      userCount: 3,
      status: 'offline',
      created: '2024-01-15'
    },
    {
      id: 'D003',
      mac: '00:1B:44:11:3A:B9',
      name: 'Warehouse Access',
      description: 'Warehouse Access',
      userCount: 0,
      status: 'online',
      created: '2024-01-15'
    },
  ];

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDevices(devices.map(device => device.id));
    } else {
      setSelectedDevices([]);
    }
  };

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleAddDevice = () => {
    console.log('Opening add device modal...');
  };

  const handleExport = () => {
    console.log('Exporting devices data...');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Device Management</h1>
        <button
          onClick={handleAddDevice}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Add Device
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search devices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
          />
          <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500">
            <option value="">Filter Status ▼</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Export ▼
          </button>
        </div>
      </div>

      {/* Devices Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedDevices.length === devices.length}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device MAC
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Users
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {devices.map((device) => (
                <tr key={device.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedDevices.includes(device.id)}
                      onChange={() => handleSelectDevice(device.id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {device.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {device.mac}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {device.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Users size={16} className="mr-2 text-gray-400" />
                      {device.userCount}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      device.status === 'online'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {device.status === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(device.created).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-3">
                      <button className="text-gray-400 hover:text-primary-600">
                        <Eye size={18} />
                      </button>
                      <button className="text-gray-400 hover:text-primary-600">
                        <Edit size={18} />
                      </button>
                      <button className="text-gray-400 hover:text-red-600">
                        <Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              <ChevronLeft size={20} />
            </button>
            {[1, 2, 3].map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded-md ${
                  currentPage === page
                    ? 'bg-primary-600 text-white'
                    : 'hover:bg-gray-200'
                }`}
              >
                {page}
              </button>
            ))}
            <span className="px-2">...</span>
            <button
              onClick={() => setCurrentPage(10)}
              className={`px-3 py-1 rounded-md hover:bg-gray-200`}
            >
              10
            </button>
            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage === 10}
              className="p-1 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevicesPage;