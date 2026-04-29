import { Controller, Get, Req, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('me')
    async getMe(@Req() req: any) {
        const user = await this.userService.findByIdPublic(req.user._id);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            username: user.username,
            profilePicture: user.profilePicture || '',
            googleId: user.googleId || '',
            provider: user.provider,
            dateOfBirth: user.dateOfBirth || null,
            isEmailVerified: user.isEmailVerified,
            isProfileCompleted: user.isProfileCompleted,
            role: user.role,
        };
    }
}
