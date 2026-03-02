import { IsString, IsEmail } from 'class-validator';

export class RegisterDto {
    @IsString()
    fullname: string;

    @IsEmail()
    email: string;

    @IsString()
    password: string;
}