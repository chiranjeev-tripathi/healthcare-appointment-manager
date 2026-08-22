import api from './api';
import { DoctorProfile, DoctorLeave, TimeSlot, PaginatedResponse } from '../types';

export const doctorService = {
  listDoctors: async (params?: any) => {
    const { data } = await api.get<PaginatedResponse<DoctorProfile>>('/doctors', { params });
    return data;
  },
  getDoctorProfile: async (id: string) => {
    const { data } = await api.get<DoctorProfile>(`/doctors/${id}`);
    return data;
  },
  getDoctorSlots: async (id: string, date: string) => {
    const { data } = await api.get<TimeSlot[]>(`/doctors/${id}/slots`, { params: { date } });
    return data;
  },
  updateProfile: async (profileData: any) => {
    const { data } = await api.put<DoctorProfile>('/doctors/profile', profileData);
    return data;
  },
  addLeave: async (leaveData: any) => {
    const { data } = await api.post<DoctorLeave>('/doctors/leave', leaveData);
    return data;
  },
  removeLeave: async (id: string) => {
    await api.delete(`/doctors/leave/${id}`);
  },
  getLeaves: async () => {
    const { data } = await api.get<DoctorLeave[]>('/doctors/leave');
    return data;
  }
};
