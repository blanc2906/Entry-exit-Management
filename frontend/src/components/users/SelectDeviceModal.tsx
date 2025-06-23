import React, { useEffect, useState } from 'react';
import { X, Loader2, CreditCard, Fingerprint } from 'lucide-react';
import { Device } from '../../types/device';
import { deviceService } from '../../services/deviceService';

interface SelectDeviceModalProps {
  onConfirm: (deviceIds: string[]) => void;
  onClose: () => void;
  registrationType: 'fingerprint' | 'card';
  requestStatus: {
    loading: boolean;
    error: string | null;
  };
}

const SelectDeviceModal: React.FC<SelectDeviceModalProps> = ({ 
  onConfirm, 
  onClose, 
  registrationType,
  requestStatus 
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);

  const isMultiSelect = registrationType === 'fingerprint';

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await deviceService.getDevices({ page: 1, limit: 100 });
        setDevices(response.items);
      } catch (error) {
        setError('Failed to load devices');
        console.error('Error loading devices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDeviceIds(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleConfirm = () => {
    if (selectedDeviceIds.length > 0) {
      onConfirm(selectedDeviceIds);
    }
  };

  const getTitle = () => {
    return registrationType === 'fingerprint'
      ? 'Chọn thiết bị để đăng ký vân tay'
      : 'Chọn thiết bị để đăng ký thẻ';
  };

  const getIcon = () => {
    return registrationType === 'fingerprint' ? (
      <Fingerprint size={20} className="text-primary-600" />
    ) : (
      <CreditCard size={20} className="text-primary-600" />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-2">
            {getIcon()}
            <h2 className="text-xl font-semibold text-gray-800">{getTitle()}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={requestStatus.loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto space-y-3 max-h-96 pr-2">
          {requestStatus.loading ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="animate-spin text-primary-600" size={32} />
              <p className="text-gray-600">Sending request to device(s)...</p>
            </div>
          ) : requestStatus.error ? (
            <div className="text-red-500 text-center py-4">{requestStatus.error}</div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-primary-600" size={32} />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-4">{error}</div>
          ) : devices.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No devices available</div>
          ) : (
            devices.map((device) => (
              <label
                key={device._id}
                className={`w-full p-4 flex items-center text-left border rounded-lg transition-colors cursor-pointer ${
                  selectedDeviceIds.includes(device._id) ? 'bg-primary-50 border-primary-300' : 'hover:bg-gray-50'
                } ${!device.isOnline ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  type={isMultiSelect ? "checkbox" : "radio"}
                  name="device"
                  checked={selectedDeviceIds.includes(device._id)}
                  onChange={() => isMultiSelect ? handleDeviceToggle(device._id) : setSelectedDeviceIds([device._id])}
                  disabled={!device.isOnline || requestStatus.loading}
                  className="mr-4 h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <div className="text-sm text-gray-700 space-y-1">
                  <div><span className="font-medium">Tên thiết bị:</span> <span className="font-normal">{device.description}</span></div>
                  <div><span className="font-medium">Địa chỉ MAC:</span> <span className="font-normal">{device.deviceMac}</span></div>
                  <div><span className="font-medium">Trạng thái:</span> <span className={`font-normal ${device.isOnline ? 'text-green-600' : 'text-red-600'}`}>{device.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</span></div>
                </div>
              </label>
            ))
          )}
        </div>
        
        {!loading && !requestStatus.loading && devices.length > 0 && (
          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedDeviceIds.length === 0 || requestStatus.loading}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xác nhận
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectDeviceModal; 