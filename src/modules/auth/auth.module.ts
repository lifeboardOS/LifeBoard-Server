import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from 'src/modules/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoggerModule } from 'src/common/logger/logger.module';

import { Otp, OtpSchema } from './schemas/otp.schema';
import { OtpService } from './services/otp.service';
import { EmailService } from './services/email.service';
import { LoginAttempt, LoginAttemptSchema } from './schemas/login-attempt.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { GoogleStrategy } from './strategies/google.strategy';


@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    UserModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
      { name: LoginAttempt.name, schema: LoginAttemptSchema }
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OtpService,
    EmailService,
    JwtStrategy,
    RolesGuard,
    GoogleStrategy
  ]
})
export class AuthModule {}
