export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  JWT_SECRET: process.env.JWT_SECRET,
  database: {
    mongoUri: process.env.MONGO_URI,
  }
});