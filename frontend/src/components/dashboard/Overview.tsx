import React from 'react';
import { DashboardMetric } from '../../types';
import MetricCard from './MetricCard';

interface OverviewProps {
  metrics: DashboardMetric[];
}

const Overview: React.FC<OverviewProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {metrics.map((metric, index) => (
        <MetricCard key={index} metric={metric} />
      ))}
    </div>
  );
};

export default Overview;