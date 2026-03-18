import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService){}

    @Post('register')
    async register(@Body() registerUserDto: RegisterDto) {
        return this.authService.registerUser(registerUserDto); 
    }

    @Post('login')
    async login(@Body() loginDto: LoginDto){
        return this.authService.login(loginDto)
    }

    @Post('verify-email')
    async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto){
        return this.authService.verifyEmail(verifyEmailDto);
    }

    @Post('resend-otp')
    async resendOtp(@Body() resendOtpDto: ResendOtpDto){
        return this.authService.resendOtp(resendOtpDto);
    }

    @Post('refresh')
    async refresh(@Body('refreshToken') refreshToken: string){
        return this.authService.refreshToken(refreshToken);
    }
    
}
