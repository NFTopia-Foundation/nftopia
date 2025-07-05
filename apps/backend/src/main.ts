import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import {
  ResponseInterceptor,
  LoggingInterceptor,
  ErrorInterceptor,
  TimeoutInterceptor,
  TransformInterceptor,
} from './interceptors';
import { ConfigService } from '@nestjs/config';
import { RedisIoAdapter } from './redis/redis.adapter';


async function bootstrap() {  
  
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const redisAdapter = new RedisIoAdapter(app);


  app.use(cookieParser());

  app.use(
    csurf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      },
    }),
  );

  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new LoggingInterceptor(),
    new ErrorInterceptor(),
    new TimeoutInterceptor(),
    new TransformInterceptor(),
  );

  try {
    await redisAdapter.connectToRedis();
    app.useWebSocketAdapter(redisAdapter);
    console.log('Redis adapter status:', redisAdapter.getStatus());
  } catch (error) {
    console.error('Redis adapter failed:', error.message);
    console.log('Falling back to in-memory adapter');
  }

  app.enableCors({
    origin: ['http://localhost:5000'], // or use your deployed frontend URL
    credentials: true, // Needed if you're using cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  await app.listen(process.env.PORT ?? 9000);
}

bootstrap();
