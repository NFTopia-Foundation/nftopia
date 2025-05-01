"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const users_module_1 = require("./users/users.module");
const collections_module_1 = require("./collections/collections.module");
const nfts_module_1 = require("./nfts/nfts.module");
const user_entity_1 = require("./users/entities/user.entity");
const collection_entity_1 = require("./collections/entities/collection.entity");
const nft_entity_1 = require("./nfts/entities/nft.entity");
const auth_module_1 = require("./auth/auth.module");
const bids_module_1 = require("./bids/bids.module");
const auctions_module_1 = require("./auctions/auctions.module");
const transactions_module_1 = require("./transactions/transactions.module");
const categories_module_1 = require("./categories/categories.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            typeorm_1.TypeOrmModule.forRoot({
                type: 'postgres',
                host: process.env.POSTGRES_HOST || 'localhost',
                port: Number(process.env.POSTGRES_PORT) || 5432,
                username: process.env.POSTGRES_USER || 'nftopia',
                password: process.env.POSTGRES_PASSWORD || 'nftopia123',
                database: process.env.POSTGRES_DB || 'nftopiadb',
                entities: [user_entity_1.User, collection_entity_1.Collection, nft_entity_1.NFT],
                migrations: [__dirname + '/migrations/*{.ts,.js}'],
                migrationsRun: true,
                autoLoadEntities: true,
                synchronize: true,
                logging: true,
            }),
            users_module_1.UsersModule,
            collections_module_1.CollectionsModule,
            nfts_module_1.NftsModule,
            auth_module_1.AuthModule,
            bids_module_1.BidsModule,
            auctions_module_1.AuctionsModule,
            transactions_module_1.TransactionsModule,
            categories_module_1.CategoriesModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map