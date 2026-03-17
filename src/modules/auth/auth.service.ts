import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly otpService: OtpService,
        private readonly emailService: EmailService,

        @InjectModel(Otp.name)
        private readonly otpModel: Model<otpDocument>,
    ){}

    // register(signUp) method for User
    async registerUser(registerUserDto: RegisterDto) {

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
    }

    // email verification
    async verifyEmail(verifyEmailDto: VerifyEmailDto) {
        
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
    }

    // Resend OTP
    async resendOtp(resendOtpDto: ResendOtpDto){

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
    }

    // login method for User
    async login(loginDto: LoginDto){

        const { identifier, password } = loginDto;
        const normalizedIdentifier = identifier.toLowerCase().trim();

        const user = await this.userService.findForAuth(normalizedIdentifier);

        if(!user){
            throw new UnauthorizedException('Invalid credentials');
        }

        if(!user.isEmailVerified){
            throw new UnauthorizedException('Please verify your email before logging in');
        }

        const isPasswordValid = await bcrypt.compare(
            loginDto.password,
            user.password,
        );

        if(!isPasswordValid){
            throw new UnauthorizedException('Invalid credentials');
        }

        const payload = {
            sub: user._id,
            username: user.username,
        };

        const token = await this.jwtService.signAsync(payload);

        return { access_token: token };
    }
}
