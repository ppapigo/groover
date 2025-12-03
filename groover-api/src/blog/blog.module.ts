// src/blog/blog.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BlogController } from './blog.controller';
import { ProductClickController } from './product-click.controller';
import { ImageUploadController } from './image-upload.controller';
import { BlogService } from './blog.service';
import { ProductLinkParserService } from './services/product-link-parser.service';
import { AffiliateService } from './services/affiliate.service';
import { DisclaimerService } from './services/disclaimer.service';
import { ImageUploadService } from './services/image-upload.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [BlogController, ProductClickController, ImageUploadController],
  providers: [
    BlogService,
    ProductLinkParserService,
    AffiliateService,
    DisclaimerService,
    ImageUploadService,
  ],
  exports: [BlogService],
})
export class BlogModule {}
