import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { User } from '../../types/user';
import { workScheduleService } from '../../services/workScheduleService';
import { WorkSchedule } from '../../types/userWorkSchedule';

interface UserEditModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: { name?: string; email?: string; workSchedule?: string }) => Promise<void>;
}

const UserEditModal: React.FC<UserEditModalProps> = ({
  user,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    workSchedule: '',
  });
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      // Load work schedules
      const fetchSchedules = async () => {
        try {
          const data = await workScheduleService.getAllSchedules();
          setWorkSchedules(data);
        } catch (error) {
          console.error('Error fetching work schedules:', error);
        }
      };
      fetchSchedules();
    }
  }, [isOpen]);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        workSchedule: user.workSchedule || '',
      });
      setErrors({});
    }
  }, [user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên không được để trống';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Only include fields that have been changed
      const updateData: { name?: string; email?: string; workSchedule?: string } = {};
      
      if (formData.name !== user?.name) {
        updateData.name = formData.name;
      }
      if (formData.email !== user?.email) {
        updateData.email = formData.email;
      }
      if (formData.workSchedule !== user?.workSchedule) {
        updateData.workSchedule = formData.workSchedule || undefined;
      }

      await onSubmit(updateData);
      onClose();
    } catch (error: any) {
      console.error('Error updating user:', error);
      // Handle specific errors
      if (error?.response?.data?.message?.includes('Email already exists')) {
        setErrors({ email: 'Email đã tồn tại' });
      } else {
        setErrors({ general: 'Có lỗi xảy ra khi cập nhật thông tin' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Cập nhật thông tin nhân viên</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
              {errors.general}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã nhân viên
            </label>
            <input
              type="text"
              value={user.userId || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tên nhân viên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Nhập tên nhân viên"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.email ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Nhập email"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lịch làm việc
            </label>
            <select
              value={formData.workSchedule}
              onChange={(e) => handleInputChange('workSchedule', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Chọn lịch làm việc</option>
              {workSchedules.map((schedule) => (
                <option key={schedule._id} value={schedule._id}>
                  {schedule.scheduleName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin mr-2" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditModal; 