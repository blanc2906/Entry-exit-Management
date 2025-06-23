import React, { useEffect, useState } from 'react';
import { deviceService } from '../../services/deviceService';
import { Device } from '../../types/device';
import { X } from 'lucide-react';
import { DeviceConfig } from '../../types/deviceConfig';

interface DeviceConfigModalProps {
  device: Device;
  initialConfig: DeviceConfig | null;
  onClose: () => void;
  onConfigUpdate: () => void;
  isLoadingConfig: boolean;
}

const DeviceConfigModal: React.FC<DeviceConfigModalProps> = ({ device, initialConfig, onClose, onConfigUpdate, isLoadingConfig }) => {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [serverIP, setServerIP] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialConfig) {
      setSsid(initialConfig.ssid || '');
      setServerIP(initialConfig.serverIP || '');
      setPassword(initialConfig.password || '');
    }
  }, [initialConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await deviceService.updateDeviceConfig(device._id, { ssid, password, serverIP });
      onConfigUpdate();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update config. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold mb-4 text-gray-800">Cấu hình thiết bị: {device.description}</h2>
        
        {isLoadingConfig ? (
          <div className="flex justify-center items-center h-48">
            <p>Đang tải cấu hình...</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">Nhập thông tin cấu hình mới cho thiết bị. Các trường bỏ trống sẽ không được cập nhật.</p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="ssid" className="block text-sm font-medium text-gray-700">
                  SSID (Tên mạng Wi-Fi)
                </label>
                <input
                  type="text"
                  id="ssid"
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Nhập SSID mới"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mật khẩu Wi-Fi
                </label>
                <input
                  type="text"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Nhập mật khẩu mới"
                />
              </div>
              <div>
                <label htmlFor="serverIP" className="block text-sm font-medium text-gray-700">
                  Địa chỉ IP máy chủ
                </label>
                <input
                  type="text"
                  id="serverIP"
                  value={serverIP}
                  onChange={(e) => setServerIP(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="Ví dụ: 192.168.1.100"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex justify-end pt-4 space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  disabled={loading}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  disabled={loading}
                >
                  {loading ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default DeviceConfigModal; 