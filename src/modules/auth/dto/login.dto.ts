import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import type { LoginRequest } from '@shared/auth.interfaces';

export class LoginDto implements LoginRequest {
  
  @IsString({ message: 'username or email must be a string' })
  @IsNotEmpty({ message: 'username or email is required' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  identifier: string;

  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password is required' })
  password: string;
}