import axios from 'axios';
import { WorkSchedule, CreateWorkScheduleDto } from '../types/workschedule';
import { API_URL } from '../config';

const API_PATH = `${API_URL}/workschedules`;

export const workscheduleService = {
  async getAll(): Promise<WorkSchedule[]> {
    const response = await axios.get(API_PATH);
    return response.data;
  },
  async getById(id: string): Promise<WorkSchedule> {
    const response = await axios.get(`${API_PATH}/${id}`);
    return response.data;
  },
  async create(data: CreateWorkScheduleDto): Promise<WorkSchedule> {
    const response = await axios.post(API_PATH, data);
    return response.data;
  },
  async update(id: string, data: Partial<CreateWorkScheduleDto>): Promise<WorkSchedule> {
    const response = await axios.patch(`${API_PATH}/${id}`, data);
    return response.data;
  },
  async delete(id: string): Promise<void> {
    await axios.delete(`${API_PATH}/${id}`);
  }
}; 