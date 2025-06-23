import React, { useEffect, useState } from 'react';
import { Plus, Settings, Edit, Trash, Fingerprint, CreditCard, Loader2 } from 'lucide-react';
import { Table } from '../components/common/Table';
import { Pagination } from '../components/common/Pagination';
import { UserFilters } from '../components/users/UserFilters';
import UserForm from '../components/users/UserForm';
import SelectDeviceModal from '../components/users/SelectDeviceModal';
import { useUsers } from '../hooks/useUsers';
import { User, UserFilters as UserFiltersType } from '../types/user';
import { userService } from '../services/userService';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { workScheduleService } from '../services/workScheduleService';
import { WorkSchedule } from '../types/userWorkSchedule';
import { useNotification } from '../hooks/useRecentActivity';
import { message, notification as antdNotification } from 'antd';
import cardGuide from '../assets/card-guide.png';
import fingerprintGuide from '../assets/fingerprint-guide.png';

const UsersPage: React.FC = () => {
  const {
    users,
    loading,
    error,
    meta,
    fetchUsers,
    deleteUser,
  } = useUsers();

  const [filters, setFilters] = useState<UserFiltersType>({
    page: 1,
    limit: 10,
  });

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isSelectDeviceModalOpen, setIsSelectDeviceModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [registrationType, setRegistrationType] = useState<'fingerprint' | 'card'>('fingerprint');
  const [requestStatus, setRequestStatus] = useState<{
    loading: boolean;
    error: string | null;
  }>({
    loading: false,
    error: null,
  });

  // State for delete confirmation
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);

  // Hook để lắng nghe thông báo fingerprint và card
  const notification = useNotification();

  useEffect(() => {
    fetchUsers(filters);
  }, [filters]);

  // Hiển thị thông báo khi nhận được notification fingerprint hoặc card
  useEffect(() => {
    if (notification) {
      setIsSelectDeviceModalOpen(false);
      setRequestStatus({ loading: false, error: null });
      
      if (notification.type === 'fingerprint_added' || notification.type === 'card_added') {
        message.success(notification.message);
      } else if (notification.type === 'fingerprint_failed' || notification.type === 'card_failed') {
        message.error(notification.message);
      }
      
      // Refresh danh sách users để cập nhật trạng thái
      fetchUsers(filters);
    }
  }, [notification]);

  useEffect(() => {
    // Lấy danh sách work schedules để map id sang tên
    const fetchSchedules = async () => {
      try {
        const data = await workScheduleService.getAllSchedules();
        setWorkSchedules(data);
      } catch {
        setWorkSchedules([]);
      }
    };
    fetchSchedules();
  }, []);

  const getScheduleName = (id?: string) => {
    if (!id) return '';
    const found = workSchedules.find(ws => ws._id === id || ws._id?.toString() === id);
    return found ? found.scheduleName : id;
  };

  const handleAddUser = () => {
    setIsAddUserModalOpen(true);
  };

  const handleCreateUser = async (userData: { userId: string; name: string; email: string; workSchedule?: string }) => {
    try {
      await userService.createUser(userData);
      setIsAddUserModalOpen(false);
      fetchUsers(filters);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error; // Re-throw the error to be handled by the form
    }
  };

  const handleRequestAddFingerprint = (userId: string) => {
    setSelectedUserId(userId);
    setRegistrationType('fingerprint');
    setRequestStatus({ loading: false, error: null });
    setIsSelectDeviceModalOpen(true);
  };

  const handleRequestAddCardNumber = (userId: string) => {
    setSelectedUserId(userId);
    setRegistrationType('card');
    setRequestStatus({ loading: false, error: null });
    setIsSelectDeviceModalOpen(true);
  };

  const handleDeviceSelect = async (deviceIds: string[]) => {
    if (deviceIds.length === 0) return;

    setRequestStatus({ loading: true, error: null });
    try {
      if (registrationType === 'fingerprint') {
        await userService.requestBulkFingerprint(selectedUserId, deviceIds);
      } else {
        // Card registration still uses the first selected device
        await userService.requestAddCardNumber(selectedUserId, deviceIds[0]);
      }
      setIsSelectDeviceModalOpen(false);
      antdNotification.success({
        message: 'Gửi yêu cầu thành công',
        description: (
          <div>
            <p>Vui lòng làm theo hướng dẫn trên thiết bị.</p>
            <img 
              src={registrationType === 'card' ? cardGuide : fingerprintGuide} 
              alt="hướng dẫn"
              className="mt-4 w-48"
            />
          </div>
        ),
        duration: 10,
      });

    } catch (error: any) {
      console.error(`Error requesting ${registrationType} registration:`, error);
      let errorMsg = '';
      if (error?.response?.data?.message?.includes('Device is offline')) {
        errorMsg = 'Thiết bị đang ngoại tuyến, vui lòng chọn thiết bị khác hoặc kiểm tra lại kết nối.';
      } else {
        errorMsg = 'Yêu cầu đăng ký thất bại, vui lòng thử lại.';
      }
      setRequestStatus({
        loading: false,
        error: errorMsg,
      });
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      setIsDeleting(true);
      await deleteUser(userToDelete._id);
      await fetchUsers(filters);
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  const renderDeleteConfirmMessage = (user: User) => (
    <div className="space-y-2">
      <p>Bạn có chắc chắn muốn xóa nhân viên này?</p>
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="text-sm text-gray-700">
          <div><span className="font-medium">Tên:</span> <span className="font-normal">{user.name}</span></div>
          <div><span className="font-medium">Mã nhân viên:</span> <span className="font-normal">{user.userId}</span></div>
          {user.email && <div><span className="font-medium">Email:</span> <span className="font-normal">{user.email}</span></div>}
        </div>
        {user.fingerId && (
          <div className="text-sm text-gray-500 flex items-center">
            <Fingerprint size={14} className="mr-1" />
            ID: {user.fingerId}
          </div>
        )}
        {user.cardNumber && (
          <div className="text-sm text-gray-500 flex items-center">
            <CreditCard size={14} className="mr-1" />
            {user.cardNumber}
          </div>
        )}
      </div>
    </div>
  );

  const columns = [
    { 
      key: 'userId' as keyof User, 
      header: 'Mã nhân viên',
      render: (value: string | undefined) => value || '',
    },
    { 
      key: 'name' as keyof User, 
      header: 'Tên',
      render: (value: string | undefined) => value || '',
    },
    { 
      key: 'email' as keyof User, 
      header: 'Email',
      render: (value: string | undefined) => value || '',
    },
    {
      key: 'workSchedule' as keyof User,
      header: 'Lịch làm việc',
      render: (value: string | undefined) => getScheduleName(value),
    },
    {
      key: 'fingerTemplate' as keyof User,
      header: 'Vân tay',
      render: (value: string | undefined, user: User) => (
        value ? (
          <div className="flex items-center justify-center">
            <Fingerprint size={18} className="text-primary-600" />
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleRequestAddFingerprint(user._id)}
              className="px-2 py-1 text-xs font-medium text-primary-600 border border-primary-600 rounded hover:bg-primary-50"
            >
              Thêm vân tay
            </button>
          </div>
        )
      ),
    },
    {
      key: 'cardNumber' as keyof User,
      header: 'Mã thẻ',
      render: (value: string | undefined, user: User) => (
        value ? (
          <div className="flex items-center justify-center">
            <CreditCard size={18} className="text-primary-600" />
            <span className="ml-2 text-sm text-gray-600">{value}</span>
          </div>
        ) : (
          <button
            onClick={() => handleRequestAddCardNumber(user._id)}
            className="px-2 py-1 text-xs font-medium text-primary-600 border border-primary-600 rounded hover:bg-primary-50"
          >
            Thêm thẻ
          </button>
        )
      ),
    },
    {
      key: '_id' as keyof User,
      header: 'Thao tác',
      render: (_: string | undefined, user: User) => (
        <div className="flex items-center space-x-3">
          <button 
            className="text-gray-400 hover:text-primary-600"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Edit user:', user._id);
            }}
          >
            <Edit size={18} />
          </button>
          <button 
            className="text-gray-400 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClick(user);
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
        <h1 className="text-2xl font-bold text-gray-800">Quản lí nhân viên</h1>
        <button
          onClick={handleAddUser}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Thêm nhân viên
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <UserFilters
          filters={filters}
          onFiltersChange={setFilters}
          totalItems={meta.totalItems}
        />

        <Table<User>
          data={users}
          columns={columns}
          isLoading={loading}
        />

        <Pagination
          currentPage={meta.currentPage}
          totalPages={meta.totalPages}
          onPageChange={(page) => setFilters({ ...filters, page })}
        />
      </div>

      {isAddUserModalOpen && (
        <UserForm
          onSubmit={handleCreateUser}
          onClose={() => setIsAddUserModalOpen(false)}
        />
      )}

      {isSelectDeviceModalOpen && (
        <SelectDeviceModal
          onConfirm={handleDeviceSelect}
          onClose={() => setIsSelectDeviceModalOpen(false)}
          registrationType={registrationType}
          requestStatus={requestStatus}
        />
      )}

      {showDeleteConfirm && userToDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title="Xóa nhân viên"
          message={renderDeleteConfirmMessage(userToDelete)}
          confirmLabel="Xóa nhân viên"
          cancelLabel="Hủy"
          isLoading={isDeleting}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setUserToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default UsersPage;