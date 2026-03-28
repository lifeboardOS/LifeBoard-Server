import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RegisterDto } from 'src/modules/auth/dto/register.dto';
import { User, UserDocument } from './schemas/user.schema';
import { LoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class UserService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private readonly logger: LoggerService
    ) {
        this.logger.setContext(UserService.name);
    }

    async findForAuth(identifier: string): Promise<UserDocument | null>{
        return this.userModel.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier.toLowerCase() },
            ],
        })
        .select('+password')
        .exec();
    }
    
    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
    }

    async findByUsername(username: string): Promise<UserDocument | null>{
        return this.userModel.findOne({ username: username.toLowerCase() }).select('+password').exec();
    }

    async findById(id: string){
        return this.userModel.findById(id).select('+refreshToken');
    }
    
    async createUser(registerUserDto: RegisterDto) {
        try{
            this.logger.log(`Creating new user: ${registerUserDto.email}`);
            return await this.userModel.create({
                fullName: registerUserDto.fullname,
                username: registerUserDto.username,
                email: registerUserDto.email,
                password: registerUserDto.password,
                dateOfBirth: registerUserDto.dateOfBirth,
            });
        } catch (err: unknown) {
            const e = err as {code?: number};

            const DUPLICATE_KEY_CODE = 11000;
            if(e.code === DUPLICATE_KEY_CODE){
                const field = Object.keys((err as any).keyPattern)[0];
                this.logger.warn(`Duplicate key error: ${field}`);
                throw new ConflictException(`${field} already exists`);
            }
            this.logger.error(`Error in createUser: ${(err as Error).message}`, (err as Error).stack);
            throw err;
        }

    }
}
