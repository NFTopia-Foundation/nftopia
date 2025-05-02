"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const csurf_1 = __importDefault(require("csurf"));
const interceptors_1 = require("./interceptors");
const config_1 = require("@nestjs/config");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.use((0, cookie_parser_1.default)());
    app.use((0, csurf_1.default)({
        cookie: {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
        },
    }));
    app.useGlobalInterceptors(new interceptors_1.ResponseInterceptor(), new interceptors_1.LoggingInterceptor(), new interceptors_1.ErrorInterceptor(), new interceptors_1.TimeoutInterceptor(configService));
    app.enableCors({
        origin: ['http://localhost:5000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    });
    await app.listen(process.env.PORT ?? 9000);
}
bootstrap();
//# sourceMappingURL=main.js.map