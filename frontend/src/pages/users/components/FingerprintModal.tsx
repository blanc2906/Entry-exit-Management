// frontend/src/pages/users/components/FingerprintModal.tsx
import React, { useState, useEffect } from 'react';
import { User } from '../../../types/user';
import { useUserStore } from '../../../store/useUserStore';

interface FingerprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  devices: Array<{ _id: string; deviceMac: string; description: string }>;
}

const FingerprintModal: React.FC<FingerprintModalProps> = ({
  isOpen,
  onClose,
  user,
  devices,
}) => {
  const { requestAddFingerprint, addFingerprint, loading, error } = useUserStore();
  const [selectedDevice, setSelectedDevice] = useState('');
  const [step, setStep] = useState<'select-device' | 'waiting' | 'input-data'>('select-device');
  const [fingerId, setFingerId] = useState<number>(1);
  const [fingerTemplate, setFingerTemplate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('select-device');
      setSelectedDevice('');
      setFingerId(1);
      setFingerTemplate('');
    }
  }, [isOpen]);

  const handleRequestFingerprint = async () => {
    if (!user || !selectedDevice) return;
    
    try {
      await requestAddFingerprint(user._id, selectedDevice);
      setStep('waiting');
      // Simulate waiting for device response
      setTimeout(() => {
        setStep('input-data');
      }, 3000);
    } catch (error) {
      console.error('Error requesting fingerprint:', error);
    }
  };

  const handleAddFingerprint = async () => {
    if (!user || !selectedDevice) return;

    const selectedDeviceData = devices.find(d => d._id === selectedDevice);
    if (!selectedDeviceData) return;

    try {
      await addFingerprint({
        userId: user._id,
        fingerId,
        fingerTemplate,
        deviceMac: selectedDeviceData.deviceMac,
      });
      onClose();
    } catch (error) {
      console.error('Error adding fingerprint:', error);
    }
  };

  const handleClose = () => {
    setStep('select-device');
    onClose();
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            Add Fingerprint for {user.name}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {step === 'select-device' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="device" className="block text-sm font-medium text-gray-700 mb-2">
                Select Device
              </label>
              <select
                id="device"
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a device...</option>
                {devices.map((device) => (
                  <option key={device._id} value={device._id}>
                    {device.description} ({device.deviceMac})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestFingerprint}
                disabled={!selectedDevice || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Requesting...' : 'Request Fingerprint'}
              </button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Waiting for Device Response
              </h3>
              <p className="text-sm text-gray-600">
                Please place your finger on the selected device scanner. 
                The device will capture your fingerprint template.
              </p>
            </div>
          </div>
        )}

        {step === 'input-data' && (
          <div className="space-y-4">
            <div>
              <label htmlFor="fingerId" className="block text-sm font-medium text-gray-700 mb-2">
                Finger ID
              </label>
              <input
                type="number"
                id="fingerId"
                value={fingerId}
                onChange={(e) => setFingerId(parseInt(e.target.value) || 1)}
                min="1"
                max="255"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="fingerTemplate" className="block text-sm font-medium text-gray-700 mb-2">
                Fingerprint Template (Optional)
              </label>
              <textarea
                id="fingerTemplate"
                value={fingerTemplate}
                onChange={(e) => setFingerTemplate(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Fingerprint template data will be automatically filled by device..."
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFingerprint}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Adding...' : 'Add Fingerprint'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FingerprintModal;