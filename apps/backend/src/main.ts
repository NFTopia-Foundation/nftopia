import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import {
  ResponseInterceptor,
  LoggingInterceptor,
  ErrorInterceptor,
  TimeoutInterceptor,
} from './interceptors';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

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
  );

  app.enableCors({
    origin: ['http://localhost:5000'], // or use your deployed frontend URL
    credentials: true, // Needed if you're using cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  });

  await app.listen(process.env.PORT ?? 9000);
}

bootstrap();
