import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { workScheduleService } from '../../services/workScheduleService';
import { WorkSchedule } from '../../types/userWorkSchedule';

interface UserFormProps {
  onSubmit: (data: { userId: string; name: string; email: string; workSchedule?: string }) => void;
  onClose: () => void;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    email: '',
    workSchedule: '',
  });
  const [fieldError, setFieldError] = useState<{ userId?: string; name?: string; email?: string }>({});
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  useEffect(() => {
    const fetchSchedules = async () => {
      setLoadingSchedules(true);
      try {
        const data = await workScheduleService.getAllSchedules();
        setWorkSchedules(data);
      } catch {
        setWorkSchedules([]);
      } finally {
        setLoadingSchedules(false);
      }
    };
    fetchSchedules();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError({});
    // Validate các trường bắt buộc
    const errors: { userId?: string; name?: string; email?: string } = {};
    if (!formData.userId.trim()) errors.userId = 'Vui lòng nhập mã nhân viên';
    if (!formData.name.trim()) errors.name = 'Vui lòng nhập tên';
    if (!formData.email.trim()) errors.email = 'Vui lòng nhập email';
    if (Object.keys(errors).length > 0) {
      setFieldError(errors);
      return;
    }
    try {
      await onSubmit({
        ...formData,
        workSchedule: formData.workSchedule || undefined
      });
    } catch (err: any) {
      // Xác định lỗi trả về từ backend
      const msg = err.response?.data?.message || '';
      if (msg.includes('User ID already exists')) {
        setFieldError({ userId: 'Mã nhân viên đã tồn tại' });
      } else if (msg.includes('Email already exists')) {
        setFieldError({ email: 'Email đã tồn tại' });
      } else {
        setFieldError({ userId: msg || 'Tạo nhân viên thất bại' });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFieldError(prev => ({ ...prev, [name]: undefined })); // Xóa lỗi khi nhập lại
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-semibold mb-4">Thêm nhân viên mới</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-1">
                Mã nhân viên
              </label>
              <input
                type="text"
                id="userId"
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Nhập mã nhân viên"
              />
              {fieldError.userId && (
                <div className="text-red-500 text-sm mt-1">{fieldError.userId}</div>
              )}
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Tên
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Nhập tên"
              />
              {fieldError.name && (
                <div className="text-red-500 text-sm mt-1">{fieldError.name}</div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Nhập email"
              />
              {fieldError.email && (
                <div className="text-red-500 text-sm mt-1">{fieldError.email}</div>
              )}
            </div>

            <div>
              <label htmlFor="workSchedule" className="block text-sm font-medium text-gray-700 mb-1">
                Lịch làm việc
              </label>
              <select
                id="workSchedule"
                name="workSchedule"
                value={formData.workSchedule}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                disabled={loadingSchedules}
              >
                <option value="">Chọn lịch làm việc</option>
                {workSchedules.map(ws => (
                  <option key={ws._id.toString()} value={ws._id.toString()}>{ws.scheduleName}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700"
              >
                Thêm nhân viên
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm; 