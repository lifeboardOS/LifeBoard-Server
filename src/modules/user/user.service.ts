import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}
    
    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
    }

    async findByUsername(username: string): Promise<UserDocument | null>{
        return this.userModel.findOne({ username: username.toLowerCase() }).exec();
    }
    
    async createUser(registerUserDto: RegisterDto) {

        try{
            return await this.userModel.create({
                fullName: registerUserDto.fullname.trim(),
                username: registerUserDto.username.trim().toLowerCase(),
                email: registerUserDto.email.trim().toLowerCase(),
                password: registerUserDto.password,
            });
        } catch (err: unknown) {
            const e = err as {code?: number};

            const DUPLICATE_KEY_CODE = 11000;
            if(e.code === DUPLICATE_KEY_CODE){
                const field = Object.keys((err as any).keyPattern)[0];
                throw new ConflictException(`${field} already exists`);
            }

            throw err;
        }

    }
}
