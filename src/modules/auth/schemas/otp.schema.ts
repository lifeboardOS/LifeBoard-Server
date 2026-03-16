import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type otpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp {
    
    @Prop({ required: true })
    email: string;

    @Prop({ required: true })
    otp: string;

    @Prop({ 
        required: true,
        index: { expires: 0 },
    })
    expiresAt: Date;

}

export const OtpSchema = SchemaFactory.createForClass(Otp);