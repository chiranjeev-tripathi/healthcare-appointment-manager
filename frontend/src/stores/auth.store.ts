import { create } from 'zustand';
import { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser) => void;
}

export const useAuthStore = create<AuthState>((set) => {
  const storedUser = localStorage.getItem('auth_user');
  const initialUser = storedUser ? JSON.parse(storedUser) : null;

  return {
    user: initialUser,
    isAuthenticated: !!initialUser,
    login: (user) => {
      localStorage.setItem('auth_user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('auth_user');
      set({ user: null, isAuthenticated: false });
    },
    setUser: (user) => {
      localStorage.setItem('auth_user', JSON.stringify(user));
      set({ user });
    },
  };
});
