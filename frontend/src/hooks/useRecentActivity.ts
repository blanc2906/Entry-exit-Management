import { useEffect, useState } from 'react';
import { initActivitySocket, subscribeActivity, RecentActivity, subscribeNotification, NotificationEvent } from '../utils/activitySocket';

export function useRecentActivity(initial: RecentActivity[] = []) {
  const [activities, setActivities] = useState<RecentActivity[]>(initial);

  useEffect(() => {
    initActivitySocket();
    const unsubscribe = subscribeActivity(setActivities);
    return () => unsubscribe();
  }, []);

  return activities;
}

export function useNotification() {
  const [notification, setNotification] = useState<NotificationEvent | null>(null);

  useEffect(() => {
    initActivitySocket();
    const unsubscribe = subscribeNotification(setNotification);
    return () => unsubscribe();
  }, []);

  return notification;
}

// Backward compatibility
export function useFingerprintNotification() {
  return useNotification();
} 