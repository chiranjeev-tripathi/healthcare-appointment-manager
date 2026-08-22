import api from './api';

export const adminService = {
  getAllAppointments: async (params?: any) => {
    const res = await api.get('/admin/appointments', { params });
    return res.data;
  },
  getSystemHealth: async () => {
    const res = await api.get('/admin/health');
    return res.data;
  },
  createDoctor: async (data: any) => {
    const res = await api.post('/admin/doctors', data);
    return res.data;
  }
};
