import React, { useEffect, useState } from 'react';
import { Plus, Settings, Edit, Trash, Wifi, WifiOff, Users } from 'lucide-react';
import { Table } from '../components/common/Table';
import { Pagination } from '../components/common/Pagination';
import { useDevices } from '../hooks/useDevices';
import { Device, DeviceFilters } from '../types/device';
import DeviceForm from '../components/devices/DeviceForm';
import { deviceService } from '../services/deviceService';
import { User } from '../types/user';
import { useNavigate } from 'react-router-dom';

const DevicesPage: React.FC = () => {
  const {
    devices,
    loading,
    error,
    meta,
    fetchDevices,
    createDevice,
    deleteDevice,
  } = useDevices();

  const [filters, setFilters] = useState<DeviceFilters>({
    page: 1,
    limit: 10,
  });

  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const navigate = useNavigate();

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

  const columns = [
    { 
      key: 'deviceMac' as keyof Device, 
      header: 'Địa chỉ MAC',
      render: (value: string | undefined) => value || '',
    },
    { 
      key: 'description' as keyof Device, 
      header: 'Tên thiết bị',
      render: (value: string | undefined) => value || '',
    },
    { 
      key: 'users' as keyof Device, 
      header: 'Nhân viên',
      render: (value: any[] | undefined, device: Device) => (
        <button 
          onClick={() => navigate(`/devices/${device._id}/users`)}
          className="flex items-center hover:text-primary-600 transition-colors"
        >
          <Users size={18} className="text-gray-400 mr-2" />
          <span>{value?.length || 0}</span>
        </button>
      ),
    },
    {
      key: 'isOnline' as keyof Device,
      header: 'Trạng thái',
      render: (value: boolean | undefined) => (
        <div className="flex items-center">
          {value ? (
            <>
              <Wifi size={18} className="text-green-500 mr-2" />
              <span className="text-green-500">Đang hoạt động</span>
            </>
          ) : (
            <>
              <WifiOff size={18} className="text-gray-500 mr-2" />
              <span className="text-gray-500">Ngoại tuyến</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: '_id' as keyof Device,
      header: 'Thao tác',
      render: (_: string | undefined, device: Device) => (
        <div className="flex items-center space-x-3">
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
        <h1 className="text-2xl font-bold text-gray-800">Quản lí thiết bị</h1>
        <button
          onClick={() => setIsAddDeviceModalOpen(true)}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Thêm thiết bị
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table<Device>
          data={devices}
          columns={columns}
          isLoading={loading}
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
    </div>
  );
};

export default DevicesPage;