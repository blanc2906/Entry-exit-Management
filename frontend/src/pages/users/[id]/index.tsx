// frontend/src/pages/users/[id]/index.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../../../store/useUserStore';
import { User } from '../../../types/user';
import FingerprintModal from '../components/FingerprintModal';
import CardNumberModal from '../components/CardNumberModal';

// Mock devices data - replace with actual device store
const mockDevices = [
  { _id: '1', deviceMac: 'AA:BB:CC:DD:EE:FF', description: 'Main Entrance' },
  { _id: '2', deviceMac: 'FF:EE:DD:CC:BB:AA', description: 'Office Door' },
];

const UserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users, loading, error, clearError } = useUserStore();
  
  const [user, setUser] = useState<User | null>(null);
  const [fingerprintModalOpen, setFingerprintModalOpen] = useState(false);
  const [cardModalOpen, setCardModalOpen] = useState(false);

  useEffect(() => {
    if (id && users.length > 0) {
      const foundUser = users.find(u => u._id === id);
      setUser(foundUser || null);
    }
  }, [id, users]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleBack = () => {
    navigate('/users');
  };

  const handleEdit = () => {
    if (user) {
      navigate(`/users/${user._id}/edit`);
    }
  };

  const handleAddFingerprint = () => {
    setFingerprintModalOpen(true);
  };

  const handleAddCardNumber = () => {
    setCardModalOpen(true);
  };

  const handleCloseFingerprintModal = () => {
    setFingerprintModalOpen(false);
    clearError();
  };

  const handleCloseCardModal = () => {
    setCardModalOpen(false);
    clearError();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading user details...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">👤</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-4">The user you're looking for doesn't exist.</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={handleBack}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
              <p className="mt-2 text-gray-600">User ID: {user.userId}</p>
            </div>
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Edit User
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
              <button
                onClick={clearError}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Full Name</label>
                  <p className="mt-1 text-sm text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">User ID</label>
                  <p className="mt-1 text-sm text-gray-900">{user.userId}</p>
                </div>
                {user.email && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{user.email}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Created</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
                {user.updatedAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(user.updatedAt)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Access Methods */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Access Methods</h2>
              <div className="space-y-4">
                {/* Fingerprint */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${user.fingerTemplate ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Fingerprint</h3>
                      <p className="text-sm text-gray-500">
                        {user.fingerTemplate ? 'Configured' : 'Not configured'}
                      </p>
                    </div>
                  </div>
                  {!user.fingerTemplate && (
                    <button
                      onClick={handleAddFingerprint}
                      className="px-3 py-1 text-sm font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
                    >
                      Add Fingerprint
                    </button>
                  )}
                </div>

                {/* Card Number */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${user.cardNumber ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">Access Card</h3>
                      <p className="text-sm text-gray-500">
                        {user.cardNumber ? `Card: ${user.cardNumber}` : 'Not configured'}
                      </p>
                    </div>
                  </div>
                  {!user.cardNumber && (
                    <button
                      onClick={handleAddCardNumber}
                      className="px-3 py-1 text-sm font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
                    >
                      Add Card
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Devices Access</span>
                  <span className="text-sm font-medium text-gray-900">{user.devices.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">History Records</span>
                  <span className="text-sm font-medium text-gray-900">{user.history.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Access Methods</span>
                  <span className="text-sm font-medium text-gray-900">
                    {(user.fingerTemplate ? 1 : 0) + (user.cardNumber ? 1 : 0)} / 2
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/users/${user._id}/fingerprint`)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  View Fingerprint Details
                </button>
                <button
                  onClick={() => navigate(`/history?userId=${user._id}`)}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  View Attendance History
                </button>
                <button
                  onClick={handleEdit}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors"
                >
                  Edit User Information
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        <FingerprintModal
          isOpen={fingerprintModalOpen}
          onClose={handleCloseFingerprintModal}
          user={user}
          devices={mockDevices}
        />

        <CardNumberModal
          isOpen={cardModalOpen}
          onClose={handleCloseCardModal}
          user={user}
        />
      </div>
    </div>
  );
};

export default UserDetailPage;