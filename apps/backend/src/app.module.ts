import { Module, NestModule, MiddlewareConsumer} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

// Use this @Module for local Postgresql connection
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      autoLoadEntities: true,
      synchronize: true, 
    }),
    AuthModule,
    UsersModule,
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})




//Use below @Module for Remote Postgresql connection


// @Module({
//   imports: [
//     ConfigModule.forRoot({
//       isGlobal: true,
//       envFilePath: '.env'
//     }),
//     TypeOrmModule.forRoot({
//       type: 'postgres',
//       url: process.env.DATABASE_URL,
//       autoLoadEntities: true,
//       synchronize: true, 
//     })
//   ],
//   controllers: [AppController],
//   providers: [AppService],
// })



export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware)
      .forRoutes('*');
  }
}
