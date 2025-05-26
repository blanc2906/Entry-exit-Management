// frontend/src/pages/users/[id]/fingerprint.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUserStore } from '../../../store/useUserStore';
import { User } from '../../../types/user';

const UserFingerprintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users, getUserFingerprint, loading, error, clearError } = useUserStore();
  
  const [user, setUser] = useState<User | null>(null);
  const [fingerprintData, setFingerprintData] = useState<{
    userId: string;
    templateData: string;
  } | null>(null);
  const [loadingFingerprint, setLoadingFingerprint] = useState(false);

  useEffect(() => {
    if (id && users.length > 0) {
      const foundUser = users.find(u => u._id === id);
      setUser(foundUser || null);
    }
  }, [id, users]);

  useEffect(() => {
    const loadFingerprintData = async () => {
      if (user && user.fingerTemplate) {
        setLoadingFingerprint(true);
        try {
          const data = await getUserFingerprint(user._id);
          setFingerprintData(data);
        } catch (error) {
          console.error('Error loading fingerprint data:', error);
        } finally {
          setLoadingFingerprint(false);
        }
      }
    };

    loadFingerprintData();
  }, [user, getUserFingerprint]);

  const handleBack = () => {
    navigate(`/users/${id}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading user...</span>
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
            onClick={() => navigate('/users')}
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
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fingerprint Details</h1>
              <p className="mt-2 text-gray-600">{user.name} - {user.userId}</p>
            </div>
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

        {!user.fingerTemplate ? (
          /* No Fingerprint */
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-300 text-8xl mb-6">🔒</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">No Fingerprint Configured</h2>
            <p className="text-gray-600 mb-6">
              This user doesn't have a fingerprint configured yet. 
              Set up fingerprint access for enhanced security.
            </p>
            <button
              onClick={() => navigate(`/users/${user._id}`)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Configure Fingerprint
            </button>
          </div>
        ) : (
          /* Fingerprint Details */
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-3 rounded-full bg-green-100 text-green-600">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Fingerprint Active</h2>
                    <p className="text-gray-600">Biometric access is configured and ready</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>

            {/* Fingerprint Data */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Data</h3>
              
              {loadingFingerprint ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading fingerprint data...</span>
                </div>
              ) : fingerprintData ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      User ID
                    </label>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono">
                        {fingerprintData.userId}
                      </code>
                      <button
                        onClick={() => copyToClipboard(fingerprintData.userId)}
                        className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded hover:bg-gray-50"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Data
                    </label>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={fingerprintData.templateData}
                        className="w-full h-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono resize-none"
                      />
                      <button
                        onClick={() => copyToClipboard(fingerprintData.templateData)}
                        className="absolute top-2 right-2 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 bg-white border border-gray-200 rounded hover:bg-gray-50"
                      >
                        Copy
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      This is the encoded fingerprint template used for biometric matching.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 text-4xl mb-4">⚠️</div>
                  <p className="text-gray-600">Failed to load fingerprint template data</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-2 px-4 py-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Security Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Security Information</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Fingerprint templates are encrypted and cannot be reverse-engineered</li>
                      <li>Each template is unique to the individual and device combination</li>
                      <li>Templates are used for comparison only, not for recreation of actual fingerprints</li>
                      <li>Access to this data is logged and monitored for security purposes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/users/${user._id}`)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 rounded transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>Back to User Profile</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate(`/users/${user._id}/edit`)}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border border-gray-200 rounded transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>Edit User Information</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserFingerprintPage;