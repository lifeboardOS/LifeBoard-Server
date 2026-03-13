import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Otp, otpDocument } from "../schemas/otp.schema";

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

        const otp = this.generateOtp();

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        await this.otpModel.create({
            email,
            otp,
            expiresAt
        });

        return otp;
    }
}