import api from './api';

export const visitService = {
  submitNotes: async (appointmentId: string, notes: any) => {
    const res = await api.post(`/visits/${appointmentId}/notes`, notes);
    return res.data;
  },
  regenerateSummary: async (appointmentId: string) => {
    const res = await api.post(`/visits/${appointmentId}/summary/regenerate`);
    return res.data;
  }
};
