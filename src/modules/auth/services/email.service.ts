import * as nodemailer from 'nodemailer';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {

    private transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    async sendOtp(email: string, otp: string) {

        await this.transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'verify your Lifeboard account',
            text: `Your verification OTP is ${otp}`,
        });
    }
}