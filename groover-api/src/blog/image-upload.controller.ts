// src/blog/services/image-upload.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as crypto from 'crypto';

export interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface UploadedImage {
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
  size: number;
  mimeType: string;
}

export interface ImageUploadOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  generateThumbnail?: boolean;
}

@Injectable()
export class ImageUploadService {
  private readonly logger = new Logger(ImageUploadService.name);

  private readonly defaultOptions: ImageUploadOptions = {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    generateThumbnail: true,
  };

  constructor(private readonly configService: ConfigService) {
    // Cloudinary 설정
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });

    this.logger.log('Cloudinary 업로드 서비스 초기화 완료');
  }

  async uploadImage(
    file: MulterFile,
    userId: string,
    options?: ImageUploadOptions,
  ): Promise<UploadedImage> {
    const opts = { ...this.defaultOptions, ...options };
    this.validateFile(file, opts);

    const filename = this.generateFilename(file.originalname, userId);

    return this.uploadToCloudinary(file, filename, opts);
  }

  private async uploadToCloudinary(
    file: MulterFile,
    filename: string,
    options: ImageUploadOptions,
  ): Promise<UploadedImage> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'groover/images',
          public_id: filename.replace(/\.[^/.]+$/, ''), // 확장자 제거
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary 업로드 실패:', error);
            reject(new BadRequestException('이미지 업로드에 실패했습니다.'));
            return;
          }

          if (!result) {
            reject(new BadRequestException('이미지 업로드 결과가 없습니다.'));
            return;
          }

          // 썸네일 URL 생성 (Cloudinary 변환 사용)
          const thumbnailUrl = cloudinary.url(result.public_id, {
            width: 400,
            height: 300,
            crop: 'fill',
            quality: 'auto:good',
            fetch_format: 'auto',
          });

          resolve({
            url: result.secure_url,
            thumbnailUrl: thumbnailUrl,
            width: result.width,
            height: result.height,
            size: result.bytes,
            mimeType: `image/${result.format}`,
          });
        },
      );

      // Buffer를 스트림으로 전송
      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Cloudinary URL에서 public_id 추출
      const matches = imageUrl.match(/\/groover\/images\/([^/.]+)/);
      if (matches && matches[1]) {
        const publicId = `groover/images/${matches[1]}`;
        await cloudinary.uploader.destroy(publicId);
        this.logger.log(`이미지 삭제 완료: ${publicId}`);
      }
    } catch (error) {
      this.logger.error(`이미지 삭제 실패: ${imageUrl}`, error);
    }
  }

  private validateFile(file: MulterFile, options: ImageUploadOptions): void {
    if (!file) {
      throw new BadRequestException('파일이 없습니다.');
    }

    if (file.size > options.maxSizeBytes!) {
      const maxSizeMB = options.maxSizeBytes! / (1024 * 1024);
      throw new BadRequestException(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
    }

    if (!options.allowedMimeTypes!.includes(file.mimetype)) {
      throw new BadRequestException(
        `허용되지 않는 파일 형식입니다. (허용: ${options.allowedMimeTypes!.join(', ')})`,
      );
    }
  }

  private generateFilename(originalName: string, userId: string): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const ext = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const userPrefix = userId.slice(0, 8);
    
    return `${userPrefix}_${timestamp}_${random}.${ext}`;
  }
}
