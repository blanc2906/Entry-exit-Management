import { useEffect, useState } from 'react';
import { initActivitySocket, subscribeActivity, RecentActivity } from '../utils/activitySocket';

export function useRecentActivity(initial: RecentActivity[] = []) {
  const [activities, setActivities] = useState<RecentActivity[]>(initial);

  useEffect(() => {
    initActivitySocket();
    const unsubscribe = subscribeActivity(setActivities);
    return () => unsubscribe();
  }, []);

  return activities;
} 