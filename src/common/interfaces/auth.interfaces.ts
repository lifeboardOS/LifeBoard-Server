export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  profilePicture?: string;
  googleId?: string;
  provider?: string;
  dob?: string;
  isEmailVerified: boolean;
  isProfileCompleted: boolean;
  locale?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  message?: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  fullname: string;
  email: string;
  username: string;
  password: string;
  dateOfBirth: string | Date;
}

export interface VerifyEmailRequest {
  email: string;
  otp: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  password: string;
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  errors?: { field: string; message: string }[];
}
