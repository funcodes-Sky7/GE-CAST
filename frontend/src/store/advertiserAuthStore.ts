import { create } from 'zustand';

export interface AdvertiserUser {
  id: number;
  email: string;
  full_name: string;
  company_name?: string;
  phone?: string;
  role: 'ADVERTISER';
}

interface AdvertiserAuthState {
  token: string | null;
  user: AdvertiserUser | null;
  isAuthenticated: boolean;
  login: (token: string, user: AdvertiserUser) => void;
  logout: () => void;
  setUser: (user: AdvertiserUser) => void;
}

const TOKEN_KEY = 'geocast_adv_token';
const USER_KEY  = 'geocast_adv_user';

export const useAdvertiserAuthStore = create<AdvertiserAuthState>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: (() => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })(),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY),

  login: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  setUser: (user) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },
}));
