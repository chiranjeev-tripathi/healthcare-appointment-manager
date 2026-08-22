import api from './api';
import { AuthUser } from '../types';

export const authService = {
  login: async (credentials: any) => {
    const { data } = await api.post<AuthUser>('/auth/login', credentials);
    return data;
  },
  register: async (userData: any) => {
    const { data } = await api.post<AuthUser>('/auth/register', userData);
    return data;
  },
  getMe: async () => {
    const { data } = await api.get<AuthUser>('/auth/me');
    return data;
  }
};
