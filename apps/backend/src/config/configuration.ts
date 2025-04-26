export default () => ({
    port: parseInt(process.env.PORT, 10) || 9000,
    jwt: {
      secret: process.env.JWT_SECRET,
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    },
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
  });