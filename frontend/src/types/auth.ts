export interface User {
  email: string;
}

export interface AuthResponse {
  token: string;
  refresh_token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  inviteCode: string;
  zulipEmail: string;
  zulipToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}
