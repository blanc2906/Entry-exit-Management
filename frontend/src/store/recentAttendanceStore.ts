import { create } from 'zustand';
import { RecentAttendanceRecord } from '../types';

interface RecentAttendanceState {
  records: RecentAttendanceRecord[];
  setRecords: (records: RecentAttendanceRecord[]) => void;
  addRecord: (record: RecentAttendanceRecord) => void;
}

export const useRecentAttendanceStore = create<RecentAttendanceState>((set, get) => ({
  records: [],
  setRecords: (records) => set({ records }),
  addRecord: (record) => {
    set({ records: [record, ...get().records].slice(0, 5) });
  },
})); 