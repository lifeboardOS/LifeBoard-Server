import { BadGatewayException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Otp, otpDocument } from "../schemas/otp.schema";
import * as bcrypt from 'bcrypt';

@Injectable()
export class OtpService{

    constructor(
        @InjectModel(Otp.name)
        private otpModel: Model<otpDocument>
    ) {}

    generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async createOtp(email: string) {

        const lastOtp = await this.otpModel
        .findOne({ email })
        .sort({ createdAt: -1 });

        if(lastOtp){
            const diff = Date.now() - lastOtp.createdAt.getTime();

            if(diff < 60000){
                throw new BadGatewayException('Please wait before requesting another OTP');
            }
        }

        // delet the existing OTP before creating the new one.
        await this.otpModel.deleteMany({ email });

        const otp = this.generateOtp();

        const saltRounds = 10;
        const hashedOtp = await bcrypt.hash(otp, saltRounds);

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await this.otpModel.create({
            email,
            otp: hashedOtp,
            expiresAt
        });

        return otp;
    }
}