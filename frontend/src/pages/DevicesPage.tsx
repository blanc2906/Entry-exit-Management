import React, { useEffect, useState } from 'react';
import { Plus, Settings, Edit, Trash, Wifi, WifiOff, Users } from 'lucide-react';
import { Table } from '../components/common/Table';
import { Pagination } from '../components/common/Pagination';
import { useDevices } from '../hooks/useDevices';
import { Device, DeviceFilters } from '../types/device';
import DeviceForm from '../components/devices/DeviceForm';
import DeviceUsersModal from '../components/devices/DeviceUsersModal';
import { deviceService } from '../services/deviceService';
import { User } from '../types/user';

const DevicesPage: React.FC = () => {
  const {
    devices,
    selectedDevices,
    loading,
    error,
    meta,
    fetchDevices,
    createDevice,
    handleSelectAll,
    handleSelectDevice,
    deleteDevice,
  } = useDevices();

  const [filters, setFilters] = useState<DeviceFilters>({
    page: 1,
    limit: 10,
  });

  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [selectedDeviceUsers, setSelectedDeviceUsers] = useState<{
    device: Device | null;
    users: (User & { fingerId: number })[];
    loading: boolean;
    error: string | null;
  }>({
    device: null,
    users: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    fetchDevices(filters);
  }, [fetchDevices, filters]);

  const handleAddDevice = async (deviceData: { deviceMac: string; description: string }) => {
    try {
      await createDevice(deviceData);
      await fetchDevices(filters);
      setIsAddDeviceModalOpen(false);
    } catch (error) {
      throw error;
    }
  };

  const handleViewUsers = async (device: Device) => {
    setSelectedDeviceUsers(prev => ({ ...prev, device, loading: true, error: null }));
    try {
      const response = await deviceService.getDeviceUsers(device._id);
      setSelectedDeviceUsers(prev => ({
        ...prev,
        users: response.users,
        loading: false,
      }));
    } catch (error) {
      console.error('Error fetching device users:', error);
      setSelectedDeviceUsers(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load users. Please try again.',
      }));
    }
  };

  const handleUserRemoved = async () => {
    if (selectedDeviceUsers.device) {
      // Refresh the users list
      await handleViewUsers(selectedDeviceUsers.device);
      // Refresh the devices list to update user count
      await fetchDevices(filters);
    }
  };

  const columns = [
    { 
      key: 'deviceMac' as keyof Device, 
      header: 'MAC Address',
      render: (value: string | undefined) => value || '',
    },
    { 
      key: 'description' as keyof Device, 
      header: 'Name',
      render: (value: string | undefined) => value || '',
    },
    { 
      key: 'users' as keyof Device, 
      header: 'Users',
      render: (value: any[] | undefined, device: Device) => (
        <button 
          onClick={() => handleViewUsers(device)}
          className="flex items-center hover:text-primary-600 transition-colors"
        >
          <Users size={18} className="text-gray-400 mr-2" />
          <span>{value?.length || 0}</span>
        </button>
      ),
    },
    {
      key: 'isOnline' as keyof Device,
      header: 'Status',
      render: (value: boolean | undefined) => (
        <div className="flex items-center">
          {value ? (
            <>
              <Wifi size={18} className="text-green-500 mr-2" />
              <span className="text-green-500">Online</span>
            </>
          ) : (
            <>
              <WifiOff size={18} className="text-gray-500 mr-2" />
              <span className="text-gray-500">Offline</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'lastSeen' as keyof Device,
      header: 'Last Seen',
      render: (value: Date | undefined) => value ? new Date(value).toLocaleString() : '-',
    },
    {
      key: 'createdAt' as keyof Device,
      header: 'Created',
      render: (value: Date | undefined) => value ? new Date(value).toLocaleDateString() : '',
    },
    {
      key: '_id' as keyof Device,
      header: 'Actions',
      render: (_: string | undefined, device: Device) => (
        <div className="flex items-center space-x-3">
          <button 
            className="text-gray-400 hover:text-primary-600"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Settings for device:', device._id);
            }}
          >
            <Settings size={18} />
          </button>
          <button 
            className="text-gray-400 hover:text-primary-600"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Edit device:', device._id);
            }}
          >
            <Edit size={18} />
          </button>
          <button 
            className="text-gray-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              deleteDevice(device._id);
            }}
          >
            <Trash size={18} />
          </button>
        </div>
      ),
    },
  ];

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Devices Management</h1>
        <button
          onClick={() => setIsAddDeviceModalOpen(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Add Device
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table<Device>
          data={devices}
          columns={columns}
          isLoading={loading}
          selectable
          selectedIds={selectedDevices}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectDevice}
        />

        <Pagination
          currentPage={meta.currentPage}
          totalPages={meta.totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </div>

      {isAddDeviceModalOpen && (
        <DeviceForm
          onSubmit={handleAddDevice}
          onClose={() => setIsAddDeviceModalOpen(false)}
        />
      )}

      {selectedDeviceUsers.device && (
        <DeviceUsersModal
          users={selectedDeviceUsers.users}
          deviceName={selectedDeviceUsers.device.description || selectedDeviceUsers.device.deviceMac}
          deviceId={selectedDeviceUsers.device._id}
          onClose={() => setSelectedDeviceUsers({
            device: null,
            users: [],
            loading: false,
            error: null,
          })}
          onUserRemoved={handleUserRemoved}
        />
      )}
    </div>
  );
};

export default DevicesPage;