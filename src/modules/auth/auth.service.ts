import { BadRequestException, ConflictException, Injectable, UnauthorizedException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { LoggerService } from 'src/common/logger/logger.service';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserService } from 'src/modules/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import { OtpService } from './services/otp.service';
import { EmailService } from './services/email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { Otp, otpDocument } from './schemas/otp.schema';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginAttempt, LoginAttemptDocument } from './schemas/login-attempt.schema';

@Injectable()
export class AuthService {
    constructor(
        private readonly logger: LoggerService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly otpService: OtpService,
        private readonly emailService: EmailService,

        @InjectModel(Otp.name)
        private readonly otpModel: Model<otpDocument>,

        @InjectModel(LoginAttempt.name)
        private readonly loginAttemptModel: Model<LoginAttemptDocument>
    ){
        this.logger.setContext(AuthService.name);
    }

    private handleError(operation: string, error: any) {
        this.logger.error(`Error during ${operation}: ${error.message}`, error.stack);
        if (error instanceof HttpException) {
            throw error;
        }
        throw new InternalServerErrorException(`An unexpected error occurred during ${operation}`);
    }

    // Google OAuth
    async googleLogin(req) {
        try {
            if(!req.body){
                throw new UnauthorizedException();
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
                });

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

            return {
                access_token: accessToken,
            };
        } catch (error) {
            this.handleError('googleLogin', error);
        }
    }

    // register(signUp) method for User
    async registerUser(registerUserDto: RegisterDto) {
        try {
            const existingUserByEmail = await this.userService.findByEmail(registerUserDto.email);
            if (existingUserByEmail) {
                throw new ConflictException('Email already exists');
            }

            const existingUserByUsername = await this.userService.findByUsername(registerUserDto.username);
            if(existingUserByUsername) {
                throw new ConflictException('Username already exists');
            }

            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(registerUserDto.password, saltRounds);

            const user = await this.userService.createUser({
                ...registerUserDto, 
                password: hashedPassword
            });

            const otp = await this.otpService.createOtp(user.email);

            await this.emailService.sendOtp(user.email, otp);

            return {
                message: 'Verification OTP sent to your email'
            };
        } catch (error) {
            this.handleError('registerUser', error);
        }
    }

    // email verification
    async verifyEmail(verifyEmailDto: VerifyEmailDto) {
        try {
            const { email, otp } = verifyEmailDto;

            const otpRecord = await this.otpModel.findOne({ email });

            if (!otpRecord) {
                throw new BadRequestException('Invalid OTP');
            }

            if(otpRecord.attempts >= 5){
                throw new BadRequestException('Too many OTP attempts. Request a new OTP');
            }

            if(otpRecord.expiresAt < new Date()){
                throw new BadRequestException('OTP expired');
            }

            const isValidOtp = await bcrypt.compare(otp, otpRecord.otp);

            if(!isValidOtp){
                otpRecord.attempts += 1;
                await otpRecord.save();
                throw new BadRequestException('Invalid OTP');
            }

            const user = await this.userService.findByEmail(email);

            if (!user) {
                throw new BadRequestException('User not found');
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

            return {
                message: 'Email verified successfully',
                access_token: token,
            };
        } catch (error) {
            this.handleError('verifyEmail', error);
        }
    }

    // Resend OTP
    async resendOtp(resendOtpDto: ResendOtpDto){
        try {
            const user = await this.userService.findByEmail(resendOtpDto.email);

            if(!user){
                throw new BadRequestException('User not found');
            }

            if(user.isEmailVerified){
                throw new BadRequestException('Email already verified');
            }

            const otp = await this.otpService.createOtp(resendOtpDto.email);

            await this.emailService.sendOtp(resendOtpDto.email, otp);

            return {
                message: 'OTP resent successfully'
            };
        } catch (error) {
            this.handleError('resendOtp', error);
        }
    }

    // login method for User
    async login(loginDto: LoginDto){
        try {
            const { identifier, password } = loginDto;
            const normalizedIdentifier = identifier.toLowerCase().trim();

            const user = await this.userService.findForAuth(normalizedIdentifier);

            if(!user){
                throw new UnauthorizedException('Invalid credentials');
            }

            if(!user.isEmailVerified){
                throw new UnauthorizedException('Please verify your email before logging in');
            }

            const attempts = await this.loginAttemptModel.countDocuments({ identifier });

            if(attempts >= 5){
                throw new UnauthorizedException('Too many login attempts. Try again later.')
            }

            const isPasswordValid = await bcrypt.compare(
                loginDto.password,
                user.password,
            );

            if(!isPasswordValid){
                await this.loginAttemptModel.create({
                    identifier,
                    expiresAt: new Date(Date.now() + 60000)
                });
                throw new UnauthorizedException('Invalid credentials');
            }

            await this.loginAttemptModel.deleteMany({ identifier });

            const payload = {
                sub: user._id,
                username: user.username,
                email: user.email,
            };

            const accessToken = await this.jwtService.signAsync(payload, {
                secret: process.env.JWT_ACCESS_SECRET,
                expiresIn: '15m',
            });

            const refreshToken = await this.jwtService.signAsync(payload, {
                secret: process.env.JWT_REFRESH_SECRET,
                expiresIn: '30d',
            });

            const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

            user.refreshToken = hashedRefreshToken;
            await user.save();

            return {
                access_token: accessToken,
                refresh_token: refreshToken,
            };
        } catch (error) {
            this.handleError('login', error);
        }
    }

    // Refresh token
    async refreshToken(refreshToken: string){
        try {
            // verify token
            const payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET,
            });

            // find user
            const user = await this.userService.findById(payload.sub);

            if(!user || !user.refreshToken){
                throw new UnauthorizedException('Access denied');
            }

            if(!user.isEmailVerified){
                throw new UnauthorizedException('Email not verified');
            }

            // compare hashed token
            const isMatch = await bcrypt.compare(refreshToken, user.refreshToken);

            if(!isMatch){
                throw new UnauthorizedException('Invalid refresh token');
            }

            // Generate new access token
            const newAccessToken = await this.jwtService.signAsync(
                {
                    sub: payload.sub,
                    email: payload.email,
                    username: payload.username,
                },
                {
                    secret: process.env.JWT_ACCESS_SECRET,
                    expiresIn: '15m',
                },
            );

            return {
                access_token: newAccessToken,
            };
        } catch (error) {
            if (!(error instanceof HttpException)) {
                this.logger.error(`Error during refreshToken: ${error.message}`, error.stack);
            }
            throw new UnauthorizedException('Invalid refresh token');
        }
    }

    // Logout
    async logout(logoutDto: { userId: string }) {
        try {
            const user = await this.userService.findById(logoutDto.userId);

            if(!user){
                throw new UnauthorizedException('User not found');
            }

            // remove refresh token
            user.refreshToken = " ";
            await user.save();

            return  {
                message: 'Logged out successfully',
            };
        } catch (error) {
            this.handleError('logout', error);
        }
    }
}
