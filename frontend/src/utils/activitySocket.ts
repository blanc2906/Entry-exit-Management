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

let socket: Socket | null = null;
let cachedActivities: RecentActivity[] = [];
let listeners: ((activities: RecentActivity[]) => void)[] = [];

export function initActivitySocket() {
  if (!socket) {
    socket = io('http://localhost:3000');
    socket.on('recent-activity', (activity: RecentActivity) => {
      cachedActivities = [activity, ...cachedActivities].slice(0, 5);
      listeners.forEach(fn => fn([...cachedActivities]));
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
