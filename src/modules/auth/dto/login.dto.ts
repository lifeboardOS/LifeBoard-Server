import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  
  @IsString({ message: 'username or email must be a string' })
  @IsNotEmpty({ message: 'username or email is required' })
  identifier: string;

  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password is required' })
  password: string;
}