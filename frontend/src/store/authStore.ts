import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  full_name: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('geocast_token'),
  user: (() => {
    try {
      const u = localStorage.getItem('geocast_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })(),
  isAuthenticated: !!localStorage.getItem('geocast_token'),

  login: (token, user) => {
    localStorage.setItem('geocast_token', token);
    localStorage.setItem('geocast_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('geocast_token');
    localStorage.removeItem('geocast_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
