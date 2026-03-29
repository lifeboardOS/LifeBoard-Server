import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Profile } from "passport-google-oauth20";
import { Strategy, VerifyCallback } from "passport-google-oauth20";

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {

    constructor(private configService: ConfigService) {
        const clientID = configService.get<string>('GOOGLE_CLIENT_ID')!;
        const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET')!;
        const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL')!;

        super({
            clientID,
            clientSecret,
            callbackURL,
            scope: ['email', 'profile'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
    ): Promise<any> {

        const name = profile.name;
        const emails = profile.emails as { value: string }[];


        const user = {
            email: emails[0].value || '',
            fullname: `${name?.givenName || ''} ${name?.familyName || ''}`,
        };

        return user;
    }
}