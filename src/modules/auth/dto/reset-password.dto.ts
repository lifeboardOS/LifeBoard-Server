import { IsEmail, IsString, MinLength } from 'class-validator';
import type { ResetPasswordRequest } from '@shared/auth.interfaces';

export class ResetPasswordDto implements ResetPasswordRequest {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'OTP must be a string' })
  otp: string;

  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
