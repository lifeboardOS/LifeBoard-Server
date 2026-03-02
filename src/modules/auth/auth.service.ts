import { Injectable } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { RegisterDto } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ){}

    async registerUser(registerUserDto: RegisterDto) {
        console.log('registerDTO', registerUserDto);

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(registerUserDto.password, saltRounds);
        // Logic for user register
        /* 
        * 1. check if email is already exist
        * 2. hash the password
        * 3. store the user into db
        * 4. generate jwt token
        * 5. send token in response
        */
       const user = await this.userService.createUser({
            ...registerUserDto, 
            password: hashedPassword
       });

       const payload = { sub: user._id }
       const token = await this.jwtService.signAsync(payload);
       console.log(token);

       return {access_token: token};
    }
}
