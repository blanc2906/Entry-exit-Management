import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

interface DeviceFormProps {
  onSubmit: (deviceData: { deviceMac: string; description: string }) => Promise<void>;
  onClose: () => void;
}

const DeviceForm: React.FC<DeviceFormProps> = ({ onSubmit, onClose }) => {
  const [deviceData, setDeviceData] = useState({
    deviceMac: '',
    description: '',
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');

  useEffect(() => {
    let timer: number;
    if (isVerifying && countdown > 0) {
      timer = window.setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0 && verificationStatus === 'verifying') {
      setVerificationStatus('failed');
      setIsVerifying(false);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [isVerifying, countdown, verificationStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setVerificationStatus('verifying');
    setCountdown(30);

    try {
      await onSubmit(deviceData);
      setVerificationStatus('success');
      setTimeout(() => {
        onClose();
      }, 1500); // Close modal after showing success message
    } catch (error) {
      setVerificationStatus('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const getStatusMessage = () => {
    switch (verificationStatus) {
      case 'verifying':
        return (
          <div className="flex items-center justify-center space-x-2 text-primary-600">
            <Loader2 className="animate-spin" size={20} />
            <span>Waiting for device verification... {countdown}s</span>
          </div>
        );
      case 'success':
        return (
          <div className="text-center text-green-600">
            Device added successfully!
          </div>
        );
      case 'failed':
        return (
          <div className="text-center text-red-600">
            Device verification failed. Please try again.
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Add New Device</h2>
          <button
            onClick={onClose}
            disabled={isVerifying}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="deviceMac" className="block text-sm font-medium text-gray-700 mb-1">
              MAC Address
            </label>
            <input
              type="text"
              id="deviceMac"
              value={deviceData.deviceMac}
              onChange={(e) => setDeviceData({ ...deviceData, deviceMac: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
              disabled={isVerifying}
              placeholder="Enter device MAC address"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              id="description"
              value={deviceData.description}
              onChange={(e) => setDeviceData({ ...deviceData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
              disabled={isVerifying}
              placeholder="Enter device description"
            />
          </div>

          {verificationStatus !== 'idle' && (
            <div className="py-3">
              {getStatusMessage()}
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  Verifying...
                </>
              ) : (
                'Add Device'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeviceForm; 