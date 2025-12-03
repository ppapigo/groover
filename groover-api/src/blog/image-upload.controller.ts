// src/blog/image-upload.controller.ts
import {
  Controller,
  Post,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  Req,
  Body,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ImageUploadService, UploadedImage, MulterFile } from './services/image-upload.service';

@Controller('blog/images')
@UseGuards(JwtAuthGuard)
export class ImageUploadController {
  constructor(private readonly imageUploadService: ImageUploadService) {}

  /**
   * 단일 이미지 업로드
   * POST /v1/blog/images/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('image', {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  }))
  async uploadSingle(
    @UploadedFile() file: MulterFile,
    @Req() req: any,
  ): Promise<{ success: boolean; data: UploadedImage }> {
    if (!file) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    const result = await this.imageUploadService.uploadImage(file, req.user.id);

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 다중 이미지 업로드
   * POST /v1/blog/images/upload-multiple
   */
  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('images', 10, {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadMultiple(
    @UploadedFiles() files: MulterFile[],
    @Req() req: any,
  ): Promise<{ success: boolean; data: UploadedImage[] }> {
    if (!files || files.length === 0) {
      throw new BadRequestException('이미지 파일이 필요합니다.');
    }

    const results = await Promise.all(
      files.map(file => this.imageUploadService.uploadImage(file, req.user.id))
    );

    return {
      success: true,
      data: results,
    };
  }

  /**
   * 이미지 삭제
   * DELETE /v1/blog/images
   */
  @Delete()
  async deleteImage(
    @Body('url') imageUrl: string,
    @Req() req: any,
  ): Promise<{ success: boolean; message: string }> {
    if (!imageUrl) {
      throw new BadRequestException('이미지 URL이 필요합니다.');
    }

    // TODO: 이미지 소유자 확인 (보안)
    await this.imageUploadService.deleteImage(imageUrl);

    return {
      success: true,
      message: '이미지가 삭제되었습니다.',
    };
  }
}
