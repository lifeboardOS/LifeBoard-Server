import { Controller, Get, Req, NotFoundException } from '@nestjs/common';

@Controller('user')
export class UserController {

    @Get('me')
    async getMe(@Req() req: any) {
        const user = req.user;

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            id: user._id,
            fullName: user.fullName,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email,
            username: user.username,
            profilePicture: user.profilePicture || '',
            googleId: user.googleId || '',
            provider: user.provider,
            dateOfBirth: user.dateOfBirth || null,
            isEmailVerified: user.isEmailVerified,
            isProfileCompleted: user.isProfileCompleted,
            role: user.role,
            locale: user.locale || '',
        };
    }
}
