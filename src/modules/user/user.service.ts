import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { User } from './schemas/user.schema';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private UserModel: Model<User>) {}
    
    async createUser(registerUserDto: RegisterDto) {

        try{
            return await this.UserModel.create({
                fullName: registerUserDto.fullname,
                email: registerUserDto.email,
                password: registerUserDto.password,
            });
        } catch (err: unknown) {
            const e = err as {code?: number}

            const DUPLICATE_KEY_CODE = 11000;
            if(e.code == DUPLICATE_KEY_CODE){
                throw new ConflictException("Email is already taken, try new email");
            }

            throw err;
        }

    }
}
