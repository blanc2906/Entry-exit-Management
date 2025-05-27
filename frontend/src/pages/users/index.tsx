// frontend/src/pages/users/index.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { User } from '../../types/user';
import { useUserStore } from '../../store/useUserStore';
import UserList from './components/UserList';
import CardNumberModal from './components/CardNumberModal';
import FingerprintModal from './components/FingerprintModal';
import { motion } from 'framer-motion';
import { UserIcon } from '@heroicons/react/outline';

const UsersPage: React.FC = () => {
  const router = useRouter();
  const { users, loading, error, setUsers } = useUserStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isFingerprintModalOpen, setIsFingerprintModalOpen] = useState(false);

  useEffect(() => {
    // Fetch users data from API
    const fetchUsers = async () => {
      try {
        // This would be replaced with your actual API call
        const response = await fetch('http://localhost:3000/api/users');
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };

    fetchUsers();
  }, [setUsers]);

  const handleEditUser = (user: User) => {
    router.push(`/users/${user._id}/edit`);
  };

  const handleViewDetails = (user: User) => {
    router.push(`/users/${user._id}`);
  };

  const handleAddFingerprint = (user: User) => {
    setSelectedUser(user);
    setIsFingerprintModalOpen(true);
  };

  const handleAddCardNumber = (user: User) => {
    setSelectedUser(user);
    setIsCardModalOpen(true);
  };

  const handleCreateUser = () => {
    router.push('/users/create');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Users</h1>
              <p className="mt-2 text-gray-600">
                Manage users, fingerprints, and access cards
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateUser}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm transition-colors"
            >
              <UserIcon className="w-5 h-5 mr-2" />
              Create New User
            </motion.button>
          </div>
        </motion.div>

        {/* Error Display */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm"
          >
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading users</h3>
                <p className="mt-1 text-sm text-red-600">{error}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* User List */}
        <UserList
          users={users}
          loading={loading}
          onEdit={handleEditUser}
          onAddFingerprint={handleAddFingerprint}
          onAddCardNumber={handleAddCardNumber}
          onViewDetails={handleViewDetails}
        />

        {/* Modals */}
        <CardNumberModal
          isOpen={isCardModalOpen}
          onClose={() => setIsCardModalOpen(false)}
          user={selectedUser}
        />
        
        <FingerprintModal
          isOpen={isFingerprintModalOpen}
          onClose={() => setIsFingerprintModalOpen(false)}
          user={selectedUser}
          devices={selectedUser?.devices || []}
        />
      </div>
    </div>
  );
};

export default UsersPage;