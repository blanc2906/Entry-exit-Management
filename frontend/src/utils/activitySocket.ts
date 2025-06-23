import { io, Socket } from 'socket.io-client';

export interface RecentActivity {
  _id: string;
  user: any;
  check_in_device?: any;
  check_out_device?: any;
  date: string;
  time_in?: string;
  time_out?: string;
  check_in_auth_method?: string;
  check_out_auth_method?: string;
}

export interface NotificationEvent {
  type: 'fingerprint_added' | 'fingerprint_failed' | 'card_added' | 'card_failed';
  message: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
  timestamp: string;
  success?: boolean;
  error?: string;
}

let socket: Socket | null = null;
let cachedActivities: RecentActivity[] = [];
let listeners: ((activities: RecentActivity[]) => void)[] = [];
let notificationListeners: ((notification: NotificationEvent) => void)[] = [];

export function initActivitySocket() {
  if (!socket) {
    socket = io('http://localhost:3000');
    socket.on('recent-activity', (activity: RecentActivity) => {
      cachedActivities = [activity, ...cachedActivities].slice(0, 5);
      listeners.forEach(fn => fn([...cachedActivities]));
    });
    
    // Lắng nghe thông báo fingerprint và card
    socket.on('fingerprint-notification', (notification: NotificationEvent) => {
      notificationListeners.forEach(fn => fn(notification));
    });
  }
}

export function subscribeActivity(fn: (activities: RecentActivity[]) => void) {
  listeners.push(fn);
  fn([...cachedActivities]);
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
}

export function subscribeNotification(fn: (notification: NotificationEvent) => void) {
  notificationListeners.push(fn);
  return () => {
    notificationListeners = notificationListeners.filter(l => l !== fn);
  };
}

// Backward compatibility
export function subscribeFingerprintNotification(fn: (notification: NotificationEvent) => void) {
  return subscribeNotification(fn);
}
