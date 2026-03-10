import { IsString, IsEmail, MinLength, MaxLength, Matches, IsNotEmpty, IsDefined } from 'class-validator';

export class RegisterDto {
    @IsString()
    fullname: string;

    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'username is required' })
    @IsDefined({ message: 'username is required' })
    @MinLength(3)
    @MaxLength(20)
    @Matches(/^[a-zA-Z0-9_]+$/, {
        message: 'Username can contain only letters, numbers, and underscores',
    })
    username: string;

    @IsString()
    password: string;
}