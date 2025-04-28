import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NFT } from './entities/nft.entity';
import { Collection } from '../collections/entities/collection.entity';
import { NftsService } from './nfts.service';
import { NftsController } from './nfts.controller';
import { UsersModule } from '../users/users.module';
import { CollectionsModule } from '../collections/collections.module';
import { Category } from 'src/categories/entities/category.entity';
import { CategoriesModule } from '../categories/categories.module';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NFT, Collection, Category]),
    UsersModule, 
    FirebaseModule,
    CollectionsModule,
    CategoriesModule
  ],
  controllers: [NftsController],
  providers: [NftsService],
})
export class NftsModule {}
