import React, { useState, useEffect } from 'react';
import { X, User, Fingerprint, CreditCard, Trash2, Loader2, UserPlus } from 'lucide-react';
import { User as UserType } from '../../types/user';
import { deviceService } from '../../services/deviceService';
import ConfirmDialog from '../common/ConfirmDialog';

interface DeviceUser extends Omit<UserType, 'fingerId'> {
  fingerId: number;
  cardNumber?: string;
}

interface DeviceUsersModalProps {
  users: DeviceUser[];
  deviceName: string;
  deviceId: string;
  onClose: () => void;
  onUserRemoved: () => void;
  onUserAdded: () => void;
}

const DeviceUsersModal: React.FC<DeviceUsersModalProps> = ({
  users,
  deviceName,
  deviceId,
  onClose,
  onUserRemoved,
  onUserAdded,
}) => {
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<DeviceUser | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  useEffect(() => {
    if (showAddUserModal) {
      fetchAvailableUsers();
    }
  }, [showAddUserModal]);

  const fetchAvailableUsers = async () => {
    try {
      setIsLoading(true);
      const response = await deviceService.getAllUsersNotInDevice(deviceId);
      setAvailableUsers(response.data);
    } catch (error) {
      console.error('Error fetching available users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUsers = async () => {
    try {
      setIsLoading(true);
      await Promise.all(
        selectedUsers.map((userId) => deviceService.addUserToDevice(deviceId, userId))
      );
      onUserAdded();
      setShowAddUserModal(false);
      setSelectedUsers([]);
    } catch (error) {
      console.error('Error adding users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString();
    } catch (error) {
      return '-';
    }
  };

  const handleDeleteClick = (user: DeviceUser) => {
    setUserToDelete(user);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      setDeletingUserId(userToDelete._id);
      await deviceService.removeUserFromDevice(deviceId, userToDelete._id);
      onUserRemoved();
    } catch (error) {
      console.error('Error removing user from device:', error);
    } finally {
      setDeletingUserId(null);
      setUserToDelete(null);
      setShowConfirmDialog(false);
    }
  };

  const handleCancelDelete = () => {
    setUserToDelete(null);
    setShowConfirmDialog(false);
  };

  const handleDeleteAllUsers = async () => {
    try {
      setIsDeletingAll(true);
      await deviceService.deleteAllUsers(deviceId);
      onUserRemoved();
    } catch (error) {
      console.error('Error deleting all users:', error);
    } finally {
      setIsDeletingAll(false);
      setShowDeleteAllConfirm(false);
    }
  };

  const renderConfirmMessage = (user: DeviceUser) => (
    <div className="space-y-2">
      <p>Are you sure you want to remove this user from the device?</p>
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
      </div>
    </div>
  );

  const renderDeleteAllConfirmMessage = () => (
    <div className="space-y-2">
      <p>Are you sure you want to remove all users from this device?</p>
      <p className="text-sm text-red-600">This action cannot be undone.</p>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              Users - {deviceName}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto flex-1">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Device Users</h3>
              <div className="flex items-center space-x-2">
                {users.length > 0 && (
                  <button
                    onClick={() => setShowDeleteAllConfirm(true)}
                    disabled={isDeletingAll}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 mr-2"
                  >
                    {isDeletingAll ? (
                      <Loader2 size={18} className="animate-spin mr-2" />
                    ) : (
                      <Trash2 size={18} className="mr-2" />
                    )}
                    Delete All Users
                  </button>
                )}
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <UserPlus size={18} className="mr-2" />
                  Add User
                </button>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No users assigned to this device
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                  >
                    <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <User className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">{user.name}</h3>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-500">
                            {formatDate(user.createdAt)}
                          </span>
                          <button
                            onClick={() => handleDeleteClick(user)}
                            disabled={deletingUserId === user._id}
                            className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          >
                            {deletingUserId === user._id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{user.userId}</p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        {user.email && (
                          <div className="text-sm text-gray-600">
                            ✉️ {user.email}
                          </div>
                        )}
                        {user.fingerId && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Fingerprint size={16} className="mr-1" />
                            ID: {user.fingerId}
                          </div>
                        )}
                        {user.cardNumber && (
                          <div className="flex items-center text-sm text-gray-600">
                            <CreditCard size={16} className="mr-1" />
                            {user.cardNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Add Users</h2>
              <button
                onClick={() => setShowAddUserModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-primary-600" />
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No available users to add
                </div>
              ) : (
                <div className="space-y-3">
                  {availableUsers.map((user) => (
                    <div
                      key={user._id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => {
                          setSelectedUsers((prev) =>
                            prev.includes(user._id)
                              ? prev.filter((id) => id !== user._id)
                              : [...prev, user._id]
                          );
                        }}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{user.name}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUsers}
                  disabled={selectedUsers.length === 0 || isLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'Add Selected Users'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Remove User"
        message={userToDelete ? renderConfirmMessage(userToDelete) : ''}
        confirmLabel="Remove User"
        cancelLabel="Cancel"
        isLoading={!!deletingUserId}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      <ConfirmDialog
        isOpen={showDeleteAllConfirm}
        title="Delete All Users"
        message={renderDeleteAllConfirmMessage()}
        confirmLabel="Delete All Users"
        cancelLabel="Cancel"
        isLoading={isDeletingAll}
        onConfirm={handleDeleteAllUsers}
        onCancel={() => setShowDeleteAllConfirm(false)}
      />
    </>
  );
};

export default DeviceUsersModal; 