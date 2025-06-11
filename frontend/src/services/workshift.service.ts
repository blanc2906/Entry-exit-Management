import axios from 'axios';
import { WorkShift, CreateWorkShiftDto } from '../types/workshift';
import { API_URL } from '../config';

const API_PATH = `${API_URL}/workshifts`;

export const workshiftService = {
  async getAll(): Promise<WorkShift[]> {
    const response = await axios.get(API_PATH);
    return response.data;
  },

  async getById(id: string): Promise<WorkShift> {
    const response = await axios.get(`${API_PATH}/${id}`);
    return response.data;
  },

  async create(data: CreateWorkShiftDto): Promise<WorkShift> {
    const response = await axios.post(API_PATH, data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateWorkShiftDto>): Promise<WorkShift> {
    const response = await axios.patch(`${API_PATH}/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await axios.delete(`${API_PATH}/${id}`);
  }
}; 