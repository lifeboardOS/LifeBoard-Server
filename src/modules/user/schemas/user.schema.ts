import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  fullName: string;

  @Prop({ required: true, unique: true, index: true })
  email: string;

  @Prop({ required: true, unique: true, index: true })
  username: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ enum: ['user', 'admin'], default: 'user' })
  role: string;

  @Prop({ required: false })
  dateOfBirth?: Date;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ select: false })
  refreshToken: string;

  @Prop({ default: false })
  isProfileCompleted: boolean;

  @Prop({ default: 'local' })
  provider: string;

  @Prop({ required: false })
  profilePicture?: string;

  @Prop({ required: false, sparse: true, index: true })
  googleId?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
