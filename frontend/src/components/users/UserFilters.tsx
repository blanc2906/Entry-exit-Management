import React from 'react';
import { Search } from 'lucide-react';
import { UserFilters as UserFiltersType } from '../../types/user';

interface UserFiltersProps {
  filters: UserFiltersType;
  onFiltersChange: (filters: UserFiltersType) => void;
  totalItems: number;
}

export const UserFilters: React.FC<UserFiltersProps> = ({
  filters,
  onFiltersChange,
  totalItems,
}) => {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({
      ...filters,
      search: e.target.value,
      page: 1, // Reset to first page when searching
    });
  };

  const handleExport = () => {
    console.log('Exporting users data...');
    // Implement export functionality
  };

  return (
    <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Search users..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
        />
        <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
      </div>
    </div>
  );
}; 