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

const UsersPage: React.FC = () => {
  const {
    users,
    selectedUsers,
    loading,
    error,
    meta,
    fetchUsers,
    handleSelectAll,
    handleSelectUser,
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
    success: boolean;
  }>({
    loading: false,
    error: null,
    success: false,
  });

  // State for delete confirmation
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers(filters);
  }, [fetchUsers, filters]);

  const handleAddUser = () => {
    setIsAddUserModalOpen(true);
  };

  const handleCreateUser = async (userData: { userId: string; name: string }) => {
    try {
      await userService.createUser(userData);
      setIsAddUserModalOpen(false);
      fetchUsers(filters);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleRequestAddFingerprint = (userId: string) => {
    setSelectedUserId(userId);
    setRegistrationType('fingerprint');
    setIsSelectDeviceModalOpen(true);
  };

  const handleRequestAddCardNumber = (userId: string) => {
    setSelectedUserId(userId);
    setRegistrationType('card');
    setIsSelectDeviceModalOpen(true);
  };

  const handleDeviceSelect = async (deviceId: string) => {
    setRequestStatus({ loading: true, error: null, success: false });
    try {
      if (registrationType === 'fingerprint') {
        await userService.requestAddFingerprint(selectedUserId, deviceId);
      } else {
        await userService.requestAddCardNumber(selectedUserId, deviceId);
      }
      setRequestStatus({ loading: false, error: null, success: true });
      setTimeout(() => {
        setIsSelectDeviceModalOpen(false);
        setRequestStatus({ loading: false, error: null, success: false });
      }, 1500);
    } catch (error) {
      console.error(`Error requesting ${registrationType} registration:`, error);
      setRequestStatus({
        loading: false,
        error: `Failed to request ${registrationType} registration`,
        success: false,
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
      <p>Are you sure you want to delete this user?</p>
      <div className="bg-gray-50 p-3 rounded-lg">
        <div className="font-medium">{user.name}</div>
        <div className="text-sm text-gray-500">{user.userId}</div>
        {user.email && <div className="text-sm text-gray-500">{user.email}</div>}
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
      header: 'User ID',
      render: (value: string | undefined) => value || '',
    },
    { 
      key: 'name' as keyof User, 
      header: 'Name',
      render: (value: string | undefined) => value || '',
    },
    { 
      key: 'email' as keyof User, 
      header: 'Email',
      render: (value: string | undefined) => value || '',
    },
    {
      key: 'fingerTemplate' as keyof User,
      header: 'Fingerprint',
      render: (value: string | undefined, user: User) => (
        value ? (
          <div className="flex items-center justify-center">
            <Fingerprint size={18} className="text-primary-600" />
          </div>
        ) : (
          <button
            onClick={() => handleRequestAddFingerprint(user._id)}
            className="px-2 py-1 text-xs font-medium text-primary-600 border border-primary-600 rounded hover:bg-primary-50"
          >
            Add Fingerprint
          </button>
        )
      ),
    },
    {
      key: 'cardNumber' as keyof User,
      header: 'Card Number',
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
            Add Card
          </button>
        )
      ),
    },
    {
      key: '_id' as keyof User,
      header: 'Actions',
      render: (_: string | undefined, user: User) => (
        <div className="flex items-center space-x-3">
          <button 
            className="text-gray-400 hover:text-primary-600"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Settings for user:', user._id);
            }}
          >
            <Settings size={18} />
          </button>
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
            {isDeleting && userToDelete?._id === user._id ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash size={18} />
            )}
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
        <h1 className="text-2xl font-bold text-gray-800">Users Management</h1>
        <button
          onClick={handleAddUser}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table<User>
          data={users}
          columns={columns}
          isLoading={loading}
          selectable
          selectedIds={selectedUsers}
          onSelectAll={handleSelectAll}
          onSelectItem={handleSelectUser}
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
          onSelect={handleDeviceSelect}
          onClose={() => {
            setIsSelectDeviceModalOpen(false);
            setRequestStatus({ loading: false, error: null, success: false });
          }}
          registrationType={registrationType}
          requestStatus={requestStatus}
        />
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete User"
        message={userToDelete ? renderDeleteConfirmMessage(userToDelete) : ''}
        confirmLabel="Delete User"
        cancelLabel="Cancel"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setUserToDelete(null);
        }}
      />
    </div>
  );
};

export default UsersPage;