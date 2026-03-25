import { IsString, IsEmail, MinLength, MaxLength, Matches, IsNotEmpty, IsDateString } from 'class-validator';

export class RegisterDto {
    @IsString({ message: 'fullname must be a string' })
    @MinLength(2, { message: 'fullname must be at least 2 characters long' })
    @MaxLength(50, { message: 'fullname cannot exceed 50 characters' })
    @IsNotEmpty({ message: 'fullname is required' })
    fullname: string;

    @IsEmail({}, {message: 'invalid email address'})
    @IsNotEmpty({ message: 'email is required' })
    email: string;

    @IsString({ message: 'username must be a string' })
    @MinLength(3, { message: 'username must be at least 3 characters long' })
    @MaxLength(20, { message: 'username must be at most 20 characters long' })
    @Matches(/^[a-z0-9_]+$/, {
        message: 'Username can contain only lowercase letters, numbers, and underscores',
    })
    @IsNotEmpty({ message: 'username is required' })
    username: string;

    @IsString({ message: 'password must be a string' })
    @MinLength(8, { message: 'password must be at least 8 characters long' })
    @MaxLength(64, { message: 'password cannot exceed 64 characters' })
    @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]+$/, {
        message: 'password must contain at least one letter and one number',
    })
    @IsNotEmpty({ message: 'password is required' })
    password: string;

    @IsDateString({}, { message: 'dateOfBirth must be a valid date' })
    @IsNotEmpty({ message: 'dateOfBirth is required' })
    dateOfBirth: Date;
}