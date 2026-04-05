import { IsEmail } from 'class-validator';
import type { ForgotPasswordRequest } from '@shared/auth.interfaces';

export class ForgotPasswordDto implements ForgotPasswordRequest {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}
