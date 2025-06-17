import React, { useEffect, useState } from 'react';
import { X, Loader2, CreditCard, Fingerprint } from 'lucide-react';
import { Device } from '../../types/device';
import { deviceService } from '../../services/deviceService';

interface SelectDeviceModalProps {
  onSelect: (deviceId: string) => void;
  onClose: () => void;
  registrationType: 'fingerprint' | 'card';
  requestStatus: {
    loading: boolean;
    error: string | null;
    success: boolean;
  };
}

const SelectDeviceModal: React.FC<SelectDeviceModalProps> = ({ 
  onSelect, 
  onClose, 
  registrationType,
  requestStatus 
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
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

        {requestStatus.loading ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="animate-spin text-primary-600" size={32} />
            <p className="text-gray-600">Sending request to device...</p>
          </div>
        ) : requestStatus.error ? (
          <div className="text-red-500 text-center py-4">{requestStatus.error}</div>
        ) : requestStatus.success ? (
          <div className="text-green-500 text-center py-4">
            Request sent successfully! Please follow the instructions on the device.
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-primary-600" size={32} />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">{error}</div>
        ) : devices.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No devices available</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {devices.map((device) => (
              <button
                key={device._id}
                onClick={() => onSelect(device._id)}
                disabled={requestStatus.loading}
                className="w-full p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-sm text-gray-700 space-y-1">
                  <div><span className="font-medium">Tên thiết bị:</span> <span className="font-normal">{device.description}</span></div>
                  <div><span className="font-medium">Địa chỉ MAC:</span> <span className="font-normal">{device.deviceMac}</span></div>
                  <div><span className="font-medium">Trạng thái:</span> <span className="font-normal">{device.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</span></div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectDeviceModal; 