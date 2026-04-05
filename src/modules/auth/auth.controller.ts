import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LogoutDto } from './dto/logout.dto';
import { AuthGuard } from '@nestjs/passport';
import { Public } from 'src/common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService){}

    @Public()
    @Get('google')
    @UseGuards(AuthGuard('google'))
    googleAuth() {}

    @Public()
    @Get('google/callback')
    @UseGuards(AuthGuard('google'))
    async googleAuthCallback(@Req() req, @Res() res: any) {
        const { access_token, refresh_token, isNewUser } = await this.authService.googleLogin(req);
        const frontendUrl = process.env.FRONTEND_URL || 'https://dev.lifeboardos.com';
        
        const redirectUrl = new URL(`${frontendUrl}/auth/callback`);
        redirectUrl.searchParams.append('access_token', access_token);
        redirectUrl.searchParams.append('refresh_token', refresh_token);
        if (isNewUser) {
            redirectUrl.searchParams.append('new_user', 'true');
        }

        res.redirect(redirectUrl.toString());
    }

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

    @Public()
    @Post('forgot-password')
    async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto){
        return this.authService.forgotPassword(forgotPasswordDto);
    }

    @Public()
    @Post('reset-password')
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto){
        return this.authService.resetPassword(resetPasswordDto);
    }

    @Post('onboarding')
    async completeOnboarding(@Req() req, @Body('dateOfBirth') dateOfBirth: Date){
        return this.authService.completeOnboarding(req.user.sub, dateOfBirth);
    }

    @Post('refresh')
    async refresh(@Body('refreshToken') refreshToken: string){
        return this.authService.refreshToken(refreshToken);
    }

    @Post('logout')
    async logout(@Body() logoutDto: LogoutDto){
        return this.authService.logout(logoutDto);
    }
    
}
