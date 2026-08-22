import api from './api';
import { Appointment } from '../types';

export const bookingService = {
  holdSlot: async (data: any) => {
    const res = await api.post<Appointment>('/appointments/hold', data);
    return res.data;
  },
  confirmBooking: async (id: string, data: any) => {
    const res = await api.post<Appointment>(`/appointments/${id}/confirm`, data);
    return res.data;
  },
  cancelBooking: async (id: string) => {
    const res = await api.post<Appointment>(`/appointments/${id}/cancel`);
    return res.data;
  },
  completeAppointment: async (id: string) => {
    const res = await api.post<Appointment>(`/appointments/${id}/complete`);
    return res.data;
  },
  getMyAppointments: async (params?: any) => {
    const res = await api.get<Appointment[]>('/appointments', { params });
    return res.data;
  },
  getAppointment: async (id: string) => {
    const res = await api.get<Appointment>(`/appointments/${id}`);
    return res.data;
  }
};
