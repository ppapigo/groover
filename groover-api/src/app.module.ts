import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { CartsModule } from './carts/carts.module';
import { GrooverCodeModule } from './groover-code/groover-code.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    RecommendationsModule,
    CartsModule,
    GrooverCodeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
