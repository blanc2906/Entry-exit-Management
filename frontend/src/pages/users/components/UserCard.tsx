// frontend/src/pages/users/components/UserCard.tsx
import React from 'react';
import { User } from '../../../types/user';

interface UserCardProps {
  user: User;
  onEdit: (user: User) => void;
  onAddFingerprint: (user: User) => void;
  onAddCardNumber: (user: User) => void;
  onViewDetails: (user: User) => void;
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onAddFingerprint,
  onAddCardNumber,
  onViewDetails,
}) => {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{user.name}</h3>
          <p className="text-sm text-gray-600">ID: {user.userId}</p>
          {user.email && (
            <p className="text-sm text-gray-600">{user.email}</p>
          )}
        </div>
        <div className="flex flex-col space-y-1">
          {user.fingerTemplate && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Fingerprint ✓
            </span>
          )}
          {user.cardNumber && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Card: {user.cardNumber}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Created:</span>
          <span className="text-gray-900">{formatDate(user.createdAt)}</span>
        </div>
        {user.updatedAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Updated:</span>
            <span className="text-gray-900">{formatDate(user.updatedAt)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Devices:</span>
          <span className="text-gray-900">{user.devices.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onViewDetails(user)}
          className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
        >
          View Details
        </button>
        <button
          onClick={() => onEdit(user)}
          className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
        >
          Edit
        </button>
        {!user.fingerTemplate && (
          <button
            onClick={() => onAddFingerprint(user)}
            className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded hover:bg-green-100 transition-colors"
          >
            Add Fingerprint
          </button>
        )}
        {!user.cardNumber && (
          <button
            onClick={() => onAddCardNumber(user)}
            className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
          >
            Add Card
          </button>
        )}
      </div>
    </div>
  );
};

export default UserCard;