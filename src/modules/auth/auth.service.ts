import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { UserService } from 'src/modules/user/user.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
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

        const payload = { 
            sub: user._id,
            email: user.email,
            username: user.username,
        }
        const token = await this.jwtService.signAsync(payload);

        return {access_token: token};
    }

    // login method for User
    async login(loginDto: LoginDto){

        const { identifier, password } = loginDto;
        const normalizedIdentifier = identifier.toLowerCase().trim();

        let user;

        if(normalizedIdentifier.includes('@')){
            user = await this.userService.findByEmail(normalizedIdentifier);
        }else{
            user = await this.userService.findByUsername(normalizedIdentifier);
        }

        if(!user){
            throw new UnauthorizedException('Invalid credentials');
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
