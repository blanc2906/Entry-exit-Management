// frontend/src/pages/users/components/UserCard.tsx
import React from 'react';
import { User } from '../../../types/user';
import { motion } from 'framer-motion';
import { 
  UserIcon, 
  IdentificationIcon, 
  MailIcon, 
  CalendarIcon, 
  DeviceTabletIcon,
  FingerPrintIcon,
  CreditCardIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon
} from '@heroicons/react/outline';

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 p-6 border border-gray-100"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <UserIcon className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <IdentificationIcon className="w-4 h-4 text-gray-400" />
            <p>{user.userId}</p>
          </div>
          {user.email && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
              <MailIcon className="w-4 h-4 text-gray-400" />
              <p>{user.email}</p>
            </div>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          {user.fingerTemplate && (
            <motion.span 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100"
            >
              <FingerPrintIcon className="w-4 h-4 mr-1" />
              Registered
            </motion.span>
          )}
          {user.cardNumber && (
            <motion.span 
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
            >
              <CreditCardIcon className="w-4 h-4 mr-1" />
              {user.cardNumber}
            </motion.span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4 divide-y divide-gray-100">
        <div className="flex justify-between items-center text-sm py-2">
          <div className="flex items-center text-gray-500">
            <CalendarIcon className="w-4 h-4 mr-2" />
            Created
          </div>
          <span className="text-gray-900 font-medium">{formatDate(user.createdAt)}</span>
        </div>
        {user.updatedAt && (
          <div className="flex justify-between items-center text-sm py-2">
            <div className="flex items-center text-gray-500">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Updated
            </div>
            <span className="text-gray-900 font-medium">{formatDate(user.updatedAt)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-sm py-2">
          <div className="flex items-center text-gray-500">
            <DeviceTabletIcon className="w-4 h-4 mr-2" />
            Devices
          </div>
          <span className="text-gray-900 font-medium">{user.devices.length}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onViewDetails(user)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
        >
          <EyeIcon className="w-4 h-4 mr-1.5" />
          Details
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onEdit(user)}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <PencilIcon className="w-4 h-4 mr-1.5" />
          Edit
        </motion.button>
        {!user.fingerTemplate && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddFingerprint(user)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1.5" />
            Fingerprint
          </motion.button>
        )}
        {!user.cardNumber && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddCardNumber(user)}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <PlusIcon className="w-4 h-4 mr-1.5" />
            Card
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

export default UserCard;