import React from 'react';

interface StatsCardProps {
  title: string;
  value: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-semibold text-gray-900 mt-2">{value}</p>
    </div>
  );
};

export default StatsCard; 