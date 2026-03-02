import { MongooseModuleOptions } from '@nestjs/mongoose';

export const databaseConfig = (
    mongoUri: string
): MongooseModuleOptions => ({
    uri: mongoUri,
});