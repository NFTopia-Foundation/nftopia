import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { CollectionsModule } from './collections/collections.module';
import { NftsModule } from './nfts/nfts.module';
import { User } from './users/entities/user.entity';
import { Collection } from './collections/entities/collection.entity';
import { NFT } from './nfts/entities/nft.entity';
import { AuthModule } from './auth/auth.module';
import { BidsModule } from './bids/bids.module';
import { AuctionsModule } from './auctions/auctions.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';



// Use this @Module for local PostgreSQL 
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env'
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'nftopia',
      password: 'nftopia123', 
      database: 'nftopiadb',
      entities: [User, Collection, NFT],
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
      migrationsRun: true,
      autoLoadEntities: true,
      synchronize: true, // Keep false for production
      logging: true, 
    }),
    UsersModule,
    CollectionsModule,
    NftsModule,
    AuthModule,
    BidsModule,
    AuctionsModule,
    TransactionsModule,
    CategoriesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})


// Use this @Module for Production PostgreSQL

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
//       synchronize: false, 
//     })
//   ],
//   controllers: [AppController],
//   providers: [AppService],
// })




export class AppModule {}
