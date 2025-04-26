import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
// import * as helmet from 'helmet';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // Use cookie parser middleware
  app.use(cookieParser());
  
  // Use helmet for security headers
  app.use(helmet());
  
  // Configure CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 9000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();