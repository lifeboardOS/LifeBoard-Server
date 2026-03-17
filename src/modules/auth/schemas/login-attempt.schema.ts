import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";

export type LoginAttemptDocument = HydratedDocument<LoginAttempt>;

@Schema({ timestamps: true })
export class LoginAttempt {

    @Prop({ required: true })
    identifier: string;

    @Prop({
        required: true,
        index: { expires: 60 }
    })
    expiresAt: Date;

}

export const LoginAttemptSchema = SchemaFactory.createForClass(LoginAttempt);