// frontend/src/pages/users/components/UserList.tsx
import React, { useState, useMemo } from 'react';
import { User } from '../../../types/user';
import UserCard from './UserCard';
import { motion } from 'framer-motion';
import { 
  SearchIcon,
  FilterIcon,
  SortAscendingIcon,
  SortDescendingIcon,
  UserGroupIcon
} from '@heroicons/react/outline';

interface UserListProps {
  users: User[];
  loading: boolean;
  onEdit: (user: User) => void;
  onAddFingerprint: (user: User) => void;
  onAddCardNumber: (user: User) => void;
  onViewDetails: (user: User) => void;
}

const UserSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 animate-pulse">
    <div className="flex items-start justify-between mb-4">
      <div className="flex-1">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="flex flex-col space-y-2">
        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
      </div>
    </div>
    <div className="space-y-2 mb-4 divide-y divide-gray-100">
      <div className="flex justify-between items-center py-2">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
      <div className="flex justify-between items-center py-2">
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
    <div className="flex gap-2">
      <div className="h-8 bg-gray-200 rounded-lg w-20"></div>
      <div className="h-8 bg-gray-200 rounded-lg w-20"></div>
    </div>
  </div>
);

const UserList: React.FC<UserListProps> = ({
  users,
  loading,
  onEdit,
  onAddFingerprint,
  onAddCardNumber,
  onViewDetails,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState<'all' | 'with-fingerprint' | 'with-card' | 'without-fingerprint' | 'without-card'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user => {
      const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesFilter = (() => {
        switch (filterBy) {
          case 'with-fingerprint':
            return !!user.fingerTemplate;
          case 'with-card':
            return !!user.cardNumber;
          case 'without-fingerprint':
            return !user.fingerTemplate;
          case 'without-card':
            return !user.cardNumber;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesFilter;
    });

    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case 'updated':
          aValue = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
          bValue = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [users, searchTerm, filterBy, sortBy, sortOrder]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <UserSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Search and Filter Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Users
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, ID, or email"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="filter" className="block text-sm font-medium text-gray-700 mb-2">
              Filter By
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FilterIcon className="h-5 w-5 text-gray-400" />
              </div>
              <select
                id="filter"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
              >
                <option value="all">All Users</option>
                <option value="with-fingerprint">With Fingerprint</option>
                <option value="without-fingerprint">Without Fingerprint</option>
                <option value="with-card">With Card</option>
                <option value="without-card">Without Card</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="name">Name</option>
              <option value="created">Created Date</option>
              <option value="updated">Updated Date</option>
            </select>
          </div>

          <div>
            <label htmlFor="order" className="block text-sm font-medium text-gray-700 mb-2">
              Order
            </label>
            <button
              onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
              className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
              {sortOrder === 'asc' ? (
                <SortAscendingIcon className="h-5 w-5 text-gray-400" />
              ) : (
                <SortDescendingIcon className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center px-1">
        <div className="flex items-center text-sm text-gray-600">
          <UserGroupIcon className="h-5 w-5 text-gray-400 mr-2" />
          <span>
            Showing <span className="font-medium text-gray-900">{filteredAndSortedUsers.length}</span> of{' '}
            <span className="font-medium text-gray-900">{users.length}</span> users
          </span>
        </div>
      </div>

      {/* User Grid */}
      {filteredAndSortedUsers.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="text-gray-400 text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-500 max-w-sm mx-auto">
            {searchTerm || filterBy !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Create your first user to get started.'}
          </p>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {filteredAndSortedUsers.map((user) => (
            <UserCard
              key={user._id}
              user={user}
              onEdit={onEdit}
              onAddFingerprint={onAddFingerprint}
              onAddCardNumber={onAddCardNumber}
              onViewDetails={onViewDetails}
            />
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default UserList;