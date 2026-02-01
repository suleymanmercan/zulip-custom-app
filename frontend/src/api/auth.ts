import apiClient from './client';
import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<void> => {
    await apiClient.post('/auth/register', data);
  },

  logout: async (): Promise<void> => {
    // Optional: Call backend logout if needed
    // await apiClient.post('/auth/logout');
  },

  refreshToken: async (token: string): Promise<AuthResponse> => {
    // We send the current refresh token to get a new pair
    const response = await apiClient.post<AuthResponse>('/auth/refresh', { refreshToken: token });
    return response.data;
  },
  
  me: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  }
};
