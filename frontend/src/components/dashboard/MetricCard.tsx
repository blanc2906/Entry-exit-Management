import React from 'react';
import { DashboardMetric } from '../../types';
import { Users, Cpu, CalendarCheck, ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface MetricCardProps {
  metric: DashboardMetric;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const getIcon = () => {
    switch (metric.icon) {
      case 'users':
        return <Users size={20} className="text-primary-600" />;
      case 'cpu':
        return <Cpu size={20} className="text-secondary-600" />;
      case 'calendar-check':
        return <CalendarCheck size={20} className="text-accent-600" />;
      default:
        return <Users size={20} className="text-primary-600" />;
    }
  };

  const getTrendIcon = () => {
    if (!metric.change) return null;
    
    switch (metric.change.trend) {
      case 'up':
        return <ArrowUp size={16} className="text-green-500" />;
      case 'down':
        return <ArrowDown size={16} className="text-red-500" />;
      case 'neutral':
        return <Minus size={16} className="text-gray-400" />;
      default:
        return null;
    }
  };

  const getTrendColor = () => {
    if (!metric.change) return 'text-gray-500';
    
    switch (metric.change.trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'neutral':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 rounded-lg bg-gray-50">
          {getIcon()}
        </div>
        {metric.change && (
          <div className={`flex items-center ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="text-xs font-medium ml-1">
              {metric.change.value}%
            </span>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-lg font-medium text-gray-500">{metric.title}</h3>
        <p className="text-3xl font-bold text-gray-800 mt-1">{metric.value}</p>
      </div>
    </div>
  );
};

export default MetricCard;