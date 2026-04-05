import { IsEmail, IsString } from "class-validator";
import type { VerifyEmailRequest } from "@shared/auth.interfaces";

export class VerifyEmailDto implements VerifyEmailRequest {

    @IsEmail()
    email: string;

    @IsString()
    otp: string;
}