import React, { useEffect, useState } from 'react';
import { Plus, Settings, Edit, Trash, Fingerprint, CreditCard, Loader2, Upload } from 'lucide-react';
import { Table } from '../components/common/Table';
import { Pagination } from '../components/common/Pagination';
import { UserFilters } from '../components/users/UserFilters';
import UserForm from '../components/users/UserForm';
import UserEditModal from '../components/users/UserEditModal';
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
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
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

  // State for delete fingerprint/card confirmation
  const [showDeleteFingerprintConfirm, setShowDeleteFingerprintConfirm] = useState(false);
  const [showDeleteCardConfirm, setShowDeleteCardConfirm] = useState(false);
  const [userToDeleteFingerprint, setUserToDeleteFingerprint] = useState<User | null>(null);
  const [userToDeleteCard, setUserToDeleteCard] = useState<User | null>(null);
  const [isDeletingFingerprint, setIsDeletingFingerprint] = useState(false);
  const [isDeletingCard, setIsDeletingCard] = useState(false);

  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);

  // Hook để lắng nghe thông báo fingerprint và card
  const notification = useNotification();

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any[]>([]);

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
      } else if (notification.type === 'fingerprint_deleted') {
        message.success(notification.message);
      } else if (notification.type === 'card_deleted') {
        message.success(notification.message);
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

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  };

  const handleUpdateUser = async (userData: { name?: string; email?: string; workSchedule?: string }) => {
    if (!selectedUser) return;
    
    try {
      await userService.updateUser(selectedUser._id, userData);
      message.success('Cập nhật thông tin nhân viên thành công');
      await fetchUsers(filters);
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw error; // Re-throw để UserEditModal xử lý
    }
  };

  const handleDeleteFingerprintClick = (user: User) => {
    setUserToDeleteFingerprint(user);
    setShowDeleteFingerprintConfirm(true);
  };

  const handleConfirmDeleteFingerprint = async () => {
    if (!userToDeleteFingerprint) return;
    
    try {
      setIsDeletingFingerprint(true);
      await userService.deleteFingerprint(userToDeleteFingerprint._id);
      message.success('Xóa vân tay thành công');
      await fetchUsers(filters);
    } catch (error: any) {
      console.error('Error deleting fingerprint:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa vân tay');
    } finally {
      setIsDeletingFingerprint(false);
      setShowDeleteFingerprintConfirm(false);
      setUserToDeleteFingerprint(null);
    }
  };

  const handleDeleteCardClick = (user: User) => {
    setUserToDeleteCard(user);
    setShowDeleteCardConfirm(true);
  };

  const handleConfirmDeleteCard = async () => {
    if (!userToDeleteCard) return;
    
    try {
      setIsDeletingCard(true);
      await userService.deleteCard(userToDeleteCard._id);
      message.success('Xóa thẻ thành công');
      await fetchUsers(filters);
    } catch (error: any) {
      console.error('Error deleting card:', error);
      message.error(error?.response?.data?.message || 'Có lỗi xảy ra khi xóa thẻ');
    } finally {
      setIsDeletingCard(false);
      setShowDeleteCardConfirm(false);
      setUserToDeleteCard(null);
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const result = await userService.importUsersFromExcel(file);
      setImportResult(result);
      message.success('Import thành công!');
      fetchUsers(filters);
    } catch (error) {
      message.error('Import thất bại!');
    } finally {
      setIsImporting(false);
      e.target.value = '';
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
          <div className="flex items-center justify-center space-x-2">
            <Fingerprint size={18} className="text-primary-600" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteFingerprintClick(user);
              }}
              className="px-2 py-1 text-xs font-medium text-red-600 border border-red-600 rounded hover:bg-red-50"
            >
              Xóa
            </button>
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
          <div className="flex items-center justify-center space-x-2">
            <CreditCard size={18} className="text-primary-600" />
            <span className="text-sm text-gray-600">{value}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCardClick(user);
              }}
              className="px-2 py-1 text-xs font-medium text-red-600 border border-red-600 rounded hover:bg-red-50"
            >
              Xóa
            </button>
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
        <button
          className="flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleEditUser(user);
          }}
          title="Sửa"
        >
          <Edit size={18} className="mr-2" />
          Sửa
        </button>
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
        <div className="flex gap-2">
          <button
            onClick={handleAddUser}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus size={18} className="mr-2" />
            Thêm nhân viên
          </button>
          <label className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
            <Upload size={18} className="mr-2" />
            Import Excel
            <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} className="hidden" disabled={isImporting} />
          </label>
        </div>
      </div>

      {importResult.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 mt-2">
          <h2 className="font-semibold mb-2">Kết quả import:</h2>
          <ul className="list-disc pl-5">
            {importResult.map((r, idx) => (
              <li key={idx} className={r.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                {r.userId}: {r.status} {r.error && `- ${r.error}`}
              </li>
            ))}
          </ul>
        </div>
      )}

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

      {isEditUserModalOpen && selectedUser && (
        <UserEditModal
          isOpen={isEditUserModalOpen}
          onClose={() => setIsEditUserModalOpen(false)}
          user={selectedUser}
          onSubmit={handleUpdateUser}
        />
      )}

      {showDeleteFingerprintConfirm && userToDeleteFingerprint && (
        <ConfirmDialog
          isOpen={showDeleteFingerprintConfirm}
          title="Xóa vân tay"
          message={
            <div className="space-y-2">
              <p>Bạn có chắc chắn muốn xóa vân tay của nhân viên này?</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-700">
                  <div><span className="font-medium">Tên:</span> <span className="font-normal">{userToDeleteFingerprint.name}</span></div>
                  <div><span className="font-medium">Mã nhân viên:</span> <span className="font-normal">{userToDeleteFingerprint.userId}</span></div>
                </div>
                <div className="text-sm text-gray-500 flex items-center mt-2">
                  <Fingerprint size={14} className="mr-1" />
                  Vân tay sẽ bị xóa khỏi tất cả thiết bị
                </div>
              </div>
            </div>
          }
          confirmLabel="Xóa vân tay"
          cancelLabel="Hủy"
          isLoading={isDeletingFingerprint}
          onConfirm={handleConfirmDeleteFingerprint}
          onCancel={() => {
            setShowDeleteFingerprintConfirm(false);
            setUserToDeleteFingerprint(null);
          }}
        />
      )}

      {showDeleteCardConfirm && userToDeleteCard && (
        <ConfirmDialog
          isOpen={showDeleteCardConfirm}
          title="Xóa thẻ"
          message={
            <div className="space-y-2">
              <p>Bạn có chắc chắn muốn xóa thẻ của nhân viên này?</p>
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-700">
                  <div><span className="font-medium">Tên:</span> <span className="font-normal">{userToDeleteCard.name}</span></div>
                  <div><span className="font-medium">Mã nhân viên:</span> <span className="font-normal">{userToDeleteCard.userId}</span></div>
                  <div><span className="font-medium">Mã thẻ:</span> <span className="font-normal">{userToDeleteCard.cardNumber}</span></div>
                </div>
              </div>
            </div>
          }
          confirmLabel="Xóa thẻ"
          cancelLabel="Hủy"
          isLoading={isDeletingCard}
          onConfirm={handleConfirmDeleteCard}
          onCancel={() => {
            setShowDeleteCardConfirm(false);
            setUserToDeleteCard(null);
          }}
        />
      )}
    </div>
  );
};

export default UsersPage;