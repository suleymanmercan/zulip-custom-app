import { create } from 'zustand';
import { authApi } from '@/api/auth';
import type { User, LoginRequest, RegisterRequest } from '@/types/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // refreshToken is stored in localStorage for MVP demo, 
  // but ideally should be HttpOnly cookie. 
  // We'll store it here to manage the flow.
  refreshTokenStr: string | null; 

  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  setUser: (user: User) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshTokenStr: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,

  setUser: (user) => set({ user }),

  login: async (data) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login(data);
      localStorage.setItem('accessToken', response.token);
      localStorage.setItem('refreshToken', response.refresh_token);
      set({ 
        accessToken: response.token, 
        refreshTokenStr: response.refresh_token,
        isAuthenticated: true 
      });
      // Fetch user details immediately after login
      const user = await authApi.me();
      set({ user });
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      await authApi.register(data);
    } catch (error) {
      console.error('Register failed', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => { // Removed async since it doesn't await anything critical
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ 
      user: null, 
      accessToken: null, 
      refreshTokenStr: null,
      isAuthenticated: false 
    });
    // authApi.logout(); // Fire and forget
  },

  refreshToken: async () => {
    const { refreshTokenStr } = get();
    if (!refreshTokenStr) throw new Error('No refresh token');

    try {
      const response = await authApi.refreshToken(refreshTokenStr);
      localStorage.setItem('accessToken', response.token);
      localStorage.setItem('refreshToken', response.refresh_token);
      set({ 
        accessToken: response.token, 
        refreshTokenStr: response.refresh_token,
        isAuthenticated: true 
      });
    } catch (error) {
        // If refresh fails, we must logout
        get().logout();
        throw error;
    }
  },

  checkAuth: async () => {
      const { accessToken } = get();
      if (!accessToken) return;
      try {
          const user = await authApi.me();
          set({ user, isAuthenticated: true });
      } catch {
          // If check auth fails (e.g. invalid token), try refresh or logout
          try {
              await get().refreshToken();
              const user = await authApi.me();
               set({ user, isAuthenticated: true });
          } catch {
              get().logout();
          }
      }
  }
}));
