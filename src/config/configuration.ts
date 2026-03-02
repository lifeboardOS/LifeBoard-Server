export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  database: {
    mongoUri: process.env.MONGO_URI,
  }
});