import { IsEmail } from "class-validator";
import type { ResendOtpRequest } from "@shared/auth.interfaces";

export class ResendOtpDto implements ResendOtpRequest {

    @IsEmail()
    email: string;
}