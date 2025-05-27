import { useState, useCallback } from 'react';
import { Device, DeviceFilters } from '../types/device';
import { deviceService } from '../services/deviceService';
import { AxiosError } from 'axios';

export const useDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const handleError = (err: unknown) => {
    if (err instanceof AxiosError) {
      const status = err.response?.status ?? 0;
      const message = err.response?.data?.message || err.message;
      
      if (status === 401) {
        setError('Unauthorized. Please log in again.');
      } else if (status === 403) {
        setError('You do not have permission to access this resource.');
      } else if (status === 404) {
        setError('The requested resource was not found.');
      } else if (status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(`Error: ${message}`);
      }
    } else {
      setError('An unexpected error occurred. Please try again.');
    }
    console.error('Error details:', err);
  };

  const fetchDevices = useCallback(async (filters: DeviceFilters) => {
    try {
      setLoading(true);
      setError(null);
      const response = await deviceService.getDevices(filters);
      setDevices(response.items);
      setMeta({
        currentPage: response.meta.currentPage,
        totalPages: response.meta.totalPages,
        totalItems: response.meta.totalItems,
      });
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createDevice = useCallback(async (deviceData: { deviceMac: string; description: string }) => {
    try {
      setError(null);
      const newDevice = await deviceService.createDevice(deviceData);
      setDevices(prev => [...prev, newDevice]);
      return newDevice;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedDevices(checked ? devices.map(device => device._id) : []);
  }, [devices]);

  const handleSelectDevice = useCallback((deviceId: string) => {
    setSelectedDevices(prev => {
      if (prev.includes(deviceId)) {
        return prev.filter(id => id !== deviceId);
      }
      return [...prev, deviceId];
    });
  }, []);

  const deleteDevice = useCallback(async (deviceId: string) => {
    try {
      setError(null);
      await deviceService.deleteDevice(deviceId);
      setDevices(prev => prev.filter(device => device._id !== deviceId));
      setSelectedDevices(prev => prev.filter(id => id !== deviceId));
    } catch (err) {
      handleError(err);
    }
  }, []);

  return {
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
  };
}; 