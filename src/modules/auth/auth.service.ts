import { BadRequestException, ConflictException, Injectable, UnauthorizedException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { LoggerService } from 'src/common/logger/logger.service';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { UserService } from 'src/modules/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

import { OtpService } from './services/otp.service';
import { EmailService } from './services/email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Otp, otpDocument } from './schemas/otp.schema';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginAttempt, LoginAttemptDocument } from './schemas/login-attempt.schema';
import { APP_CONSTANTS } from 'src/constants/app.constants';
import { ERROR_MESSAGES } from 'src/constants/error-messages.constants';

@Injectable()
export class AuthService {
    constructor(
        private readonly logger: LoggerService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly otpService: OtpService,
        private readonly emailService: EmailService,
        private readonly configService: ConfigService,

        @InjectModel(Otp.name)
        private readonly otpModel: Model<otpDocument>,

        @InjectModel(LoginAttempt.name)
        private readonly loginAttemptModel: Model<LoginAttemptDocument>
    ){
        this.logger.setContext(AuthService.name);
    }

    // Google OAuth
    async googleLogin(req: any) {
        if(!req.user){
            throw new UnauthorizedException(ERROR_MESSAGES.ACCESS_DENIED);
        }

        const { email, fullname } = req.user;

        let user = await this.userService.findByEmail(email);

        if(!user){
            user = await this.userService.createUser({
                email: req.user.email,
                fullname: req.user.fullname,
                username: req.user.email.split('@')[0],
                password: "google-oauth",
                dateOfBirth: new Date(),
            } as any); // using as any since we skip some validation on oauth

            user.isEmailVerified = true;
            user.isProfileCompleted = false;
            await user.save();
        }

        const payload = {
            sub: user._id,
            email: user.email,
            username: user.username,
        };

        const accessToken = await this.jwtService.signAsync(payload);
        this.logger.log(`User logged in via Google: ${email}`);

        return { access_token: accessToken };
    }

    // register(signUp) method for User
    async registerUser(registerUserDto: RegisterDto) {
        // Checking for existing conflicts
        const [existingUserByEmail, existingUserByUsername] = await Promise.all([
            this.userService.findByEmail(registerUserDto.email),
            this.userService.findByUsername(registerUserDto.username)
        ]);
        
        if (existingUserByEmail) {
            throw new ConflictException(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
        }

        if(existingUserByUsername) {
            throw new ConflictException(ERROR_MESSAGES.USERNAME_ALREADY_EXISTS);
        }

        const hashedPassword = await bcrypt.hash(registerUserDto.password, APP_CONSTANTS.SALT_ROUNDS);

        const user = await this.userService.createUser({
            ...registerUserDto, 
            password: hashedPassword
        });

        // Try to send OTP, handle failure from external service explicitly
        try {
            const otp = await this.otpService.createOtp(user.email);
            await this.emailService.sendOtp(user.email, otp);
            this.logger.log(`User registered successfully and OTP sent: ${user.email}`);
        } catch (error) {
            this.logger.error(`Failed to send OTP to ${user.email}`, (error as Error).stack);
            // Optionally could throw an error or just return, allowing them to resend
            throw new InternalServerErrorException('Registration succeeded, but failed to send verification email.');
        }

        return {
            message: 'Verification OTP sent to your email'
        };
    }

    // email verification
    async verifyEmail(verifyEmailDto: VerifyEmailDto) {
        const { email, otp } = verifyEmailDto;

        const otpRecord = await this.otpModel.findOne({ email });

        if (!otpRecord) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_OTP);
        }

        if(otpRecord.attempts >= APP_CONSTANTS.OTP_MAX_ATTEMPTS){
            throw new BadRequestException(ERROR_MESSAGES.TOO_MANY_OTP_ATTEMPTS);
        }

        if(otpRecord.expiresAt < new Date()){
            throw new BadRequestException(ERROR_MESSAGES.OTP_EXPIRED);
        }

        const isValidOtp = await bcrypt.compare(otp, otpRecord.otp);

        if(!isValidOtp){
            otpRecord.attempts += 1;
            await otpRecord.save();
            throw new BadRequestException(ERROR_MESSAGES.INVALID_OTP);
        }

        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        user.isEmailVerified = true;
        await user.save();
        await otpRecord.deleteOne();

        const payload = {
            sub: user._id,
            email: user.email,
            username: user.username,
        };

        const token = await this.jwtService.signAsync(payload);
        this.logger.log(`Email verified successfully for: ${email}`);

        return {
            message: 'Email verified successfully',
            access_token: token,
        };
    }

    // Resend OTP
    async resendOtp(resendOtpDto: ResendOtpDto){
        const user = await this.userService.findByEmail(resendOtpDto.email);

        if(!user){
            throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        if(user.isEmailVerified){
            throw new BadRequestException(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED);
        }

        try {
            const otp = await this.otpService.createOtp(resendOtpDto.email);
            await this.emailService.sendOtp(resendOtpDto.email, otp);
            this.logger.log(`OTP resent successfully to: ${resendOtpDto.email}`);
        } catch (error) {
            this.logger.error(`Failed to resend OTP to ${resendOtpDto.email}`, (error as Error).stack);
            throw new InternalServerErrorException('Failed to send verification email.');
        }

        return { message: 'OTP resent successfully' };
    }

    // login method for User
    async login(loginDto: LoginDto){
        const { identifier, password } = loginDto;
        const normalizedIdentifier = identifier.toLowerCase().trim();

        const user = await this.userService.findForAuth(normalizedIdentifier);

        if(!user){
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
        }

        if(!user.isEmailVerified){
            throw new UnauthorizedException(ERROR_MESSAGES.PLEASE_VERIFY_EMAIL);
        }

        const attempts = await this.loginAttemptModel.countDocuments({ identifier: normalizedIdentifier });

        if(attempts >= APP_CONSTANTS.MAX_LOGIN_ATTEMPTS){
            throw new UnauthorizedException(ERROR_MESSAGES.TOO_MANY_LOGIN_ATTEMPTS);
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if(!isPasswordValid){
            await this.loginAttemptModel.create({
                identifier: normalizedIdentifier,
                expiresAt: new Date(Date.now() + APP_CONSTANTS.LOGIN_ATTEMPT_LOCKOUT_MS)
            });
            this.logger.warn(`Failed login attempt for: ${normalizedIdentifier}`);
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_CREDENTIALS);
        }

        // cleanup on successful login
        await this.loginAttemptModel.deleteMany({ identifier: normalizedIdentifier });

        const payload = {
            sub: user._id,
            username: user.username,
            email: user.email,
        };

        const accessTokenSecret = this.configService.get<string>('jwt.accessSecret')!;
        const refreshTokenSecret = this.configService.get<string>('jwt.refreshSecret')!;

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: accessTokenSecret,
            expiresIn: APP_CONSTANTS.JWT_ACCESS_EXPIRATION_TIME as any,
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: refreshTokenSecret,
            expiresIn: APP_CONSTANTS.JWT_REFRESH_EXPIRATION_TIME as any,
        });

        const hashedRefreshToken = await bcrypt.hash(refreshToken, APP_CONSTANTS.SALT_ROUNDS);

        user.refreshToken = hashedRefreshToken;
        await user.save();

        this.logger.log(`User logged in successfully: ${user.email}`);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
        };
    }

    // Refresh token
    async refreshToken(refreshToken: string){
        try {
            const refreshTokenSecret = this.configService.get<string>('jwt.refreshSecret')!;
            const accessTokenSecret = this.configService.get<string>('jwt.accessSecret')!;
            
            // verify token
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: refreshTokenSecret,
            });

            // find user
            const user = await this.userService.findById(payload.sub);

            if(!user || !user.refreshToken){
                throw new UnauthorizedException(ERROR_MESSAGES.ACCESS_DENIED);
            }

            if(!user.isEmailVerified){
                throw new UnauthorizedException(ERROR_MESSAGES.EMAIL_NOT_VERIFIED);
            }

            // compare hashed token
            const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

            if(!isMatch){
                throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
            }

            // Generate new access token
            const newAccessToken = await this.jwtService.signAsync(
                {
                    sub: payload.sub,
                    email: payload.email,
                    username: payload.username,
                },
                {
                    secret: accessTokenSecret,
                    expiresIn: APP_CONSTANTS.JWT_ACCESS_EXPIRATION_TIME as any,
                },
            );

            this.logger.log(`Token refreshed successfully for: ${payload.email}`);

            return { access_token: newAccessToken };
        } catch (error) {
            // Log verification errors explicitly, since jwtService.verifyAsync could throw and we want to return 401
            if (!(error instanceof HttpException)) {
                this.logger.warn(`Failed token refresh: ${(error as Error).message}`);
            }
            throw new UnauthorizedException(ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
        }
    }

    // Forgot Password
    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
        const user = await this.userService.findByEmail(forgotPasswordDto.email);

        if (!user) {
            throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        try {
            const otp = await this.otpService.createOtp(user.email);
            await this.emailService.sendOtp(user.email, otp);
            this.logger.log(`Forgot password OTP sent to: ${user.email}`);
        } catch (error) {
            this.logger.error(`Failed to send forgot password OTP to ${user.email}`, (error as Error).stack);
            throw new InternalServerErrorException('Failed to send verification email.');
        }

        return { message: 'Reset code sent to your email' };
    }

    // Reset Password
    async resetPassword(resetPasswordDto: ResetPasswordDto) {
        const { email, otp, password } = resetPasswordDto;

        const otpRecord = await this.otpModel.findOne({ email });

        if (!otpRecord) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_OTP);
        }

        const isValidOtp = await bcrypt.compare(otp, otpRecord.otp);

        if (!isValidOtp) {
            throw new BadRequestException(ERROR_MESSAGES.INVALID_OTP);
        }

        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new BadRequestException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        const hashedPassword = await bcrypt.hash(password, APP_CONSTANTS.SALT_ROUNDS);
        user.password = hashedPassword;
        await user.save();
        await otpRecord.deleteOne();

        this.logger.log(`Password reset successfully for: ${email}`);

        return { message: 'Password reset successfully' };
    }

    // Logout
    async logout(logoutDto: { userId: string }) {
        const user = await this.userService.findById(logoutDto.userId);

        if(!user){
            throw new UnauthorizedException(ERROR_MESSAGES.USER_NOT_FOUND);
        }

        // remove refresh token
        user.refreshToken = " ";
        await user.save();
        
        this.logger.log(`User logged out successfully: ${user.email}`);

        return { message: 'Logged out successfully' };
    }
}
