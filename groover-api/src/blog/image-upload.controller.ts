import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImageUploadService } from './services/image-upload.service';

@Controller('blog/images')
export class ImageUploadController {
  constructor(private readonly imageUploadService: ImageUploadService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: any, @Request() req: any) {
    const result = await this.imageUploadService.uploadImage(file, req.user.id);
    return {
      success: true,
      data: { url: result.url, thumbnailUrl: result.thumbnailUrl },
    };
  }

  @Post('upload-multiple')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadMultipleImages(@UploadedFiles() files: any[], @Request() req: any) {
    const results = await Promise.all(
      files.map((file) => this.imageUploadService.uploadImage(file, req.user.id)),
    );
    return {
      success: true,
      data: results.map((r) => ({ url: r.url, thumbnailUrl: r.thumbnailUrl })),
    };
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteImage(@Body('imageUrl') imageUrl: string) {
    await this.imageUploadService.deleteImage(imageUrl);
    return { success: true };
  }
}