import axios from 'axios';
import { WorkSchedule, UpdateWorkScheduleDto, WorkShift } from '../types/userWorkSchedule';
import { API_URL } from '../config';

export const workScheduleService = {
  async getUserWorkSchedule(userId: string): Promise<WorkSchedule> {
    const response = await axios.get(`${API_URL}/users/${userId}/work-schedule`);
    return response.data;
  },

  async updateUserWorkSchedule(userId: string, data: UpdateWorkScheduleDto): Promise<WorkSchedule> {
    const response = await axios.put(`${API_URL}/users/${userId}/work-schedule`, data);
    return response.data;
  },

  async removeUserWorkSchedule(userId: string): Promise<void> {
    await axios.delete(`${API_URL}/users/${userId}/work-schedule`);
  },

  async getAllShifts(): Promise<WorkShift[]> {
    const response = await axios.get(`${API_URL}/workshifts`);
    return response.data;
  },

  async getAllSchedules(): Promise<WorkSchedule[]> {
    const response = await axios.get(`${API_URL}/workschedules`);
    return response.data;
  }
}; 